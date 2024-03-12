import { openai } from "../utils/openai.js";
import { debug } from "../utils/helpers.js";
import { opensearch } from "../utils/opensearch.js";
import { runAssistant, deleteAssistant } from "../utils/assistants.js";
import { createMessage } from "../utils/messages.js";
import { runActions } from "../utils/tools.js";
import { CATEGORIES, SUBCATEGORIES } from "../utils/categories.js";

const INDEX_NAME = "luxuryproducts";

const NAME = "Luxury Apparel (Search)";
const DESCRIPTION = "Search and analyze the luxury apparel data.";
const INSTRUCTIONS = `
You are a luxury products assistant that allows users to perform semantic and faceted search for luxury apparel data. You can also post process aggregate data or large files with your code interpreter tool. When performing the 'return_opensearch_query' tool, your job is to help translate chat messages into an OpenSearch query that can be used to search an index named "${INDEX_NAME}". Here is a list of the index's mappings with each field's type and a short description:

category:
  type: keyword
  description: The category name of the luxury product.

subcategory:
  type: keyword
  description: The subcategory name of the luxury product.

embedding:
  type: knn_vector
  description: The name and description for each luxury apparel product.

Here are some rules to follow:

1. The "index" name will always be "${INDEX_NAME}". Very important!
2. Think carefully what the user is asking for and categorize it into a query type of a) aggregated data like a sum/count or b) a list of item _id fields that match. 
5. Returned query must work with OpenSearch 2.9.
6. Returned query must use the "body" key for the query object.
7. For knn queries, the "embedding" field must be a "vector" with a string value. This is where the "search_phrase" must go. We will post process that phrase into a vector afterward.
8. For knn queries, the min_score must be 0.73 by default.
9. Use the examples below to help inform your decision making.

Example: 1
Question: How many products do you have?
Reasoning: Use of size set to 0. No items needed. Only aggs with data.
Answer:
"""
{
  "search_type": "aggregate",
  "search_query": {
    "index": "${INDEX_NAME}",
    "body": {
      "size": 0,
      "query": { 
        "match_all": {}
      },
      "aggs": { 
        "total_products": { 
          "value_count": { 
            "field": "_id"
          }
        }
      }
    }
  }
}
"""

Example: 2
Question: Show me a bar chart image with totals of each category.
Reasoning: Use of size set to 0. No items needed. Only aggs with data. Results will be used by the code_interpreter tool to create the image.
Answer:
"""
{
  "search_type": "aggregate",
  "search_query": {
    "index": "${INDEX_NAME}",
    "body": {
      "size": 0,
      "query": { 
        "match_all": {}
      },
      "aggs": { 
        "total_by_category": { 
          "terms": { 
            "field": "category"
          }
        }
      }
    }
  }
}
"""
`.trim();

const TOOLS = [
  {
    type: "function",
    function: {
      name: "products.opensearch_query",
      description:
        "A fully formed OpenSearch query based on the user's request.",
      parameters: {
        type: "object",
        properties: {
          search_query: {
            type: "string",
            description:
              "A JSON string representing the OpenSearch search query.",
          },
          search_type: {
            type: "string",
            enum: ["aggregate", "items"],
            description:
              "The type of search query. Example, an 'aggregate' query is one that returns a number value. For example, a sum or count. An 'items' query is a list of luxury product items, _id field only, that the query matches. Max items is 100.",
          },
          search_phrase: {
            type: "string",
            description:
              "Any context from the user's latest messages which could be used to form a knn semantic search.",
          },
        },
        required: ["search_query", "search_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "products.code_interpreter",
      description:
        "Run code interpreter on the OpenSearch results. This can be used to create images or perform other post processing on the JSON results using popular python data tools.",
      parameters: {
        type: "object",
        properties: {
          perform: {
            type: "boolean",
            description: "Perform code interpreter.",
          },
        },
        required: ["perform"],
      },
    },
  },
];

// Setup

class ProductsTool {
  constructor() {
    this.messages = [];
    this.model = "gpt-4-0125-preview";
  }

  async init() {
    await deleteAssistant(NAME);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
  }

  async ask(aMessage) {
    let msg;
    if (aMessage) {
      msg = await createMessage(this.messages, this.thread, aMessage, false);
    } else {
      msg = aMessage;
    }
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(run, msg);
    return { message: msg, output: output };
  }

  async opensearchQuery(args) {
    let rValue;
    const query = JSON.parse(args.search_query);
    const response = await opensearch.search(query);
    if (args.search_type === "aggregate") {
      rValue = response.body.aggregations;
    }
    if (args.search_type === "items") {
      const responseIds = response.body.hits.hits.map((p) => p._id);
      const responseFull = await opensearch.search({
        index: INDEX_NAME,
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
      });
      rValue = responseFull.body.hits.hits;
    }
    return typeof rValue === "string" ? rValue : JSON.stringify(rValue);
  }

  async codeInterpreter(aMessage) {
    let msg;
    if (aMessage) {
      msg = await createMessage(this.messages, this.thread, aMessage, false);
    } else {
      msg = aMessage;
    }
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(run, msg);
    return { message: msg, output: output };
  }

  // Private

  async createAssistant() {
    debug(`ℹ️  Creating ${NAME} assistant...`);
    const assistant = await openai.beta.assistants.create({
      name: NAME,
      description: DESCRIPTION,
      instructions: INSTRUCTIONS,
      tools: TOOLS,
      model: this.model,
    });
    return assistant;
  }
}

const products = new ProductsTool();
await products.init();

export { products };
