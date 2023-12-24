import { OpenAI } from "https://deno.land/x/openai@v4.24.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const VERSION = "0.2.2";
const MODEL = "gpt-3.5-turbo";

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
  model: MODEL,
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

const main = async () => {
  if (Deno.args.length === 0) {
    console.log(`Mohaya: v${VERSION}`);
    console.log("Usage: `mohaya <text>`");
    Deno.exit(0);
  }

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

main();
