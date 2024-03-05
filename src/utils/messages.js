import { openai } from "./openai.js";
import { debug } from "./helpers.js";

async function createMessage(collection, thread, role, content) {
  if (role === "user") {
    console.log(`💬 ${content}`);
  } else {
    console.log(`🤖 ${content}`);
  }
  const msg = await openai.beta.threads.messages.create(thread.id, {
    role: role,
    content: content,
  });
  debug("💌 " + JSON.stringify(msg));
  collection.unshift(msg);
  return msg;
}

export { createMessage };
