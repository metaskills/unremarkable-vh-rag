import { openai } from "./utils/openai.js";
import { ai, debug } from "./utils/helpers.js";
import { deleteAssistant, runAssistant } from "./utils/assistants.js";
import { createMessage, readMessages } from "./utils/messages.js";
import { reCreateFile } from "./utils/files.js";

// Setup

const LuxuryMessages = [];
const LuxuryThread = await openai.beta.threads.create();

const knowledgeFormat = process.env.KNOWLEDGE_FORMAT || "csv";
let knowledgeFormatName = knowledgeFormat.toUpperCase();
if (knowledgeFormat === "md") {
  knowledgeFormatName = "Markdown";
}

// Assistant

await deleteAssistant("Luxury Apparel (GPT)");
const luxuryFile = await reCreateFile(
  "Luxury_Products_Apparel_Data",
  knowledgeFormat
);

debug("ℹ️  Creating (GPT) assistant...");
const LuxuryAssistant = await openai.beta.assistants.create({
  name: "Luxury Apparel (GPT)",
  description: "Search or analyze the luxury apparel data.",
  instructions: `You can search and analyze the luxury apparel ${knowledgeFormatName} data.`,
  tools: [{ type: "code_interpreter" }],
  model: "gpt-4-0125-preview",
  file_ids: [luxuryFile.id],
});

// Count Products

const countMsg = await createMessage(
  LuxuryMessages,
  LuxuryThread,
  "How many products do you have?"
);

await runAssistant(LuxuryAssistant, LuxuryThread);
await readMessages(LuxuryThread);

// Category Analysis

const diagramQuery = await createMessage(
  LuxuryMessages,
  LuxuryThread,
  "Show me a bar chart image with totals of each category."
);

await runAssistant(LuxuryAssistant, LuxuryThread);
await readMessages(LuxuryThread);

// Faceted Semantic Search

const productSearch = await createMessage(
  LuxuryMessages,
  LuxuryThread,
  "Find men's accessories for a sophisticated comic book enthusiast."
);

await runAssistant(LuxuryAssistant, LuxuryThread);
await readMessages(LuxuryThread);
