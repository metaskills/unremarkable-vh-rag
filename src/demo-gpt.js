import { openai } from "./utils/openai.js";
import { debug } from "./utils/helpers.js";
import { askAssistant, deleteAssistant } from "./utils/assistants.js";
import { reCreateFile } from "./utils/files.js";

class LuxuaryApparelAssistant {
  constructor() {
    this.model = "gpt-4-0125-preview";
    this.agentName = "Luxury Apparel (GPT)";
    this.messages = [];
    this.tools = {};
  }

  async init() {
    await deleteAssistant(this.agentName);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
  }

  async ask(aMessage) {
    return await askAssistant(this, aMessage);
  }

  // Private

  async createAssistant() {
    const luxuryFile = await reCreateFile(
      "Luxury_Products_Apparel_Data",
      this.knowledge.format
    );
    const assistant = await openai.beta.assistants.create({
      name: this.agentName,
      description: "Search or analyze the luxury apparel data.",
      instructions: `
You can search and analyze the luxury apparel ${this.knowledge.name} data.

Follow these rules:

1. Do not mention download links in the response. 
2. Assume generated images are shown to the user.
`.trim(),
      tools: [{ type: "code_interpreter" }],
      model: "gpt-4-0125-preview",
      file_ids: [luxuryFile.id],
    });
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }

  get knowledge() {
    const format = process.env.KNOWLEDGE_FORMAT || "csv";
    let name = format.toUpperCase();
    if (format === "md") {
      name = "Markdown";
    }
    return { format, name };
  }
}

const assistant = new LuxuaryApparelAssistant();
await assistant.init();

// Count Products

await assistant.ask("How many products do you have?");

// Category Analysis

await assistant.ask("Show me a bar chart image with totals of each category.");

// GPT Knowledge Search

await assistant.ask(
  "Find men's accessories for a sophisticated comic book enthusiast."
);
