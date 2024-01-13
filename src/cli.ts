import { OpenAI } from "https://deno.land/x/openai@v4.24.7/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { parseArgs } from "https://deno.land/std@0.212.0/cli/parse_args.ts";

const VERSION = "0.3.0";

const flags = parseArgs(Deno.args, {
  alias: {
    h: "help",
    v: "version",
  },
  boolean: ["help", "version", "3", "4"],
});

const MODEL_LIST = {
  gpt3: "gpt-3.5-turbo",
  gpt4: "gpt-4-1106-preview",
};
const DEFAULT_MODEL = MODEL_LIST.gpt3;
const model = flags["3"]
  ? MODEL_LIST.gpt3
  : flags["4"]
  ? MODEL_LIST.gpt4
  : DEFAULT_MODEL;

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
      "You are a programming and system administration assistant, Mohaya. You can help me with programming in English.",
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

const askCommand = async () => {
  const inputText = Deno.args.join(" ");

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
    console.log("Usage: mohaya <text>");
    console.log("");
    console.log("Options:");
    console.log("  -h, --help     Show help");
    console.log("  -v, --version  Show version number");
    Deno.exit(0);
  }

  // ask command
  await askCommand();
};

if (import.meta.main) {
  main();
}
