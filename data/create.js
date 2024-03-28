import { opensearch } from "../src/utils/opensearch.js";

console.log("== Creating OpenSearch Index ==");

await opensearch.indices.delete({
  index: "luxuryproducts",
  ignore_unavailable: true,
});

await opensearch.indices.create({
  index: "luxuryproducts",
  body: {
    settings: {
      "index.knn": true,
    },
    mappings: {
      properties: {
        id: { type: "integer" },
        category: { type: "keyword" },
        subcategory: { type: "keyword" },
        name: { type: "text" },
        description: { type: "text" },
        embedding: {
          type: "knn_vector",
          dimension: 1536,
          method: {
            name: "hnsw",
            space_type: "l2",
            engine: "nmslib",
            parameters: {
              ef_construction: 512,
              m: 64,
            },
          },
        },
      },
    },
  },
});

console.log("   ✅ Created 'luxuryproducts' Index");
