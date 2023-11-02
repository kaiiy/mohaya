#!/usr/bin/env node

import { OpenAI } from "openai";
import { exit } from "process";
import { safeParse, string } from "valibot";

const VERSION = "0.1.0";
const MODEL = "gpt-3.5-turbo";

const apiKeySchema = string();
const apiKeyResult = safeParse(apiKeySchema, process.env.OPENAI_API_KEY);

if (!apiKeyResult.success) {
  console.error("Error: OPENAI_API_KEY is not set.");
  exit(1);
}

const openai = new OpenAI({ apiKey: apiKeyResult.output });

const createCompletionConfig = (
  inputText: string,
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming => ({
  model: MODEL,
  messages: [{
    role: "system",
    content:
      "You are a programming and system administration assistant, Mohaya.",
  }, {
    role: "user",
    content:
      "Remember this: If the input message is in Japanese, translate it into English first. Then, reply in English only. Do not reply in Japanese. In addition, when using code blocks, always specify the programming language.",
  }, {
    role: "user",
    content: inputText,
  }],
  stream: true,
});

const main = async (inputText: string) => {
  const completionConfig = createCompletionConfig(inputText);
  const stream = await openai.chat.completions.create(completionConfig);

  for await (const part of stream) {
    const choices = part.choices;
    if (
      choices.length > 0 &&
      choices[0].finish_reason === null &&
      choices[0].delta.content
    ) {
      process.stdout.write(choices[0].delta.content);
    } else if (choices[0].finish_reason !== null) {
      console.log();
      break;
    }
  }
};

let pipeData: string = "";
let inputData: string = "";

if (process.argv.length >= 3) {
  // Command line arguments were passed
  inputData += process.argv.slice(2).join(" ");
}

// Check if there is pipe input
if (!process.stdin.isTTY) {
  process.stdin.setEncoding('utf8'); // Set the encoding

  const end = new Promise((resolve, reject) => {
    process.stdin.on('readable', () => {
      let chunk;
      // Use a loop to make sure we read all the available data.
      while ((chunk = process.stdin.read()) !== null) {
        pipeData += chunk;
      }
    });

    process.stdin.on('end', () => {
      // All data has been received
      resolve(pipeData); // Resolve the data
    });
  });

  end.then((pipeData) => {
    // Combine input data and pipe data
    const combinedData = inputData + '\n\n========' + pipeData;
    main(combinedData); // Execute main after the promise is resolved
  });
} else {
  main(inputData);
}

