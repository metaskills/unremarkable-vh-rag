import { openai } from "./utils/openai.js";
import { debug } from "./utils/helpers.js";
import { askAssistant, deleteAssistant } from "./utils/assistants.js";
import { ProductsTool } from "./tools/products.js";

class LuxuaryApparelAssistant {
  constructor() {
    this.model = "gpt-4-0125-preview";
    this.agentName = "Luxury Apparel";
    this.messages = [];
    this.tools = {};
  }

  async init() {
    this.productsTool = new ProductsTool();
    await this.productsTool.init();
    await deleteAssistant(this.agentName);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
    this.tools[this.productsTool.toolName] = this.productsTool;
  }

  async ask(aMessage) {
    return await askAssistant(this, aMessage);
  }

  // Private

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      name: this.agentName,
      description: "Luxury Apparel virtual assistant.",
      instructions: `
Call the various tools in response to a user's messages.

Follow these rules:

1. Do not mention download links in the response. 
2. Always show markdown images to the user.
      `.trim(),
      model: this.model,
      tools: [
        {
          type: "function",
          function: {
            name: this.productsTool.toolName,
            description:
              "Can search and analyze the Luxury Apparel product data.",
            parameters: {
              type: "object",
              properties: { message: { type: "string" } },
              required: ["message"],
            },
          },
        },
      ],
    });
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

const assistant = new LuxuaryApparelAssistant();
await assistant.init();

// Count Products

await assistant.ask("How many products do you have?");

// Category Analysis

await assistant.ask("Show me a bar chart image with totals of each category.");

// RAG Lexical, Faceted, & Semantic Search

await assistant.ask(
  "Find men's accessories for a sophisticated comic book enthusiast."
);

// Debug Messages

debug(`Ⓜ️  ${JSON.stringify(assistant.messages)}`);
debug(`Ⓜ️  ${JSON.stringify(assistant.productsTool.messages)}`);
