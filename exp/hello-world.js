import { openai } from "../src/utils/openai.js";
import { debug } from "../src/utils/helpers.js";
import { askAssistant, deleteAssistant } from "../src/utils/assistants.js";

class HelloWorldAssistant {
  constructor() {
    this.model = "gpt-4-0125-preview";
    this.agentName = "Hello World";
    this.messages = [];
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
    const assistant = await openai.beta.assistants.create({
      name: this.agentName,
      description: "Hello World",
      instructions: "All you know how to do is say hello. Nothing else.",
      model: this.model,
    });
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

const assistant = new HelloWorldAssistant();
await assistant.init();

await assistant.ask("Hi, my name is Ken.");
