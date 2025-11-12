# Discord LLM Demo Bot

Test LLMs in threads, on Discord.

A Discord bot that provides AI chat functionality through a `/chat` slash command, enabling users to have threaded conversations with any OpenAI-compatible LLM endpoint.

## Features

- **Slash Command Interface**: Users initiate conversations with `/chat`
- **Threaded Conversations**: Each conversation occurs in its own thread
- **Context Awareness**: The bot maintains conversation history within threads
- **OpenAI-Compatible**: Works with any OpenAI-compatible chat endpoint

## Prerequisites

- Node.js 18.0.0 or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))
- An OpenAI-compatible API endpoint (OpenAI, Azure OpenAI, local LLM server, etc.)
  - **For development/testing**: Use the included mock server (no API key required)
  - **For production**: Use a real OpenAI-compatible endpoint

## Deployment

### NixOS

For NixOS users, see [NIXOS_DEPLOYMENT.md](./NIXOS_DEPLOYMENT.md) for a complete guide on deploying this bot as a systemd service with proper secrets management.

## Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/karashiiro/discord-llm-demobot.git
cd discord-llm-demobot
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# Chat API Configuration
CHAT_ENDPOINT_URL=https://api.openai.com
CHAT_API_KEY=your_openai_api_key_here
CHAT_MODEL=gpt-3.5-turbo
CHAT_TEMPERATURE=0.7
CHAT_MAX_TOKENS=1000
```

### 3. Build the Project

```bash
npm run build
```

### 4. Deploy Slash Commands

Register the `/chat` command with Discord:

```bash
npm run deploy-commands
```

### 5. Start the Bot

```bash
npm start
```

## Development

### Using the Mock Server

For development and testing without API costs, use the included mock server:

1. **Start the mock server** (in one terminal):
   ```bash
   npm run mock-server
   ```

2. **Configure your `.env`** to use the mock server:
   ```env
   CHAT_ENDPOINT_URL=http://localhost:3001
   CHAT_API_KEY=mock-api-key
   ```

3. **Start the bot** (in another terminal):
   ```bash
   npm start
   ```

The mock server will echo your messages back with a prefix, allowing you to test the full bot workflow without making real API calls.

For more details, see [mock-server/README.md](mock-server/README.md).

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm start` - Start the bot
- `npm run mock-server` - Start the mock OpenAI server for testing
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is formatted
- `npm run typecheck` - Type check without emitting files
- `npm run deploy-commands` - Deploy slash commands to Discord

### Project Structure

```
discord-llm-demobot/
├── spec/                 # Specification documents
├── src/                  # TypeScript source code
│   ├── index.ts         # Entry point
│   ├── bot.ts           # Bot initialization
│   ├── commands/        # Slash command handlers
│   ├── handlers/        # Event handlers
│   ├── services/        # Business logic
│   ├── types/           # Type definitions
│   └── utils/           # Utilities
├── mock-server/         # Mock OpenAI server for development
│   ├── server.js        # Express server
│   └── README.md        # Mock server documentation
├── dist/                # Compiled JavaScript output
└── package.json         # Project metadata
```

## Usage

1. Invite the bot to your Discord server with the following permissions:
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Use Slash Commands

2. In any channel, use the `/chat` command:
   ```
   /chat message: Hello, how are you?
   ```

3. The bot will respond and create a thread for the conversation

4. Continue the conversation by sending messages in the thread

## Discord Bot Setup Guide

### Creating a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under the bot's username, click "Reset Token" to get your `DISCORD_TOKEN`
5. Enable the following Privileged Gateway Intents:
   - Message Content Intent (required to read message content in threads)
6. Go to the "OAuth2" section, and copy the "Client ID" for `DISCORD_CLIENT_ID`

### Inviting the Bot to Your Server

Generate an invite URL:
1. Go to OAuth2 → URL Generator
2. Select scopes: `bot` and `applications.commands`
3. Select permissions:
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Use Slash Commands
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DISCORD_TOKEN` | Yes | Discord bot token | - |
| `DISCORD_CLIENT_ID` | Yes | Discord application client ID | - |
| `CHAT_ENDPOINT_URL` | Yes | OpenAI-compatible API endpoint URL | - |
| `CHAT_API_KEY` | No | API key for authentication | - |
| `CHAT_MODEL` | No | Model to use for chat completions | `gpt-3.5-turbo` |
| `CHAT_TEMPERATURE` | No | Temperature for response generation | `0.7` |
| `CHAT_MAX_TOKENS` | No | Maximum tokens per response | `1000` |

## License

MIT
