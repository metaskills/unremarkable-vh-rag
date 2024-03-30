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

const messagesContent = async (asst, options = {}) => {
  const mContent = [];
  const messages = await readMessages(asst, options);
  for (const message of messages.data) {
    if (message.role === "assistant") {
      // Assistant Text.
      for (const content of message.content.filter((c) => c.type === "text")) {
        const message = content.text.value;
        mContent.push(message);
        ai(message, options);
      }
      // Assistant Files.
      // TODO: Different file types?
      // TODO: Alt tag?
      if (message.content[0].type === "image_file") {
        const imageFileID = message.content[0].image_file.file_id;
        const imageFilePath = await downloadFile(imageFileID);
        const imageMessage = `![Image](https://example.com${imageFilePath})`;
        mContent.push(imageMessage);
        ai(imageMessage, options);
      }
    }
  }
  return mContent.join("\n\n");
};

const readMessages = async (asst, options = {}) => {
  const messages = await openai.beta.threads.messages.list(asst.thread.id, {
    // A) Use assistant messages state? b) Moot with streaming responses?
    limit: 1,
  });
  return messages;
};

export { createMessage, messageContent, messagesContent };
