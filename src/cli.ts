import { OpenAI } from "https://deno.land/x/openai@v4.55.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

const VERSION = "1.4.1";

const flags = parseArgs(Deno.args, {
  alias: {
    h: "help",
    v: "version",
    V: "version",
    e: "english",
  },
  boolean: ["help", "version", "mini", "4o", "english"],
});

interface ModelList {
  mini: OpenAI.ChatModel;
  gpt4: OpenAI.ChatModel;
}
const MODEL_LIST: ModelList = {
  mini: "gpt-4o-mini",
  gpt4: "gpt-4o",
};

const DEFAULT_MODEL = MODEL_LIST.gpt4;
const model = flags["mini"]
  ? MODEL_LIST.mini
  : flags["4"]
  ? MODEL_LIST.gpt4
  : DEFAULT_MODEL;

const isTranslateMode = flags["english"] ? true : false;

const prompt = isTranslateMode
  ? "Translate the input message into English."
  : "Remember this: If the input message is in Japanese, translate it into English first. Then, reply only in English. Do not reply in Japanese. Additionally, when using code blocks, always specify the programming language.";

const apiKeySchema = z.string();
const apiKeyResult = apiKeySchema.safeParse(Deno.env.get("OPENAI_API_KEY"));

if (!apiKeyResult.success) {
  console.error("Error: OPENAI_API_KEY is not set.");
  Deno.exit(1);
}

const openai = new OpenAI({ apiKey: apiKeyResult.data });

const createCompletionConfig = (
  inputText: string,
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming => ({
  model,
  messages: [{
    role: "system",
    content:
      "You are a programming and system administration assistant named Mohaya. You can help me in English. Please respond accurately and concisely. Do not include any additional output other than the result.",
  }, {
    role: "user",
    content: prompt + "\n\n========\n\n" + inputText,
  }],
  stream: true,
});

const askCommand = async () => {
  const inputText = flags._.join(" ");

  const completionConfig = createCompletionConfig(inputText);
  const stream = await openai.chat.completions.create(completionConfig);

  for await (const part of stream) {
    const choices = part.choices;
    if (
      choices.length > 0 &&
      choices[0].finish_reason === null &&
      choices[0].delta.content
    ) {
      const content = new TextEncoder().encode(choices[0].delta.content);
      Deno.stdout.write(content);
    } else if (choices[0].finish_reason !== null) {
      const newLine = new TextEncoder().encode("\n");
      Deno.stdout.write(newLine);
      break;
    }
  }
};

const main = async () => {
  // version command
  if (flags.version) {
    console.log(VERSION);
    Deno.exit(0);
  }
  // help command
  if (flags.help || Deno.args.length === 0) {
    console.log(`Usage: mohaya <text>

Options:
  -h, --help     Show help
  -v, --version  Show version number

  --mini             Operate with GPT-4o Mini
  --4o             Operate with GPT-4o (default) 
  
  -e, --english  Translate the input message into English.`);

    Deno.exit(0);
  }

  // ask command
  await askCommand();
};

if (import.meta.main) {
  main();
}
