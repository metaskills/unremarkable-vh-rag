import { openai } from "./utils/openai.js";

// Setup

let luxuryAssistant, messages;

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

luxuryAssistant = assistantsPage.data.find(
  (a) => a.name === "Luxury Apparel (RAG)"
);

if (luxuryAssistant !== undefined) {
  debug(`Deleting assistant: ${luxuryAssistant.id}`);
  await openai.beta.assistants.del(luxuryAssistant.id);
}

// Assistant, Thread, Message

//
// TODO: Add analyse (full)
// TODO: Add analyse-aggregate (counts, numbers, etc)
//

debug("Creating assistant...");
luxuryAssistant = await openai.beta.assistants.create({
  name: "Luxury Apparel (RAG)",
  description: "Find or Analyze",
  instructions: `You can search and analyze the luxury apparel ${knowledgeFormatName} data.`,
  tools: [
    {
      type: "function",
      function: {
        name: "search",
        description: "Search for luxury apparel using semantic search ",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state e.g. San Francisco, CA",
            },
            unit: { type: "string", enum: ["c", "f"] },
          },
          required: ["location"],
        },
      },
    },
    { type: "code_interpreter" },
  ],
  model: "gpt-4-0125-preview",
});

debug("Creating thread...");
const luxuryThread = await openai.beta.threads.create();
