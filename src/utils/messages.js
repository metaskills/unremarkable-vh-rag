import { openai } from "./openai.js";
import { ai, debug } from "./helpers.js";

const createMessage = async (collection, thread, message, log = true) => {
  const content =
    typeof message === "string" ? message : message.content[0].text.value;
  if (log) {
    console.log(`💬 ${content}`);
  }
  const msg = await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: content,
  });
  debug("💌 " + JSON.stringify(msg));
  collection.unshift(msg);
  return msg;
};

const readMessages = async (thread) => {
  const messages = await openai.beta.threads.messages.list(thread.id);
  if (messages.data[0].content[0].text) {
    ai(messages.data[0].content[0].text.value);
  }
  return messages;
};

export { createMessage, readMessages };
