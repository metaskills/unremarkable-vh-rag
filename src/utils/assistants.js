import { openai } from "./openai.js";
import { sleep, isDebug, debug } from "./helpers.js";

const deleteAssistant = async (name) => {
  const assistant = (
    await openai.beta.assistants.list({ limit: "100" })
  ).data.find((a) => a.name === name);
  if (assistant !== undefined) {
    debug(`🗑️  Deleting assistant: ${name}`);
    await openai.beta.assistants.del(assistant.id);
  }
};

const runAssistant = async (assistant, thread) => {
  debug("ℹ️  Running...");
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });
  const waitRun = await waitForRun(run);
  return waitRun;
};

const waitForRun = async (run) => {
  let waitRun;
  let running = true;
  while (running) {
    waitRun = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
    await sleep(1000);
    if (!/^(queued|in_progress|cancelling)$/.test(waitRun.status)) {
      if (isDebug) {
        delete waitRun.instructions;
        delete waitRun.description;
      }
      debug("🏃‍♂️ " + JSON.stringify(waitRun));
      running = false;
    } else {
      debug("💨 " + JSON.stringify(waitRun.id));
    }
  }
  return waitRun;
};

export { deleteAssistant, runAssistant, waitForRun };
