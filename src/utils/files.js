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

const downloadFile = async (messages, knowledgeFormat) => {
  let fileID;
  for (const content of messages.data[0].content) {
    if (content.type === "image_file") {
      fileID = content.image_file.file_id;
    }
  }
  if (fileID) {
    debug(`ℹ️  Get file content: ${fileID}`);
    const file = await openai.files.retrieve(fileID);
    debug(`ℹ️  File: ${JSON.stringify(file)}`);
    debug(`ℹ️  Downloading file: ${fileID}`);
    const response = await openai.files.content(fileID);
    const randSuffix = Math.random().toString(36).substring(2, 7);
    const writeStream = fs.createWriteStream(
      `./files/diagram-${knowledgeFormat}-${randSuffix}.png`
    );
    response.body.pipe(writeStream);
  }
};

export { reCreateFile, downloadFile };
