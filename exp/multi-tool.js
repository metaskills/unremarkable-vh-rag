import { openai } from "../src/utils/openai.js";
import { debug } from "../src/utils/helpers.js";
import { createMessage } from "../src/utils/messages.js";
import { deleteAssistant, runAssistant } from "../src/utils/assistants.js";
import { runActions } from "./utils/tools-multi.js";

class QueryBuilderTool {
  constructor() {
    this.name = "build-query";
    this.messages = [];
    this.model = "gpt-4-0125-preview";
    this.agentName = "KCTest-MultiTool (QueryBuilder)";
  }

  async init() {
    await deleteAssistant(this.agentName);
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
      name: this.agentName,
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
            name: `tool-${this.name}`,
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
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

const queryBuilderTool = new QueryBuilderTool();
await queryBuilderTool.init();

class QueryExecutorTool {
  constructor() {
    this.name = "execute-query";
    this.messages = [];
    this.model = "gpt-4-0125-preview";
    this.agentName = "KCTest-MultiTool (QueryExecutor)";
  }

  async init() {
    await deleteAssistant(this.agentName);
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
      name: this.agentName,
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
            name: `tool-${this.name}`,
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
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

const queryExecutorTool = new QueryExecutorTool();
await queryExecutorTool.init();

class MultiToolAgent {
  constructor() {
    this.name = "KCTest-MultiTool";
    this.messages = [];
    this.model = "gpt-4-0125-preview";
    this.agentName = "KCTest-MultiTool (Router)";
    this.tools = {};
  }

  async init() {
    await deleteAssistant(this.agentName);
    this.assistant = await this.createAssistant();
    this.thread = await openai.beta.threads.create();
    this.tools[queryBuilderTool.name] = queryBuilderTool;
    this.tools[queryExecutorTool.name] = queryExecutorTool;
  }

  async ask(aMessage) {
    const msg = await createMessage(this.messages, this.thread, aMessage);
    const run = await runAssistant(this.assistant, this.thread);
    const output = await runActions(run, msg, this.tools);
    return output;
  }

  // Private

  // Here are some examples of the types of requests you will receive.
  //
  // Example 1:
  // Question: Show me a bar chart image with totals of each product category.
  // Tools: build-query, execute-query, code_interpreter
  // Reasoning: The user is asking for a chart, so we need to build a query to get the data and then execute the query so we can pass the data to code interpreter to build an image.
  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      name: this.agentName,
      description: "Respond to user questions for products by calling tools",
      instructions: `
Call the various tools in the order that makes sense to respond to the user's request.
      `.trim(),
      model: this.model,
      tools: [
        {
          type: "function",
          function: {
            name: queryBuilderTool.name,
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
            name: queryExecutorTool.name,
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
    debug(`💁‍♂️ Created ${this.agentName} assistant ${assistant.id}...`);
    return assistant;
  }
}

const multiToolAgent = new MultiToolAgent();
await multiToolAgent.init();
await multiToolAgent.ask(
  "Show me a bar chart image with totals of each product category."
);

debug(`Ⓜ️  ${JSON.stringify(multiToolAgent.messages)}`);
debug(`Ⓜ️  ${JSON.stringify(queryBuilderTool.messages)}`);
debug(`Ⓜ️  ${JSON.stringify(queryExecutorTool.messages)}`);
