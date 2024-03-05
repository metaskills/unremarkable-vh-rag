import { openai } from "./openai.js";
import { debug } from "./helpers.js";
import { waitForRun } from "./assistants.js";
import { SearchTool } from "../tools/search.js";

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
        switch (toolCall.function.name) {
          case "search":
            toolOutput.output = await SearchTool.call(aMessage);
            isToolOuputs = true;
            break;
          case "return_opensearch_query":
            const args = JSON.parse(toolCall.function.arguments);
            toolOutput.output = await SearchTool.search(args);
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
  const messages = await openai.beta.threads.messages.list(waitRun.thread_id);
  const output = messages.data[0].content[0].text.value;
  return output;
};

export { runActions };
