#!/usr/bin/env node

import OpenAI from 'openai';
import z from "zod";

const VERSION = "0.0.2";

const apiKeySchema = z.string().min(1);
const API_KEY = apiKeySchema.parse(process.env.OPENAI_API_KEY);

const openai = new OpenAI({ apiKey: API_KEY, });

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
        }, {
            role: 'user', content: process.argv.slice(2).join(" ")
        }, {
            role: "user", content: "If the input message is in Japanese, translate it into English first. Then, reply in English only. Do not reply in Japanese. When using code blocks, always specify the programming language."
        },],
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