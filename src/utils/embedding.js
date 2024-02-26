import { openai } from "./openai.js";

const MODEL = "text-embedding-3-small";

const createEmbedding = async (input) => {
  const response = await openai.embeddings.create({
    model: MODEL,
    input: input,
  });
  return response.data[0].embedding;
};

export { createEmbedding };
