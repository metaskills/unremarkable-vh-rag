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
  description: "Search or analyze the luxury apparel data.",
  instructions: `You can search and analyze the luxury apparel data.`,
  tools: [
    {
      type: "function",
      function: {
        name: "search",
        description: "Search for luxury apparel items using semantic search ",
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

const countMsg = await createMessage(
  LuxuryMessages,
  LuxuryThread,
  "user",
  "How many products do you have?"
);

const countRun = await runAssistant(LuxuryAssistant, LuxuryThread);
await runActions(countMsg, countRun);
await readMessages(LuxuryThread);
