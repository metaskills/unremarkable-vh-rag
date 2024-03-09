import fs from "fs";
import { openai } from "../src/utils/openai.js";
import { deleteAssistant } from "../src/utils/assistants.js";

const FILES = [];
const FILENAMES = [
  "UAAv1 01 Documentation Assistants - API.pdf",
  "UAAv1 02 Documentation Assistants - How Assistants Work.pdf",
  "UAAv1 03 Documentation Assistants - Tools.pdf",
  "UAAv1 Assistants API Reference - OpenAI API.pdf",
  "UAAv1 openapi.yaml",
];

for (const fileName of FILENAMES) {
  const existingFiles = (
    await openai.files.list({ purpose: "assistants" })
  ).data.filter((file) => file.filename === fileName);
  for (const existingFile of existingFiles) {
    await openai.files.del(existingFile.id);
    console.log(`❌ Deleted file: ${JSON.stringify(existingFile)}`);
  }
  const newFile = await openai.files.create({
    file: fs.createReadStream(`./assistant/${fileName}`),
    purpose: "assistants",
  });
  FILES.push(newFile);
  console.log(`✅ Created file: ${JSON.stringify(newFile)}`);
}

const NAME = "UnremakableAsstAsst";
await deleteAssistant(NAME);

await openai.beta.assistants.create({
  name: NAME,
  description:
    "Help the unRemarkable RAG project by being an expert on both it and the OpenAPI Assistants API.",
  instructions: fs.readFileSync("./assistant/instructions.txt", "utf-8"),
  model: "gpt-4-0125-preview",
  tools: [{ type: "retrieval" }, { type: "code_interpreter" }],
  file_ids: FILES.map((file) => file.id),
});

console.log("✅ Created `UnremakableAsstAsst` assistant.");
