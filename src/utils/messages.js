import { openai } from "./openai.js";
import { ai, debug } from "./helpers.js";
import { downloadFile } from "./files.js";

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
  const messages = await openai.beta.threads.messages.list(threadId);
  for (const message of messages.data) {
    if (message.role === "assistant") {
      // Assistant Text.
      for (const content of message.content.filter((c) => c.type === "text")) {
        const message = content.text.value;
        ai(message, options);
      }
      // Assistant Files.
      if (message.content.some((c) => /file/.test(c.type))) {
        for (const content of message.content.filter(
          (c) => c.type === "text" && c.text.annotations
        )) {
          for (const annotation of content.text.annotations) {
            if (annotation.type === "file_path") {
              const fileID = annotation.file_path.file_id;
              const filePath = annotation.text;
              const fileName = filePath.split("/").pop();
              await downloadFile(fileID, fileName);
            }
          }
        }
      }
    }
  }
  return messages;
};

export { createMessage, messageContent, messagesContent };
