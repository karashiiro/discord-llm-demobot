# Discord LLM Demo Bot - Project Overview

## Purpose
A Discord bot that provides AI chat functionality through a `/chat` slash command, enabling users to have threaded conversations with an OpenAI-compatible LLM endpoint.

## Core Functionality
1. Respond to `/chat` slash command
2. Create threaded conversations
3. Maintain conversation context within threads
4. Integrate with OpenAI-compatible chat endpoints

## Key Features
- **Slash Command Interface**: Users initiate conversations with `/chat`
- **Thread-based Conversations**: Each conversation occurs in its own thread
- **Context Awareness**: The bot tracks conversation history within threads
- **Message Attribution**: Only messages from the original command author continue the conversation
- **LLM Integration**: Connects to any OpenAI-compatible chat API

## Technology Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **Discord Library**: discord.js
- **Build Tools**: TypeScript compiler
- **Code Quality**: ESLint + Prettier
- **HTTP Client**: (TBD - fetch, axios, etc.)

## Environment Variables
- `DISCORD_TOKEN`: Bot authentication token
- `DISCORD_CLIENT_ID`: Discord application client ID
- `CHAT_ENDPOINT_URL`: URL of the OpenAI-compatible chat endpoint
- `CHAT_API_KEY`: (Optional) API key for the chat endpoint

## Project Structure
```
discord-llm-demobot/
├── spec/                 # Specification documents
├── src/                  # TypeScript source code
│   ├── index.ts         # Entry point
│   ├── bot.ts           # Bot initialization and setup
│   ├── commands/        # Slash command handlers
│   ├── handlers/        # Event handlers
│   └── services/        # Business logic (chat API, thread management)
├── dist/                # Compiled JavaScript output
├── package.json         # Project metadata and dependencies
├── tsconfig.json        # TypeScript configuration
├── .eslintrc.json       # ESLint configuration
└── .prettierrc          # Prettier configuration
```
