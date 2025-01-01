import { OpenAI } from "https://deno.land/x/openai@v4.68.2/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

const VERSION = "1.6.0";

const flags = parseArgs(Deno.args, {
  alias: {
    h: "help",
    v: "version",
    V: "version",
    l: "lite",
    e: "english",
    r: "revise",
  },
  boolean: ["help", "version", "lite", "english", "revise"],
});

interface ModelList {
  lite: OpenAI.ChatModel;
  normal: OpenAI.ChatModel;
}
const MODEL_LIST: ModelList = {
  lite: "gpt-4o-mini",
  normal: "gpt-4o",
};

const model = flags["lite"] ? MODEL_LIST.lite : MODEL_LIST.normal;

const isTranslateMode = flags["english"] ? true : false;
const isReviseMode = flags["revise"] ? true : false;

const prompt = () => {
  if (isTranslateMode) {
    return "Translate the input message into English.";
  } else if (isReviseMode) {
    return "Revise the provided input text in English. If no revision is needed, state that explicitly. Output only the revised version or the message indicating no revision is necessary.";
  }
  return "Remember this: If the input message is in Japanese, translate it into English first. Then, reply only in English. Do not reply in Japanese. Additionally, when using code blocks, always specify the programming language.";
};

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
    content: prompt() + "\n\n========\n\n" + inputText,
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
    console.log(`Usage: mohaya [TEXT]

Arguments:
  [TEXT]         The text to ask Mohaya

Options:
  -h, --help     Show help
  -v, --version  Show version number
  -l, --lite     Operate with GPT-4o mini (default: GPT-4o)
  -e, --english  Translate the input message into English
  -r, --revise   Revise the input message in English`);

    Deno.exit(0);
  }

  // ask command
  await askCommand();
};

if (import.meta.main) {
  main();
}
