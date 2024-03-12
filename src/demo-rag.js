import { openai } from "./utils/openai.js";
import { ai, debug } from "./utils/helpers.js";
import { deleteAssistant, runAssistant } from "./utils/assistants.js";
import { createMessage, readMessages } from "./utils/messages.js";
import { runActions } from "./utils/tools.js";

// Setup

const LuxuryMessages = [];
const LuxuryThread = await openai.beta.threads.create();

// Assistant

await deleteAssistant("Luxury Apparel (RAG)");

debug("ℹ️  Creating (RAG) assistant...");
const LuxuryAssistant = await openai.beta.assistants.create({
  name: "Luxury Apparel (RAG)",
  description: "Search and/or analyze the luxury apparel data.",
  instructions: `You can search and analyze the luxury apparel data.`,
  tools: [
    {
      type: "function",
      function: {
        name: "main.products",
        description:
          "Search for luxury apparel items using semantic search with OpenSearch and optionally perform data analysis on aggregate or large file results with code interpreter.",
        parameters: {
          type: "object",
          properties: {
            perform: { type: "boolean", description: "Perform the search" },
          },
          required: ["perform"],
        },
      },
    },
  ],
  model: "gpt-4-0125-preview",
});

// Count Products

// const countMsg = await createMessage(
//   LuxuryMessages,
//   LuxuryThread,
//   "How many products do you have?"
// );

// const countRun = await runAssistant(LuxuryAssistant, LuxuryThread);
// await runActions(countRun, countMsg);
// await readMessages(LuxuryThread);

// Category Analysis

const diagramQuery = await createMessage(
  LuxuryMessages,
  LuxuryThread,
  "Show me a bar chart image with totals of each category."
);

const analyzeRun = await runAssistant(LuxuryAssistant, LuxuryThread);
await runActions(analyzeRun, diagramQuery);
console.log("\n\n\nHERE");
const messages = await readMessages(LuxuryThread);
// await downloadFile(messages, knowledgeFormat);
