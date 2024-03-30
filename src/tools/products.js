import { openai } from "../utils/openai.js";
import { debug } from "../utils/helpers.js";
import { askAssistant, deleteAssistant } from "../utils/assistants.js";
import { ProductsOpenSearchTool } from "./productsOpenSearch.js";

class ProductsTool {
  constructor() {
    this.model = "gpt-4-0125-preview";
    this.agentName = "Luxury Apparel (Products)";
    this.toolName = "products";
    this.useToolOutputs = true;
    this.messages = [];
    this.tools = {};
  }

  async init() {
    this.openSearchTool = new ProductsOpenSearchTool();
    await this.openSearchTool.init();
    await deleteAssistant(this.agentName);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
    this.tools[this.openSearchTool.toolName] = this.openSearchTool;
  }

  async ask(aMessage) {
    return await askAssistant(this, aMessage, { log: false });
  }

  // Private

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      model: this.model,
      name: this.agentName,
      description: "Luxury Apparel product search assistant.",
      instructions: `
You are part of a Luxury Apparel panel of experts that responds to a user's messages. Your job is to help to perform semantic and faceted search to Luxury Apparel product data. You can also post process aggregate data or large files with your code interpreter tool.

Follow these rules:

1. Always use your tools for each message.
2. Do not mention download links in the response. 
3. Assume generated images will be shown to the user.
      `.trim(),
      tools: [
        {
          type: "function",
          function: {
            name: this.openSearchTool.toolName,
            description: "Can search the Luxury Apparel data.",
            parameters: {
              type: "object",
              properties: { message: { type: "string" } },
              required: ["message"],
            },
          },
        },
        { type: "code_interpreter" },
      ],
    });
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

export { ProductsTool };
