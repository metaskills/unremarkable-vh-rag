import { openai } from "../src/utils/openai.js";
import { debug } from "../src/utils/helpers.js";
import { createMessage } from "../src/utils/messages.js";
import { deleteAssistant, runAssistant } from "../src/utils/assistants.js";
import { runActions } from "./utils/tools-multi.js";

class QueryBuilderTool {
  constructor() {
    this.name = "KCTest-MultiTool (QueryBuilder)";
    this.messages = [];
    this.model = "gpt-4-0125-preview";
  }

  async init() {
    await deleteAssistant(this.name);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
  }

  async ask(aMessage) {
    const msg = await createMessage(
      this.messages,
      this.thread,
      aMessage,
      false
    );
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(run, msg);
    return output;
  }

  // Private

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      name: this.name,
      description: "Generate SQL queries to find products",
      instructions: `
Your job is to build SQL queries for users requests for the following MySQL database tables:

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL
);

Example 1:
Question: Show me a bar chart image with totals of each product category.
Answer: SELECT category, COUNT(*) FROM products GROUP BY category;

Important rules to follow:

1. Only return the SQL in text format.
2. Do not use fenced code blocks or markdown.
      `.trim(),
      model: this.model,
      tools: [
        {
          type: "function",
          function: {
            name: "build-query",
            description: "Generate SQL queries to find products.",
            parameters: {
              type: "object",
              properties: { perform: { type: "boolean" } },
              required: ["perform"],
            },
          },
        },
      ],
    });
    debug(`ℹ️  Creatied ${this.name} assistant ${assistant.id}...`);
    return assistant;
  }
}

const queryBuilderTool = new QueryBuilderTool();
await queryBuilderTool.init();

class QueryExecutorTool {
  constructor() {
    this.name = "KCTest-MultiTool (QueryExecutor)";
    this.messages = [];
    this.model = "gpt-4-0125-preview";
  }

  async init() {
    await deleteAssistant(this.name);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
  }

  async ask(aMessage) {
    const msg = await createMessage(
      this.messages,
      this.thread,
      aMessage,
      false
    );
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(run, msg);
    return output;
  }

  // Private

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      name: this.name,
      description:
        "Pretend to execute queries on a MySQL database and return fase CSV data.",
      instructions: `
Here is the fictional database table we are giving you queries for.

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL
);

Here are some examples of the types of queries you will be asked to execute and the fake return CSV data.

Example 1:
Question: SELECT category, COUNT(*) AS total FROM products GROUP BY category;
Answer: 
category,COUNT(*)
Electronics,15
Books,10
Home & Garden,20
Clothing,25
Toys,5

Important rules to follow:

1. Only return the CSV data in text format.
2. Do not use fenced code blocks or markdown.
      `.trim(),
      model: this.model,
      tools: [
        {
          type: "function",
          function: {
            name: "build-query",
            description: "Return fake rows of products using SQL queries.",
            parameters: {
              type: "object",
              properties: { perform: { type: "boolean" } },
              required: ["perform"],
            },
          },
        },
      ],
    });
    debug(`ℹ️  Creatied ${this.name} assistant ${assistant.id}...`);
    return assistant;
  }
}

const queryExecutorTool = new QueryExecutorTool();
await queryExecutorTool.init();

class MultiToolAgent {
  constructor() {
    this.name = "KCTest-MultiTool (Router)";
    this.messages = [];
    this.model = "gpt-4-0125-preview";
  }

  async init() {
    await deleteAssistant(this.name);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
    this.tools = {
      "build-query": queryBuilderTool,
      "execute-query": queryExecutorTool,
    };
  }

  async ask(aMessage) {
    const msg = await createMessage(this.messages, this.thread, aMessage);
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(run, msg, this.tools);
    return output;
  }

  // Private

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      name: this.name,
      description: "Respond to user questions for products",
      instructions: `Call the various tools in the order that makes sense to respond to the user's request.`,
      model: this.model,
      tools: [
        {
          type: "function",
          function: {
            name: "build-query",
            description: "Generate SQL queries to find products",
            parameters: {
              type: "object",
              properties: { perform: { type: "boolean" } },
              required: ["perform"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "execute-query",
            description: "Execute SQL queries to return CSV data",
            parameters: {
              type: "object",
              properties: { perform: { type: "boolean" } },
              required: ["perform"],
            },
          },
        },
        { type: "code_interpreter" },
      ],
    });
    debug(`ℹ️  Creatied ${this.name} assistant ${assistant.id}...`);
    return assistant;
  }
}

const multiToolAgent = new MultiToolAgent();
await multiToolAgent.init();
await multiToolAgent.ask(
  "Show me a bar chart image with totals of each product category."
);

debug(`Ⓜ️ ${JSON.stringify(multiToolAgent.messages)}`);
debug(`Ⓜ️ ${JSON.stringify(multiToolAgent.tools["build-query"].messages)}`);
debug(`Ⓜ️ ${JSON.stringify(multiToolAgent.tools["execute-query"].messages)}`);

// const run = await runAssistant(ASSISTANT, THREAD);
// await runActions(run, msg);
// await readMessages(THREAD);
