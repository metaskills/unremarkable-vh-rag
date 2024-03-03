import { openai } from "./utils/openai.js";
import { searchAssistant } from "./assistants/search.js";

// Setup

let luxuryAssistant, runResponse, messages;

// Helpers

function log(message) {
  console.log(`💬 ${message}`);
}

function ai(message) {
  console.log(`🤖 ${message}`);
}

function debug(message) {
  if (process.env.DEBUG) {
    console.log(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Assistant (Cleanup)

const assistantsPage = await openai.beta.assistants.list({ limit: "100" });

luxuryAssistant = assistantsPage.data.find(
  (a) => a.name === "Luxury Apparel (RAG)"
);

if (luxuryAssistant !== undefined) {
  debug(`🗑️  Deleting (RAG) assistant: ${luxuryAssistant.id}`);
  await openai.beta.assistants.del(luxuryAssistant.id);
}

// Assistant, Thread, Helpers

//
// TODO: Add analyse (full)
// TODO: Add analyse-aggregate (counts, numbers, etc)
//

debug("ℹ️  Creating (RAG) assistant...");
luxuryAssistant = await openai.beta.assistants.create({
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
    { type: "code_interpreter" },
  ],
  model: "gpt-4-0125-preview",
});

debug("ℹ️  Creating thread...");
const luxuryThread = await openai.beta.threads.create();

async function run(assistant) {
  let run;
  let running = true;
  debug("ℹ️  Running...");
  run = await openai.beta.threads.runs.create(luxuryThread.id, {
    assistant_id: assistant.id,
  });
  while (running) {
    run = await openai.beta.threads.runs.retrieve(luxuryThread.id, run.id);
    await sleep(1000);
    if (!/^(queued|in_progress|cancelling)$/.test(run.status)) {
      debug("🏃‍♂️ " + JSON.stringify(run));
      running = false;
    } else {
      debug("💨 " + JSON.stringify(run));
    }
  }
  return run;
}

async function runActions(aRun) {
  if (
    aRun.status === "requires_action" &&
    aRun.required_action.type === "submit_tool_outputs"
  ) {
    const toolCalls = aRun.required_action.submit_tool_outputs.tool_calls;
    for (const toolCall of toolCalls) {
      debug("🧰 " + JSON.stringify(toolCall));
      if (toolCall.type === "function" && toolCall.function.name === "search") {
        const sRun = await run(searchAssistant);
      }
    }
  }
}

async function submitToolOutputs(run, toolOutputs) {
  await openai.beta.threads.runs.submitToolOutputs(luxuryThread.id, run.id, {
    tool_outputs: toolOutputs,
  });
}

// { tool_call_id: "call_abc123", output: "28C" }

// Count Products

const howManyProducts = "How many products do you have?";
log(howManyProducts);

await openai.beta.threads.messages.create(luxuryThread.id, {
  role: "user",
  content: howManyProducts,
});

const countRun = await run(luxuryAssistant);
await runActions(countRun);

// messages = await openai.beta.threads.messages.list(luxuryThread.id);
// ai(messages.data[0].content[0].text.value);
