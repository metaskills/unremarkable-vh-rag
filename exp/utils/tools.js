import { openai } from "../../src/utils/openai.js";
import { ai, debug } from "../../src/utils/helpers.js";
import { waitForRun } from "../../src/utils/assistants.js";
import { searchTool } from "../tools/search.js";

const runActions = async (aMessage, aRun) => {
  if (
    aRun.status === "requires_action" &&
    aRun.required_action.type === "submit_tool_outputs"
  ) {
    let isToolOuputs = false;
    const toolOutputs = [];
    const toolCalls = aRun.required_action.submit_tool_outputs.tool_calls;
    for (const toolCall of toolCalls) {
      debug("🧰 " + JSON.stringify(toolCall));
      if (toolCall.type === "function") {
        const toolOutput = { tool_call_id: toolCall.id };
        const functionArgs = JSON.parse(toolCall.function.arguments);
        switch (toolCall.function.name) {
          case "main.search":
            toolOutput.output = await searchTool.call(aMessage);
            isToolOuputs = true;
            break;
          case "search.products":
            toolOutput.output = await searchTool.search(functionArgs);
            isToolOuputs = true;
            break;
          default:
            break;
        }
        debug("🍿 " + JSON.stringify(toolOutput));
        toolOutputs.push(toolOutput);
      }
    }
    if (isToolOuputs) {
      const output = await submitToolOutputs(aRun, toolOutputs);
      return output;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const submitToolOutputs = async (run, toolOutputs) => {
  debug("ℹ️  Submitting outputs...");
  await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
    tool_outputs: toolOutputs,
  });
  const waitRun = await waitForRun(run);
  await runActions(undefined, waitRun);
  const messages = await openai.beta.threads.messages.list(waitRun.thread_id);
  const output = messages.data[0].content[0].text.value;
  ai(output);
  return output;
};

export { runActions };
