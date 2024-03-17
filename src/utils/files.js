import fs from "fs";
import { openai } from "./openai.js";
import { debug } from "./helpers.js";

const reCreateFile = async (fileBaseName, knowledgeFormat) => {
  const fileObjectsPage = await openai.files.list();
  const file = fileObjectsPage.data.find((f) =>
    f.filename.startsWith(fileBaseName)
  );
  if (file !== undefined) {
    debug(`🗑️  Deleting file: ${file.id}`);
    await openai.files.del(file.id);
  }
  const fileName = `${fileBaseName}.${knowledgeFormat}`;
  debug(`ℹ️ Creating file: ${fileName}...`);
  const newFile = await openai.files.create({
    file: fs.createReadStream(`data/${fileName}`),
    purpose: "assistants",
  });
  return newFile;
};

const downloadFile = async (fileID, fileName) => {
  const file = await openai.files.retrieve(fileID);
  debug(`🗂️ ${JSON.stringify(file)}`);
  const response = await openai.files.content(fileID);
  const writeStream = fs.createWriteStream(`./files/${fileName}`);
  response.body.pipe(writeStream);
};

export { reCreateFile, downloadFile };
