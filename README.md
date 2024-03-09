
# Unremarkable.ai Demo

* Mixing Vertical Horizontal RAG Architectures
* Faceted Search, Semantic Retrieval, & Data Analysis


## Setup

This project leverages [Dev Containers](https://containers.dev/) meaning you can open it in any supporting IDE and get started right away. This includes using [VS Code with Dev Containers](https://www.youtube.com/watch?v=b1RavPr_878) which is the recommended approach.

Once opened in your development container, create a `.env.development.local` file with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

Now you can run the following commands:

```bash
npm install
npm run db:create
npm run db:index
```

## Demo Commands

This will run the various OpenAI Assistants API demos. If any image files like product category charts are created, they will be saved to the `./files` directory. 

```bash
npm run demo:gpt
npm run demo:rag
```

You can use the following environment variables to customize the demo:gpt command.

- `DEBUG` Set to any value to enable debug 🪲 logging.
- `KNOWLEDGE_FORMAT` Set to process a specific knowledge format. Options: `csv`, `json`, `md`. Defaults to CSV.

## Access OpenSearch

To access the OpenSearch Dashboards hosted in the dev container, use the following URL. Use the `admin` username and `admin` password to log in.

```
http://localhost:5601
```
