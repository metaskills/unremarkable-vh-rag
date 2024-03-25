import { openai } from "./openai.js";
import { ai, debug } from "./helpers.js";
import { downloadFile } from "./files.js";

const createMessage = async (asst, message, log = true) => {
  const content = messageContent(message);
  if (log) {
    console.log(`💬 ${content}`);
  }
  const msg = await openai.beta.threads.messages.create(asst.thread.id, {
    role: "user",
    content: content,
  });
  debug("💌 " + JSON.stringify(msg));
  asst.messages.unshift(msg);
  return msg;
};

const messageContent = (msg) => {
  if (typeof msg === "string") return msg;
  if (msg.content.length > 1) {
    debug("📤 (2 or More)" + JSON.stringify(msg));
  }
  const textContents = msg.content.filter((c) => c.type === "text");
  return textContents[0].text.value;
};

const messagesContent = async (thread, options = {}) => {
  const content = [];
  const messages = await readMessages(thread, options);
  for (const message of messages.data) {
    content.push(messageContent(message));
  }
  return content[0].trim();
};

const readMessages = async (thread, options = {}) => {
  const threadId = typeof thread === "string" ? thread : thread.id;
  const messages = await openai.beta.threads.messages.list(threadId, {
    // A) Use assistant messages state? b) Moot with streaming responses?
    limit: 1,
  });
  for (const message of messages.data) {
    if (message.role === "assistant") {
      // Assistant Text.
      for (const content of message.content.filter((c) => c.type === "text")) {
        const message = content.text.value;
        ai(message, options);
      }
      // Assistant Files.
      if (message.content[0].type === "image_file") {
        const fileID = message.content[0].image_file.file_id;
        await downloadFile(fileID);
      }
    }
  }
  return messages;
};

export { createMessage, messageContent, messagesContent };
