import fs from "fs";
import ejs from "ejs";
import { openai } from "../utils/openai.js";
import { debug, projectPath } from "../utils/helpers.js";
import { askAssistant, deleteAssistant } from "../utils/assistants.js";
import { opensearch } from "../utils/opensearch.js";
import { createEmbedding } from "../utils/embedding.js";
import { Categories } from "../utils/categories.js";

const InstructionsTemplate = fs.readFileSync(
  projectPath("src/inst/products.md"),
  "utf-8"
);

const INSTRUCTIONS = ejs.render(InstructionsTemplate, {
  categories: Categories,
});

class ProductsOpenSearchTool {
  constructor() {
    this.model = "gpt-4-0125-preview";
    this.agentName = "Luxury Apparel (OpenSearch)";
    this.toolName = "products-opensearch";
    this.passToolOutputs = true;
    this.messages = [];
  }

  async init() {
    await deleteAssistant(this.agentName);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
  }

  async ask(aMessage) {
    const json = await askAssistant(this, aMessage, { log: false });
    const args = JSON.parse(json.trim());
    return await this.opensearchQuery(args);
  }

  // Private

  async opensearchQuery(args) {
    let rValue;
    let query = args.search_query;
    query = await this.replaceKnnEmbeddingVector(query);
    const response = await opensearch.search(query);
    if (args.search_type === "aggregate") {
      rValue = response.body.aggregations;
    }
    if (args.search_type === "items") {
      const responseIds = response.body.hits.hits.map((p) => p._id);
      const responseFull = await opensearch.search({
        index: "luxuryproducts",
        body: {
          _source: {
            excludes: ["embedding"],
          },
          query: {
            ids: {
              values: responseIds,
            },
          },
        },
        pretty: false,
      });
      rValue = responseFull.body.hits.hits;
    }
    return typeof rValue === "string" ? rValue : JSON.stringify(rValue);
  }

  async replaceKnnEmbeddingVector(obj) {
    if (obj !== null && typeof obj === "object") {
      for (const key in obj) {
        if (
          // Approximate k-NN
          key === "knn" &&
          obj[key].embedding &&
          obj[key].embedding.vector
        ) {
          const vector = await createEmbedding(obj[key].embedding.vector);
          obj[key].embedding.vector = vector;
        } else if (
          // Script Score k-NN
          key === "script" &&
          obj[key].source === "knn_score" &&
          obj[key].params.query_value
        ) {
          console.log("\n\n", obj[key]);
          const vector = await createEmbedding(obj[key].params.query_value);
          obj[key].params.query_value = vector;
        } else {
          await this.replaceKnnEmbeddingVector(obj[key]);
        }
      }
    }
    return obj;
  }

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      model: this.model,
      name: this.agentName,
      description:
        "Creates a fully formed OpenSearch query based on the user's messages.",
      instructions: INSTRUCTIONS,
    });
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

export { ProductsOpenSearchTool };
