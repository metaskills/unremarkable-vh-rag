import { openai } from "../../src/utils/openai.js";
import { debug } from "../../src/utils/helpers.js";
import { messageContent, messagesContent } from "../../src/utils/messages.js";
import { waitForRun } from "../../src/utils/assistants.js";

const runActions = async (asst, aRun, options = {}) => {
  if (
    aRun.status === "requires_action" &&
    aRun.required_action.type === "submit_tool_outputs"
  ) {
    let isToolOuputs = false;
    const toolOutputs = [];
    const toolCalls = aRun.required_action.submit_tool_outputs.tool_calls;
    debug("🧰 " + JSON.stringify(toolCalls.map((tc) => tc.function.name)));
    if (typeof asst.tools === "object" && asst.tools !== null) {
      for (const toolCall of toolCalls) {
        debug("🪚  " + JSON.stringify(toolCall));
        if (toolCall.type === "function") {
          const toolOutput = { tool_call_id: toolCall.id };
          const functionArgs = JSON.parse(toolCall.function.arguments);
          if (
            asst.tools[toolCall.function.name] &&
            typeof asst.tools[toolCall.function.name].ask === "function"
          ) {
            const output = await asst.tools[toolCall.function.name].ask(
              messageContent(asst.messages[0], options),
              functionArgs
            );
            toolOutput.output = output;
            isToolOuputs = true;
          }
          debug("🪵  " + JSON.stringify(toolOutput));
          toolOutputs.push(toolOutput);
        }
      }
    }
    if (isToolOuputs) {
      const output = await submitToolOutputs(asst, aRun, toolOutputs, options);
      return output;
    } else {
      return await messagesContent(asst, options);
    }
  } else {
    return await messagesContent(asst, options);
  }
};

const submitToolOutputs = async (asst, run, toolOutputs, options = {}) => {
  debug("🏡  Submitting outputs...");
  await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
    tool_outputs: toolOutputs,
  });
  if (asst.passToolOutputs) {
    toolOutputs.forEach((to) => {
      asst.toolOutputs.push(to.output);
    });
  }
  const submitRun = await waitForRun(run);
  const output = await runActions(asst, submitRun, options);
  return output;
};

export { runActions };
