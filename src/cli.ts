import OpenAI from "jsr:@openai/openai@^4.95.1";
import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

const VERSION = "1.9.1";

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
  lite: "gpt-4.1",
  normal: "o4-mini",
};

const model = flags["lite"] ? MODEL_LIST.lite : MODEL_LIST.normal;

const isTranslateMode = flags["english"];
const isReviseMode = flags["revise"];

const exitWithError = (message: string): never => {
  console.error(`Error: ${message}`);
  Deno.exit(1);
};

const generateUserPrompt = () => {
  if (isTranslateMode && isReviseMode) {
    exitWithError(
      "Select one of the options: --english (-e) or --revise (-r).",
    );
  } else if (isTranslateMode) {
    return "Translate the input message into English.";
  } else if (isReviseMode) {
    return "Revise the provided input text in English. If no revision is needed, state that explicitly. Output only the revised version or the message indicating no revision is necessary.";
  }
  return "Remember this: If the input message is in Japanese, translate it into English first. Then, reply only in English. Do not reply in Japanese. Additionally, when using code blocks, always specify the programming language.";
};

const apiKeySchema = z.string();
const apiKeyResult = apiKeySchema.safeParse(Deno.env.get("OPENAI_API_KEY"));

if (!apiKeyResult.success) {
  exitWithError("OPENAI_API_KEY is not set.");
}

const openai = new OpenAI({ apiKey: apiKeyResult.data });

const createCompletionConfig = (
  inputText: string,
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming => {
  const content =
    "You are a programming and system administration assistant named Mohaya. You can help me in English. Please respond accurately and concisely. Do not include any additional output other than the result.";

  const userPrompt = generateUserPrompt();
  const config: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model,
    messages: [
      { role: "system", content },
      {
        role: "user",
        content: `${userPrompt}\n\n========\n\n${inputText}`,
      },
    ],
    stream: true,
  };

  if (model === MODEL_LIST.normal) {
    config.reasoning_effort = "medium";
  }

  return config;
};

const executeChat = async () => {
  const inputText = flags._.join(" ");

  const completionConfig = createCompletionConfig(inputText);

  try {
    const stream = await openai.chat.completions.create(completionConfig);
    const encoder = new TextEncoder();

    for await (const part of stream) {
      const choices = part.choices;
      if (choices.length > 0) {
        if (choices[0].delta.content) {
          await Deno.stdout.write(encoder.encode(choices[0].delta.content));
        }
        if (choices[0].finish_reason !== null) {
          await Deno.stdout.write(encoder.encode("\n"));
          break;
        }
      }
    }
  } catch (error) {
    exitWithError(`Failed to process chat stream: ${error}`);
  }
};

const displayHelp = (): void => {
  console.log(`Usage: mohaya [OPTIONS] [TEXT]

Arguments:
  [TEXT]             The text you want to ask Mohaya.

Options:
  -h, --help         Display this help message.
  -v, --version      Show the current version number.
  -l, --lite         Run using gpt-4.1 (default: o4-mini-medium).
  -e, --english      Translate the input message into English.
  -r, --revise       Revise the input message in English.`);
};

const main = async () => {
  // version command
  if (flags.version) {
    console.log(VERSION);
    Deno.exit(0);
  }
  // help command
  if (flags.help || Deno.args.length === 0) {
    displayHelp();
    Deno.exit(0);
  }

  await executeChat();
};

if (import.meta.main) {
  main();
}
