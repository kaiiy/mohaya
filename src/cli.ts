import OpenAI from "jsr:@openai/openai@^4.95.1";
import { z } from "https://deno.land/x/zod@v3.24.4/mod.ts";
import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

const VERSION = "1.11.0" as const;
const MODEL: OpenAI.ChatModel = "gpt-5-mini";

const flags = parseArgs(Deno.args, {
  alias: {
    h: "help",
    v: "version",
    V: "version",
    e: "english",
    r: "revise",
  },
  boolean: ["help", "version", "english", "revise"],
});

const isTranslateMode = flags["english"];
const isReviseMode = flags["revise"];

const exitWithError = (message: string): never => {
  console.error(`Error: ${message}`);
  Deno.exit(1);
};

const generateUserPrompt = () => {
  if (isTranslateMode) {
    return "Translate the input message into English.";
  } else if (isReviseMode) {
    return "Please revise the given English text. Your output must be exactly one of these two formats:\n\nIf a revision is needed:\n- Reason for revision: [brief reason]\n- Revised version: [improved text]\n\nIf no revision is needed:\n- No revision needed.\n\nDo not include any other comments or explanations.";
  }
  return "Remember this: If the input message is in Japanese, translate it into English first. Then, reply only in English. Do not reply in Japanese. Additionally, when using code blocks, always specify the programming language.";
};

const apiKeySchema = z.string();
const apiKeyResult = apiKeySchema.safeParse(Deno.env.get("OPENAI_API_KEY"));

if (!apiKeyResult.success) {
  exitWithError("OPENAI_API_KEY is not set.");
}

const openai = new OpenAI({ apiKey: apiKeyResult.data });

const executeChat = async (inputText: string) => {
  const instructions =
    "You are a programming and system administration assistant named Mohaya. You can help me in English. Please respond accurately and concisely. Do not include any additional output other than the result.";
  const userPrompt = generateUserPrompt();

  try {
    const stream = await openai.responses.create(
      {
        model: MODEL,
        instructions: instructions,
        input: `${userPrompt}\n\n========\n\n${inputText}`,
        stream: true,
        reasoning: {
          effort: "medium", // for a reasoning model (e.g., o4-mini)
        },
      },
    );
    const encoder = new TextEncoder();

    for await (const part of stream) {
      const type = part.type;
      if (type === "response.output_text.delta") {
        const delta = part.delta;
        await Deno.stdout.write(encoder.encode(delta));
      } else if (type === "response.completed") {
        await Deno.stdout.write(encoder.encode("\n"));
        break;
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
  -e, --english      Translate the input message into English.
  -r, --revise       Revise the input message in English.`);
};

const isSingleFlag = (): boolean =>
  [flags.help, flags.version, flags.english, flags.revise].filter(Boolean)
    .length <= 1;

const main = async () => {
  if (!isSingleFlag()) {
    exitWithError("You can only use one of the options.");
  }

  if (flags.version) {
    console.log(VERSION);
    Deno.exit(0);
  }
  if (flags.help || Deno.args.length === 0) {
    displayHelp();
    Deno.exit(0);
  }

  const inputText = flags._.join(" ");
  await executeChat(inputText);
};

if (import.meta.main) {
  main();
}
