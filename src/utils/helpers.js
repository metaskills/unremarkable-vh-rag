import fs from "fs";
import url from "url";
import path from "path";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectBasePath = path.resolve(__dirname, "../..");
const isDebug = process.env.DEBUG;

const ai = (message, options = {}) => {
  if ((options.log && !isDebug) || isDebug) {
    console.log(`🤖 ${message}`);
  }
};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const debug = (message) => {
  if (isDebug) {
    console.log(message);
  }
};

const projectPath = (filePath) => {
  return path.join(projectBasePath, filePath);
};

const formatOutputs = (outputs) => {
  const result = outputs.map((item) => {
    if (typeof item === "string") {
      return item;
    } else {
      return JSON.stringify(item);
    }
  });
  return result.join("\n\n");
};

export { ai, sleep, isDebug, debug, formatOutputs, projectPath };
