# unRemarkable.ai GPT vs. Assistants Demo

Exploring a panel of experts assistants model.

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

This will run the various OpenAI Assistants API demos. The `demo:gpt` command will mimic a Custom GPT's knowledge retrieval. The `demo:rag` will demonstrate the same Q&A sequence with a panel of experts using the Assistants API.

```bash
npm run demo:gpt
npm run demo:rag
```

Images created by any run step such as charts created by code interpreter will be saved to the `./files` directory. These are git ignored. You can use the following environment variables to customize the scripts' behaviors.

- `DEBUG` Set to any value to enable debug 🪲 logging.
- `KNOWLEDGE_FORMAT` Set to process a specific knowledge format. Options: `csv`, `json`, `md`. Defaults to CSV. Only used in the `demo:gpt` script.

## Access OpenSearch

To access the OpenSearch Dashboards hosted in the dev container, use the following URL. Use the `admin` username and `admin` password to log in.

```
http://localhost:5601
```

## Luxury Apparel Data

The data used for this demonstration is from Kaggle.

https://www.kaggle.com/datasets/chitwanmanchanda/luxury-apparel-data

Here are the categories in the dataset. Use these to test your own pre-filtered queries.

* Accessories
* Activewear
* Jackets/Coats
* Jewelry
* Pants
* Shirts
* Shoes
* Suits
* Sweaters
* Underwear and Nightwear

## Notes

Consider 1st tier pass-thru tool data. For example, if `products` responds with `Yes.` is there any guarantee that the orchestrator should echo that message or answer in it's own words? **Should products return raw tool data only or LLM response to said data?**
