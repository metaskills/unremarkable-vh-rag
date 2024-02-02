import fs from "fs";
import OpenAI from "openai";
const openai = new OpenAI();

const fileID = process.argv[2];

const retrievedFile = await openai.files.retrieve(fileID);
console.log(retrievedFile);

const response = await openai.files.content(fileID);
const writeStream = fs.createWriteStream("./images/diagram.png");
response.body.pipe(writeStream);
