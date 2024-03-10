import { openai } from "../../src/utils/openai.js";
import { debug } from "../../src/utils/helpers.js";
import { createMessage } from "../../src/utils/messages.js";
import { deleteAssistant, runAssistant } from "../../src/utils/assistants.js";
import { runActions } from "../utils/tools.js";

const NAME = "KCTest-SearchExpert";

class SearchTool {
  constructor() {
    this.messages = [];
    this.model = "gpt-4-0125-preview";
  }

  async init() {
    await deleteAssistant(NAME);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
  }

  async call(aMessage) {
    const msg = await createMessage(
      this.messages,
      this.thread,
      "user",
      aMessage.content[0].text.value,
      false
    );
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(msg, run);
    return output;
  }

  async search(args) {
    return 20;
  }

  // Private

  async createAssistant() {
    debug(`ℹ️  Creating ${NAME} assistant...`);
    const assistant = await openai.beta.assistants.create({
      name: NAME,
      description: "Search OpenSearch Database.",
      instructions: "Search OpenSearch Database.",
      model: "gpt-4-0125-preview",
      tools: [
        {
          type: "function",
          function: {
            name: "search.products",
            description: "Search OpenSearch Database.",
            parameters: {
              type: "object",
              properties: { perform: { type: "boolean" } },
              required: ["perform"],
            },
          },
        },
      ],
    });
    return assistant;
  }
}

const searchTool = new SearchTool();
await searchTool.init();

export { searchTool };
