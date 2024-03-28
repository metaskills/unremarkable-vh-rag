import { opensearch } from "../src/utils/opensearch.js";
import { createEmbedding } from "../src/utils/embedding.js";

const embedding = await createEmbedding(
  "men sophisticated comic book enthusiast"
);

const query = {
  index: "luxuryproducts",
  _source: ["_id", "name"],
  body: {
    size: 3,
    query: {
      bool: {
        filter: [{ term: { category: "Accessories" } }],
        must: [
          {
            knn: {
              embedding: {
                vector: embedding,
                k: 3,
              },
            },
          },
        ],
      },
    },
  },
};

try {
  const response = await opensearch.search(query);
  console.log(JSON.stringify(response.body, null, 2));
} catch (error) {
  console.error(error.meta.body.error);
}
