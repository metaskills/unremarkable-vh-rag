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
    let lastMessage = messageContent(aMessage);
    const toolOutputs = [];
    const toolCalls = aRun.required_action.submit_tool_outputs.tool_calls;
    debug("🚧 " + JSON.stringify(toolCalls.map((tc) => tc.function.name)));
    if (typeof tools === "object" && tools !== null) {
      for (const toolCall of toolCalls) {
        debug("🧰 " + JSON.stringify(toolCall));
        if (toolCall.type === "function") {
          const toolOutput = { tool_call_id: toolCall.id };
          const functionArgs = JSON.parse(toolCall.function.arguments);
          if (
            tools[toolCall.function.name] &&
            typeof tools[toolCall.function.name].ask === "function"
          ) {
            console.log("\n\nlastMessage: " + lastMessage);
            const output = await tools[toolCall.function.name].ask(
              lastMessage,
              functionArgs
            );
            console.log("\n\noutput: " + output + "\n\n");
            lastMessage = output;
            toolOutput.output = output;
            isToolOuputs = true;
          }
          debug("🍿 " + JSON.stringify(toolOutput));
          toolOutputs.push(toolOutput);
        }
      }
    }
    if (isToolOuputs) {
      const output = await submitToolOutputs(aRun, toolOutputs);
      return output;
    } else {
      return await messagesContent(aRun.thread_id);
    }
  } else {
    return await messagesContent(aRun.thread_id);
  }
};

const submitToolOutputs = async (run, toolOutputs) => {
  debug("ℹ️  Submitting outputs...");
  await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
    tool_outputs: toolOutputs,
  });
  const waitRun = await waitForRun(run);
  await runActions(waitRun, undefined);
  const messages = await openai.beta.threads.messages.list(waitRun.thread_id);
  console.log("\n\nmessages: " + JSON.stringify(messages), "\n\n");
  const output = messages.data[0].content[0].text.value;
  return output;
};

export { runActions };
