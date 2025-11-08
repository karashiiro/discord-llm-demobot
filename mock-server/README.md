# Mock OpenAI Server

A simple Express-based mock server that mimics the OpenAI chat completions API for development and testing.

## Purpose

This mock server allows you to develop and test the Discord bot without:
- Incurring OpenAI API costs
- Needing an actual OpenAI API key
- Relying on external services during development

## Features

- **OpenAI-compatible API**: Implements the `/v1/chat/completions` endpoint
- **Echo responses**: Echoes back user messages with a prefix
- **Predictable testing**: Deterministic responses for reliable testing
- **No authentication required**: No API key needed
- **Logging**: Logs all requests for debugging

## Endpoints

### POST /v1/chat/completions
Main chat completions endpoint that mimics OpenAI's API.

**Request format:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response format:**
```json
{
  "id": "chatcmpl-mock-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I received your message: \"Hello!\". This is a mock response from the test server!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### GET /v1/models
Returns a list of available models (for SDK compatibility).

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Mock OpenAI server is running"
}
```

## Usage

### Starting the Server

```bash
# From the project root
npm run mock-server
```

The server will start on `http://localhost:3001` by default.

### Custom Port

You can specify a custom port using the `MOCK_SERVER_PORT` environment variable:

```bash
MOCK_SERVER_PORT=8080 npm run mock-server
```

### Testing the Server

```bash
# Health check
curl http://localhost:3001/health

# Chat completion
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Configuration for Discord Bot

In your `.env` file:

```env
CHAT_ENDPOINT_URL=http://localhost:3001
CHAT_API_KEY=mock-api-key
CHAT_MODEL=gpt-3.5-turbo
```

The API key can be any value - the mock server doesn't validate it.

## Development Workflow

1. Start the mock server in one terminal:
   ```bash
   npm run mock-server
   ```

2. Start the Discord bot in another terminal:
   ```bash
   npm start
   ```

3. Test the `/chat` command in Discord

4. Check the mock server logs to see the requests

## Response Behavior

The mock server provides two types of responses:

1. **Echo mode** (when user sends a message):
   - Returns: `"I received your message: \"<user message>\". This is a mock response from the test server!"`

2. **Random responses** (when no user message):
   - Returns one of several predefined canned responses

## Customization

You can customize the mock responses by editing the `mockResponses` array in `server.js`:

```javascript
const mockResponses = [
  "Your custom response here",
  "Another custom response",
  // Add more responses...
];
```

## Limitations

This is a simple mock server for development only:
- No streaming support
- No authentication/authorization
- No rate limiting
- No conversation state management
- No advanced OpenAI features (function calling, vision, etc.)

For production use, configure a real OpenAI-compatible endpoint.
