# Mohaya

A CLI wrapper for the OpenAI Chat API

[![Release](https://github.com/kaiiy/mohaya/actions/workflows/release.yml/badge.svg)](https://github.com/kaiiy/mohaya/actions/workflows/release.yml)

## Requirements

- Homebrew

## Usage

```sh
$ mohaya what is your name
> My name is Mohaya. I am a programming and system administration assistant. How can I assist you today?
```

```sh
$ mohaya -h
Usage: mohaya [OPTIONS] [TEXT]

Arguments:
  [TEXT]             The text you want to ask Mohaya.

Options:
  -h, --help         Display this help message.
  -v, --version      Show the current version number.
  -l, --lite         Run using gpt-4.1 (default: o4-mini-medium).
  -e, --english      Translate the input message into English.
  -r, --revise       Revise the input message in English.
```

## Installation

```sh
brew install kaiiy/tap/mohaya
```

## Development

### Versioning

Change the version in the following files:

- `./dist/mohaya`

  ```sh
  #!/bin/sh

  exec deno run --allow-net --allow-env --no-config 'https://raw.githubusercontent.com/kaiiy/mohaya/refs/tags/{version}/src/cli.ts' "$@"
  ```

- `./src/cli.ts`
  ```ts
  const VERSION = "{version}";
  ```

## License

MIT
