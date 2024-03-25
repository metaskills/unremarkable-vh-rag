import fs from "fs";
import { openai } from "./openai.js";
import { debug } from "./helpers.js";
import { fileTypeFromBuffer } from "file-type";

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
  const chunks = [];
  for await (const chunk of response.body) {
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  const detectedType = await fileTypeFromBuffer(data);
  let fnWithFallback = fileName || file.filename;
  if (detectedType?.ext) {
    const nameWithoutExt = fnWithFallback.replace(/\.[^/.]+$/, "");
    fnWithFallback = `${nameWithoutExt}.${detectedType.ext}`;
  }
  fs.writeFileSync(`./files/${fnWithFallback}`, data);
};

export { reCreateFile, downloadFile };
