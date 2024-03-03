import fs from "fs";
import { openai } from "./utils/openai.js";

// Setup

let luxuryAssistant, luxuryFile, messages;

const knowledgeFormat = process.env.KNOWLEDGE_FORMAT || "csv";
let knowledgeFormatName = knowledgeFormat.toUpperCase();
if (knowledgeFormat === "md") {
  knowledgeFormatName = "Markdown";
}

// Helpers

function log(message) {
  console.log(`💬 ${message}`);
}

function ai(message) {
  console.log(`🤖 ${message}`);
}

function debug(message) {
  if (process.env.DEBUG) {
    console.log(`🪲  ${message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(assistant, thread) {
  let run;
  let running = true;
  debug("Running...");
  run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });
  while (running) {
    run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    await sleep(1000);
    // debug("🐞 " + JSON.stringify(run));
    if (!/^(queued|in_progress|cancelling)$/.test(run.status)) {
      running = false;
    }
  }
  let runSteps = await openai.beta.threads.runs.steps.list(
    luxuryThread.id,
    run.id
  );
  runSteps.data.forEach((step) => {
    debug("Step: " + JSON.stringify(step));
  });
}

// Assistant

const assistantsPage = await openai.beta.assistants.list({ limit: "100" });

luxuryAssistant = assistantsPage.data.find((a) => a.name === "Luxury Apparel");

if (luxuryAssistant !== undefined) {
  debug(`Deleting assistant: ${luxuryAssistant.id}`);
  await openai.beta.assistants.del(luxuryAssistant.id);
}

// File

const fileObjectsPage = await openai.files.list();

luxuryFile = fileObjectsPage.data.find((f) =>
  f.filename.startsWith("Luxury_Products_Apparel_Data")
);

if (luxuryFile !== undefined) {
  debug(`Deleting file: ${luxuryFile.id}`);
  await openai.files.del(luxuryFile.id);
}

// Assistant w/File, Thread, Message

debug("Creating file...");
luxuryFile = await openai.files.create({
  file: fs.createReadStream(
    `data/Luxury_Products_Apparel_Data.${knowledgeFormat}`
  ),
  purpose: "assistants",
});

debug("Creating assistant...");
luxuryAssistant = await openai.beta.assistants.create({
  name: "Luxury Apparel",
  description: "Search or analyze the luxury apparel data.",
  instructions: `You can search and analyze the luxury apparel ${knowledgeFormatName} data.`,
  tools: [{ type: "code_interpreter" }],
  model: "gpt-4-0125-preview",
  file_ids: [luxuryFile.id],
});

debug("Creating thread...");
const luxuryThread = await openai.beta.threads.create();

// Count Products

const howManyProducts = "How many products do you have?";
log(howManyProducts);

await openai.beta.threads.messages.create(luxuryThread.id, {
  role: "user",
  content: howManyProducts,
});

await run(luxuryAssistant, luxuryThread);
messages = await openai.beta.threads.messages.list(luxuryThread.id);
ai(messages.data[0].content[0].text.value);

// Category Analysis

const diagramQuery = "Show me a bar chart with totals of each category.";
log(diagramQuery);
await openai.beta.threads.messages.create(luxuryThread.id, {
  role: "user",
  content: diagramQuery,
});

await run(luxuryAssistant, luxuryThread);
messages = await openai.beta.threads.messages.list(luxuryThread.id);
let fileID;
for (const content of messages.data[0].content) {
  if (content.type === "text") {
    ai(content.text.value);
  }
  if (content.type === "image_file") {
    fileID = content.image_file.file_id;
  }
}
if (fileID) {
  debug(`Get file content: ${fileID}`);
  const file = await openai.files.retrieve(fileID);
  debug(`File: ${JSON.stringify(file)}`);
  debug(`Downloading file: ${fileID}`);
  const response = await openai.files.content(fileID);
  const randSuffix = Math.random().toString(36).substring(2, 7);
  const writeStream = fs.createWriteStream(
    `./files/diagram-${knowledgeFormat}-${randSuffix}.png`
  );
  response.body.pipe(writeStream);
}

// Faceted Semantic Search

const productSearch =
  "Find men's accessories for a sophisticated comic book enthusiast.";
log(productSearch);

await openai.beta.threads.messages.create(luxuryThread.id, {
  role: "user",
  content: productSearch,
});

await run(luxuryAssistant, luxuryThread);
messages = await openai.beta.threads.messages.list(luxuryThread.id);
ai(messages.data[0].content[0].text.value);
