import { openai } from "./openai.js";
import { sleep, isDebug, debug } from "./helpers.js";
import { createMessage } from "./messages.js";
import { runActions } from "./tools.js";

const askAssistant = async (asst, aMessage, fOptions = {}) => {
  const dOptions = { log: true };
  const options = { ...dOptions, ...fOptions };
  const msg = await createMessage(asst, aMessage, options.log);
  const run = await runAssistant(asst);
  const output = await runActions(asst, run, options);
  return output;
};

const deleteAssistant = async (name) => {
  const assistant = (
    await openai.beta.assistants.list({ limit: "100" })
  ).data.find((a) => a.name === name);
  if (assistant !== undefined) {
    debug(`🗑️  Deleting assistant: ${name}`);
    await openai.beta.assistants.del(assistant.id);
  }
};

const runAssistant = async (asst) => {
  debug("ℹ️  Running...");
  const run = await openai.beta.threads.runs.create(asst.thread.id, {
    assistant_id: asst.assistant.id,
  });
  const waitRun = await waitForRun(run);
  return waitRun;
};

const waitForRun = async (run) => {
  let waitRun;
  let running = true;
  while (running) {
    waitRun = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
    await sleep(500);
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
  const runSteps = await openai.beta.threads.runs.steps.list(
    run.thread_id,
    run.id
  );
  for (const step of runSteps.data) {
    debug("👣 " + JSON.stringify(step));
  }
  return waitRun;
};

export { askAssistant, deleteAssistant, runAssistant, waitForRun };
