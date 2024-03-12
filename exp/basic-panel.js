import { openai } from "../src/utils/openai.js";
import { createMessage, readMessages } from "../src/utils/messages.js";
import { deleteAssistant, runAssistant } from "../src/utils/assistants.js";
import { runActions } from "./utils/tools.js";

const NAME = "KCTest-BasicPanel";
const MESSAGES = [];

const THREAD = await openai.beta.threads.create();
await deleteAssistant(`${NAME} (Router)`);
const ASSISTANT = await openai.beta.assistants.create({
  name: `${NAME} (Router)`,
  description: "Use the function tools to answer questions.",
  instructions: "",
  model: "gpt-4-0125-preview",
  tools: [
    {
      type: "function",
      function: {
        name: "main.products",
        description: "Search products.",
        parameters: {
          type: "object",
          properties: { perform: { type: "boolean" } },
          required: ["perform"],
        },
      },
    },
  ],
});

const msg = await createMessage(
  MESSAGES,
  THREAD,
  "How many products do you have?"
);

const run = await runAssistant(ASSISTANT, THREAD);
await runActions(run, msg);
await readMessages(THREAD);
