import { openai } from "./openai.js";
import { ai, debug } from "./helpers.js";

const createMessage = async (collection, thread, message, log = true) => {
  const content = messageContent(message);
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

const messageContent = (msg) => {
  let message = "";
  if (typeof msg === "string") {
    message = msg;
  } else if (msg && msg.role === "user") {
    message = msg.content[0].text.value;
  } else if (msg && msg.role === "assistant") {
    message = msg.content[0].text.value;
  }
  return message;
};

const messagesContent = async (thread) => {
  const content = [];
  const messages = await readMessages(thread);
  for (const message of messages.data) {
    // console.log("\nmessage: " + JSON.stringify(message), "\n");
    content.push(messageContent(message));
  }
  // console.log("\ncontent: " + content.join("\n").trim(), "\n");
  // return content.join("\n").trim();
  return content[0].trim();
};

const readMessages = async (thread) => {
  const threadId = typeof thread === "string" ? thread : thread.id;
  const messages = await openai.beta.threads.messages.list(threadId);
  if (messages.data[0].content[0].text) {
    ai(messages.data[0].content[0].text.value);
  }
  return messages;
};

export { createMessage, messageContent, messagesContent, readMessages };
