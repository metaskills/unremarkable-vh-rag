import { openai } from "../src/utils/openai.js";
import { createMessage } from "../src/utils/messages.js";
import { deleteAssistant, runAssistant } from "../src/utils/assistants.js";
import { searchTool } from "./tools/search.js";

const NAME = "KCTest-ThreadLock";
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
        name: "main.search",
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

const mainRun = await runAssistant(ASSISTANT, THREAD);

// The point of this is to show that once a thread has an
// active run which requires tool outputs, you can not create
// another run on that thread. This would have been nice
// because we could have avoided passing messages around.
//
if (
  mainRun.status === "requires_action" &&
  mainRun.required_action.type === "submit_tool_outputs"
) {
  try {
    // This will cause the following error which is what we expect.
    // BadRequestError: 400 Thread thread_123 already has an active run run_123.
    const toolRun = await runAssistant(searchTool.assistant, THREAD);
  } catch (error) {
    console.log("✅ " + error.message);
  }
} else {
  console.log("❌ This should have failed.");
}
