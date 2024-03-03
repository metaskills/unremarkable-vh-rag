import { openai } from "../utils/openai.js";
import { CATEGORIES, SUBCATEGORIES } from "../utils/categories.js";

// Helpers

function debug(message) {
  if (process.env.DEBUG) {
    console.log(message);
  }
}

// Assistant

let searchAssistant;
searchAssistant = (
  await openai.beta.assistants.list({ limit: "100" })
).data.find((a) => a.name === "Luxury Apparel (Search)");

if (searchAssistant !== undefined) {
  debug(`🗑️  Deleting (Search) assistant: ${searchAssistant.id}`);
  await openai.beta.assistants.del(searchAssistant.id);
}

debug("ℹ️  Creating (Search) assistant...");
searchAssistant = await openai.beta.assistants.create({
  name: "Luxury Apparel (Search)",
  description: "Semantic and faceted search luxury apparel data.",
  instructions: `
You are a luxury products assistant. Your job is to help translate chat messages into an OpenSearch query that can be used to search an index named "luxuryproducts". Here is a list of the index's mappings with each field's type and a short description:

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

1. The "index" name will always be "luxuryproducts". Very important!
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
  search_type: "aggregate",
  search_query: {
    index: "luxuryproducts",
    body: {
      query: { 
        match_all: {}
      },
      aggs: { 
        total_products: { 
          value_count: { 
            field: "_id"
          }
        }
      },
    }
  }
}
"""
`.trim(),
  tools: [
    {
      type: "function",
      function: {
        name: "return_opensearch_query",
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
                "The type of search query. Example, an 'aggregate' query is one that returns a number value. For example, a sum or count. An 'items' query is a list of luxury product items, _id field only, that the query matches.",
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
  ],
  model: "gpt-4-0125-preview",
});

// const foo = ;

export { searchAssistant };
