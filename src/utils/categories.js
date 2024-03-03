import { opensearch } from "../utils/opensearch.js";

async function uniqueKeywords(fieldName) {
  const response = await opensearch.search({
    index: "luxuryproducts",
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            {
              exists: {
                field: fieldName,
              },
            },
            {
              bool: {
                must_not: {
                  term: {
                    [fieldName]: "NaN",
                  },
                },
              },
            },
          ],
        },
      },
      aggs: {
        unique_keywords: {
          terms: {
            field: fieldName,
            size: 100,
          },
        },
      },
    },
  });
  const results = response.body.aggregations.unique_keywords.buckets.map(
    (bucket) => bucket.key
  );
  return [...new Set(results)].sort();
}

const CATEGORIES = await uniqueKeywords("category");
const SUBCATEGORIES = await uniqueKeywords("subcategory");

export { CATEGORIES, SUBCATEGORIES };
