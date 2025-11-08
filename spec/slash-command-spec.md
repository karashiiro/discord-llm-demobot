# /chat Slash Command Specification

## Command Definition
- **Name**: `chat`
- **Description**: Start a conversation with an AI assistant
- **Options**:
  - `message` (required, string): The initial message to send to the AI

## Command Registration
The command must be registered with Discord's API using the REST API or discord.js builders.

Example:
```typescript
{
  name: 'chat',
  description: 'Start a conversation with an AI assistant',
  options: [
    {
      name: 'message',
      description: 'Your message to the AI',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ]
}
```

## Execution Flow

### 1. Command Invocation
- User executes `/chat message:"Hello, AI!"`
- Bot receives interaction event

### 2. Initial Response
- Bot defers reply to prevent timeout (interactions must respond within 3 seconds)
- Bot sends initial message to chat endpoint with user's message
- Bot receives AI response

### 3. Thread Creation
- Bot creates a public thread from the interaction message
- Thread name: First 100 characters of user's message (or a default like "Chat with AI")
- Thread is created from the bot's reply message

### 4. Thread Population
- Bot posts the AI's response as the first message in the thread
- The thread's parent message will contain information about:
  - The original author (interaction.user)
  - The original message content

## Error Handling
- **API Timeout**: Notify user if chat endpoint doesn't respond in time
- **API Error**: Display user-friendly error message
- **Invalid Response**: Handle malformed responses from the chat endpoint
- **Rate Limiting**: Handle Discord rate limits gracefully
- **Permission Issues**: Verify bot has permission to create threads

## User Experience
1. User types `/chat` and enters their message
2. Bot shows "thinking" indicator
3. Bot replies with AI response and creates thread
4. User can continue conversation in thread
5. All messages maintain context
