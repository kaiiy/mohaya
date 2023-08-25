#!/usr/bin/env node

import { OpenAI } from 'openai';
import { exit } from 'process';
import { string, safeParse } from "valibot"

const VERSION = "0.0.3";

const apiKeySchema = string()
const apiKeyResult = safeParse(apiKeySchema, process.env.OPENAI_API_KEY)

if (!apiKeyResult.success) {
    console.error("Error: OPENAI_API_KEY is not set.")
    exit(1)
}

const openai = new OpenAI({ apiKey: apiKeyResult.data, });

const main = async () => {
    if (process.argv.length < 3) {
        console.log(`Mohaya: v${VERSION}`)
        console.log("Usage: `mohaya [some text]`")
        process.exit(0);
    }

    const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
            role: "system", content: "You are a programming and system administration assistant, Mohaya.",
        },
        {
            role: "user", content: "Remember this: If the input message is in Japanese, translate it into English first. Then, reply in English only. Do not reply in Japanese. When using code blocks, always specify the programming language."
        }, {
            role: 'user', content: process.argv.slice(2).join(" ")
        }],
        stream: true,
    });
    for await (const part of stream) {
        const choices = part.choices;
        if (choices.length > 0
            && choices[0].finish_reason === null
            && choices[0].delta.content) {
            {
                process.stdout.write(choices[0].delta.content);
            }
        } else if (choices[0].finish_reason !== null) {
            console.log()
            break;
        }
    }
}


main();