# Chat Endpoint Integration Specification

## OpenAI-Compatible API

### Endpoint Format
The bot should work with any OpenAI-compatible chat completion endpoint following this format:

```
POST {CHAT_ENDPOINT_URL}/v1/chat/completions
```

### Request Format
```typescript
interface ChatCompletionRequest {
  model: string;  // e.g., "gpt-3.5-turbo", or any model supported by the endpoint
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;  // For MVP: false, future: support streaming
}
```

### Request Headers
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${CHAT_API_KEY}`,  // If API key is required
}
```

### Response Format
```typescript
interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

## Implementation

### HTTP Client
Use native fetch API (Node 18+) or a library like axios:

```typescript
async function sendChatRequest(
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${process.env.CHAT_ENDPOINT_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CHAT_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL || 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

## Configuration

### Environment Variables
- `CHAT_ENDPOINT_URL`: Base URL of the chat endpoint (e.g., "https://api.openai.com")
- `CHAT_API_KEY`: API authentication key (optional, depends on endpoint)
- `CHAT_MODEL`: Model to use (default: "gpt-3.5-turbo")
- `CHAT_TEMPERATURE`: Temperature setting (default: 0.7)
- `CHAT_MAX_TOKENS`: Max tokens per response (default: 1000)

## Error Handling

### Network Errors
- Timeout after 30 seconds
- Retry logic for transient failures (optional)
- User-friendly error messages

### API Errors
- 401 Unauthorized: Invalid API key
- 429 Too Many Requests: Rate limit exceeded
- 500 Server Error: Endpoint issues
- 400 Bad Request: Invalid request format

### Error Response to User
```
"Sorry, I encountered an error while processing your message. Please try again later."
```

## Rate Limiting
- Implement per-user rate limiting if needed
- Respect endpoint rate limits
- Queue requests if necessary

## Future Enhancements
- Streaming responses
- Token usage tracking
- Multiple model support
- Custom system prompts per thread
- Message length validation
- Content filtering
