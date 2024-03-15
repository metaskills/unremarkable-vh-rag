import { openai } from "./openai.js";
import { debug } from "./helpers.js";
import { waitForRun } from "./assistants.js";
import { products } from "../tools/products.js";

const runActions = async (aRun, aMessage, callback) => {
  if (
    aRun.status === "requires_action" &&
    aRun.required_action.type === "submit_tool_outputs"
  ) {
    let toolMessage;
    const toolOutputs = [];
    const toolCalls = aRun.required_action.submit_tool_outputs.tool_calls;
    for (const toolCall of toolCalls) {
      let response;
      debug("🧰 " + JSON.stringify(toolCall));
      if (toolCall.type === "function") {
        const toolOutput = { tool_call_id: toolCall.id };
        switch (toolCall.function.name) {
          case "main.products":
            response = await products.ask(aMessage);
            toolOutput.output = response.output;
            toolMessage = response.message;
            break;
          case "products.opensearch_query":
            const args = JSON.parse(toolCall.function.arguments);
            toolOutput.output = await products.opensearchQuery(args);
            break;
          case "products.code_interpreter":
            response = await products.codeInterpreter(aMessage);
            toolOutput.output = response.output;
            toolMessage = response.message;
            break;
          default:
            break;
        }
        debug("🍿 " + JSON.stringify(toolOutput));
        toolOutputs.push(toolOutput);
      }
    }
    // toolMessage;
    if (toolOutputs.some((tool) => tool.hasOwnProperty("output"))) {
      const toolsOutput = await submitToolOutputs(
        aRun,
        toolOutputs,
        toolMessage
      );
      return toolsOutput;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const submitToolOutputs = async (run, toolOutputs, toolMessage) => {
  debug("ℹ️  Submitting outputs...");
  await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
    tool_outputs: toolOutputs,
  });
  const waitRun = await waitForRun(run);
  await runActions(waitRun, toolMessage);
  const messages = await openai.beta.threads.messages.list(waitRun.thread_id);
  const output = messages.data[0].content[0].text.value;
  return output;
};

export { runActions };
