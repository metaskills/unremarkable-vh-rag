import { openai } from "../../src/utils/openai.js";
import { debug } from "../../src/utils/helpers.js";
import { messageContent, messagesContent } from "../../src/utils/messages.js";
import { waitForRun } from "../../src/utils/assistants.js";

const runActions = async (aRun, aMessage, tools) => {
  if (
    aRun.status === "requires_action" &&
    aRun.required_action.type === "submit_tool_outputs"
  ) {
    let isToolOuputs = false;
    const toolOutputs = [];
    const toolCalls = aRun.required_action.submit_tool_outputs.tool_calls;
    debug("🧰 " + JSON.stringify(toolCalls.map((tc) => tc.function.name)));
    if (typeof tools === "object" && tools !== null) {
      for (const toolCall of toolCalls) {
        debug("🪚 " + JSON.stringify(toolCall));
        if (toolCall.type === "function") {
          const toolOutput = { tool_call_id: toolCall.id };
          const functionArgs = JSON.parse(toolCall.function.arguments);
          if (
            tools[toolCall.function.name] &&
            typeof tools[toolCall.function.name].ask === "function"
          ) {
            const output = await tools[toolCall.function.name].ask(
              messageContent(aMessage),
              functionArgs
            );
            toolOutput.output = output;
            isToolOuputs = true;
          }
          debug("🪵 " + JSON.stringify(toolOutput));
          toolOutputs.push(toolOutput);
        }
      }
    }
    if (isToolOuputs) {
      const output = await submitToolOutputs(aRun, toolOutputs, tools);
      return output;
    } else {
      return await messagesContent(aRun.thread_id);
    }
  } else {
    return await messagesContent(aRun.thread_id);
  }
};

const submitToolOutputs = async (run, toolOutputs, tools) => {
  debug("🏡  Submitting outputs...");
  await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
    tool_outputs: toolOutputs,
  });
  const submitRun = await waitForRun(run);
  const output = await runActions(submitRun, toolOutputs[0].output, tools);
  return output;
};

export { runActions };
