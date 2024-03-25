import { openai } from "../utils/openai.js";
import { debug } from "../utils/helpers.js";
import { askAssistant, deleteAssistant } from "../utils/assistants.js";
import { opensearch } from "../utils/opensearch.js";
import { createEmbedding } from "../utils/embedding.js";
import { Categories, SubCategories } from "../utils/categories.js";

const INSTRUCTIONS = `
# Luxury Apparel OpenSearch Query Generator

Your job is to translate a user's messages into an OpenSearch query that can be used to search an index named "luxuryproducts". Here is a JSON representation used to create the index in OpenSearch. It shows a list of the index's mappings with each field's type. It also shows a kNN vector search field named "embedding".

## OpenSearch Index

\`\`\`json
{
  "index": "luxuryproducts",
  "body": {
    "settings": {
      "index.knn":true
    },
    "mappings": {
      "properties": { 
        "id": { "type": "integer" },
        "category": { "type": "keyword" },
        "subcategory": { "type": "keyword" },
        "name": { "type": "text" },
        "description": { "type":"text" },
        "embedding": { 
          "type": "knn_vector", 
          "dimension": 1536, 
          "method": { 
            "name": "hnsw", 
            "space_type": "l2",
            "engine": "faiss"
          }
        }
      }
    }
  }
}
\`\`\`

## Luxury Apparel Category List

Some searches may want to use the "category" as a condition. Here is a list for your reference.

${Categories.map((c) => `* ${c}`).join(`\n`)}

## Luxury Apparel Subcategory List

Some searches may want to use the "subcategory" as a condition. Here is a list for your reference.

${SubCategories.map((sc) => `* ${sc}`).join(`\n`)}

## kNN Vector Queries

Some quries will require using OpenSearch's kNN vector search capability. When doing so, the "embedding" field returned must be a "vector" with a string value that will be convereted into a vector embedding (array of floats) prior to being sent to the OpenSearch search interface. For example, if a user was searching for products for a "sophisticated comic book enthusiast", the knn query snippet would look like the following: 

\`\`\`json
"query": {
  "knn": {
    "embedding": {
      "vector": "sophisticated comic book enthusiast",
      "k": 20
    }
  }
}
\`\`\`

## Response Format

Here is a JSON schema validation for the response format that you must follow.

\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "search_type": {
      "type": "string",
      "enum": ["aggregate", "items"],
      "description": "The 'aggregate' query type returns data such as sums or counts. The 'items' query type is a list of item's/product's '_id' field from the OpenSearch results that matches the query."
    },
    "search_query": {
      "type": "object",
      "description": "This is the OpenSearch query that will be sent directly to the OpenSearch search API. The 'index' name will always be 'luxuryproducts'."
    }
  },
  "required": ["search_type", "search_query"],
  "additionalProperties": false
}
\`\`\`

## Rules

1. The "search_query" must work with OpenSearch 2.9 and above.
2. The "aggregate" query type must have "size" set to 0.
3. The "items" query type must have "size" set to 3 unless otherwise specified. Max 10.
4. The "items" query must only return the "_id" field.
5. Return JSON only, no fenced code blocks.

## Examples

Use the numbered examples below to help inform your decision making.

Example: #1
Question: How many products do you have?
Reasoning: Use of size set to 0. No source needed. Aggs should be descriptive.
Answer:
\`\`\`json
{
  "search_type": "aggregate",
  "search_query": {
    "index": "luxuryproducts",
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
\`\`\`

Example: #2
Question: Find men's accessories for a sophisticated comic book enthusiast.
Reasoning: Default size of 3 and knn of 3. Prefilter based on category. Only return _id for items query types.
Answer:
\`\`\`json
{
  "search_type": "items",
  "search_query": {
    "index": "luxuryproducts",
    "body": {
      "size": 3,
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "category": "Accessories"
              }
            }
          ],
          "must": [
            {
              "knn": {
                "embedding": {
                  "vector": "sophisticated male comic book enthusiast",
                  "k": 3
                }
              }
            }
          ]
        }
      },
      "_source": ["_id"]
    }
  }
}
\`\`\`
`.trim();

class ProductsOpenSearchTool {
  constructor() {
    this.model = "gpt-4-0125-preview";
    this.agentName = "Luxury Apparel (OpenSearch)";
    this.toolName = "products-opensearch";
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
    debug(`❓ ${JSON.stringify(query, null, 2)}`);
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
      });
      rValue = responseFull.body.hits.hits;
    }
    return typeof rValue === "string" ? rValue : JSON.stringify(rValue);
  }

  async replaceKnnEmbeddingVector(obj) {
    if (obj !== null && typeof obj === "object") {
      for (const key in obj) {
        if (key === "knn" && obj[key].embedding && obj[key].embedding.vector) {
          const vector = await createEmbedding(obj[key].embedding.vector);
          obj[key].embedding.vector = vector;
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
