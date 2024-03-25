import { openai } from "../src/utils/openai.js";
import { debug } from "../src/utils/helpers.js";
import { createMessage } from "../src/utils/messages.js";
import { deleteAssistant, runAssistant } from "../src/utils/assistants.js";
import { runActions } from "../src/utils/tools.js";

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
        "Pretend to execute queries on a MySQL database and return fake CSV data.",
      instructions: `
Here is the fictional database table we are giving you queries for.

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL
);

Here are some examples of the types of queries you will be asked to execute and return fake CSV data.

Example 1:
Query: SELECT category, COUNT(*) AS total FROM products GROUP BY category;
Data: 
category,COUNT(*)
Accessories,1200
Shoes,1000
Shirts,800
Activewear,600
Pants,500
Jackets/Coats,400
Underwear and Nightwear,300
Suits,250
Sweaters,200
Jewelry,150

Important rules to follow:

1. Only return the CSV data in text format.
2. Do not use fenced code blocks or markdown.
      `.trim(),
      model: this.model,
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

  async createAssistant() {
    const assistant = await openai.beta.assistants.create({
      name: this.agentName,
      description: "Respond to user questions for products by calling tools",
      instructions: `
Call the various tools in the order that makes sense to respond to the user's request.

1. Do not mention download links in the response. 
2. Assume generated images are shown to the user.
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
              properties: { message: { type: "string" } },
              required: ["message"],
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
              properties: { sql: { type: "string" } },
              required: ["sql"],
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
