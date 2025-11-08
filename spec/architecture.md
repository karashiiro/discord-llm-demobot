# Architecture Specification

## System Architecture

### High-Level Flow
```
Discord User
    ↓
[/chat command]
    ↓
Discord Gateway
    ↓
Bot (discord.js)
    ↓
Command Handler
    ↓
Chat Service → OpenAI-Compatible API
    ↓
Thread Creation
    ↓
Response in Thread
```

### Message Flow in Thread
```
User sends message in thread
    ↓
Discord Gateway
    ↓
Bot (discord.js)
    ↓
Message Event Handler
    ↓
Thread Validator
    ↓
Conversation History Builder
    ↓
Chat Service → OpenAI-Compatible API
    ↓
Response in Thread
```

## Module Structure

### 1. Entry Point (`src/index.ts`)
- Load environment variables
- Initialize bot
- Handle graceful shutdown

### 2. Bot Initialization (`src/bot.ts`)
- Create Discord client
- Register event handlers
- Deploy slash commands
- Start bot

### 3. Command Handlers (`src/commands/`)
- `chat.ts`: Handles `/chat` command execution
  - Parse command options
  - Call chat service
  - Create thread
  - Post response

### 4. Event Handlers (`src/handlers/`)
- `messageCreate.ts`: Handles new messages
  - Filter messages (bot created thread, correct author)
  - Build conversation history
  - Call chat service
  - Post response
- `ready.ts`: Handles bot ready event
  - Log bot status
  - Set bot presence/activity

### 5. Services (`src/services/`)
- `chatService.ts`: Chat API integration
  - Send requests to OpenAI-compatible endpoint
  - Handle errors
  - Parse responses
- `threadService.ts`: Thread management
  - Track thread ownership
  - Build conversation history
  - Validate message eligibility
- `commandDeployer.ts`: Deploy slash commands
  - Register commands with Discord API

### 6. Types (`src/types/`)
- `chat.ts`: Chat-related type definitions
- `discord.ts`: Discord-specific type extensions

### 7. Utilities (`src/utils/`)
- `config.ts`: Configuration and environment validation
- `logger.ts`: Logging utility (optional)

## Data Flow

### Command Execution
1. User invokes `/chat` with message
2. Discord sends interaction to bot
3. Bot defers reply (prevents timeout)
4. Bot extracts message from command options
5. Bot sends message to chat service
6. Chat service calls OpenAI-compatible API
7. Bot receives response
8. Bot edits deferred reply with response
9. Bot creates thread from reply
10. Bot stores thread ID → author ID mapping

### Thread Conversation
1. User sends message in thread
2. Discord sends message event to bot
3. Bot validates:
   - Is this a thread created by the bot?
   - Is the author the original command user?
   - Is the message from a human (not bot)?
4. If valid:
   - Bot fetches all messages in thread
   - Bot builds conversation history
   - Bot sends history to chat service
   - Chat service calls OpenAI-compatible API
   - Bot receives response
   - Bot posts response in thread
5. If invalid: Ignore message

## State Management

### In-Memory Storage
```typescript
// Thread ID to original author ID mapping
const threadOwners = new Map<string, string>();

// Store when thread is created
threadOwners.set(threadId, userId);

// Retrieve when message is received
const ownerId = threadOwners.get(threadId);
```

### Limitations
- State lost on bot restart
- Not suitable for production scale
- Consider Redis or database for production

## Error Handling Strategy

### Graceful Degradation
1. Always respond to user (never leave hanging)
2. Log errors for debugging
3. Generic error messages (don't expose internals)
4. Fail fast on startup issues (missing env vars)

### Error Types
- **Configuration Errors**: Missing/invalid environment variables → Exit on startup
- **Discord API Errors**: Rate limits, permissions → Inform user, log error
- **Chat API Errors**: Timeout, invalid response → Inform user, retry once
- **Runtime Errors**: Unexpected exceptions → Log, inform user, continue bot operation

## Security Considerations

### Input Validation
- Validate all user inputs
- Sanitize message content if needed
- Limit message length for API calls

### Credential Management
- Store tokens/keys in environment variables
- Never log sensitive information
- Use `.env` for local development (already in .gitignore)

### Rate Limiting
- Respect Discord rate limits (handled by discord.js)
- Implement user-level rate limiting if needed
- Consider cooldowns on command usage

## Performance Considerations

### Message Fetching
- Limit conversation history depth (e.g., last 50 messages)
- Cache thread messages if needed
- Paginate message fetching for long threads

### API Calls
- Set reasonable timeouts (30 seconds)
- Don't block Discord event loop
- Use async/await properly

### Memory Management
- Clear old thread mappings periodically
- Limit cache sizes
- Monitor memory usage in production

## Deployment Considerations

### Environment Setup
- Node.js 18+ (for native fetch support)
- Environment variables properly configured
- Proper logging for debugging

### Process Management
- Use process manager (PM2, systemd, Docker)
- Handle signals for graceful shutdown
- Reconnect on disconnect

### Monitoring
- Log important events
- Track error rates
- Monitor API usage
