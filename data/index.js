import fs from "fs";
import url from "url";
import path from "path";
import PQueue from "p-queue";
import cliProgress from "cli-progress";
import { createEmbedding } from "../src/utils/embedding.js";
import { opensearch } from "../src/utils/opensearch.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonFile = path.join(__dirname, "Luxury_Products_Apparel_Data.json");
const products = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));

const bar = new cliProgress.SingleBar(
  {
    format:
      " {bar} {percentage}% | ETA: {eta}s | {value}/{total} | Duration: {duration_formatted}",
  },
  cliProgress.Presets.shades_classic
);
const queue = new PQueue({ concurrency: 30, autoStart: true });

const indexProduct = async (product) => {
  const embedding = await createEmbedding(
    `${product.ProductName} ${product.ProductDescription} ${product.Category}`
  );
  await opensearch.index({
    index: "luxuryproducts",
    id: product.ID,
    body: {
      name: product.ProductName,
      description: product.ProductDescription,
      category: product.Category,
      subcategory: product.SubCategory,
      embedding: embedding,
    },
  });
  bar.increment();
};

console.log("== Indexing Products ==");

queue.add(() => {
  bar.start(products.length, 0);
});

products.forEach((product) => {
  queue.add(() => indexProduct(product));
});

await queue.onIdle().then(() => {
  bar.stop();
  console.log("   ✅ Indexed Products");
});

await opensearch.indices.refresh({ index: "luxuryproducts" });
console.log("   ✅ Refreshed Index");
