# Thread Management Specification

## Thread Creation
When a `/chat` command is executed:
1. Bot creates a public thread from its reply message
2. Thread metadata should store:
   - Original author ID
   - Thread creation timestamp
   - (Optional) Conversation ID for tracking

## Message Filtering

### Eligible Messages
A message in a thread triggers AI response if:
1. The thread was created by this bot
2. The message author matches the original `/chat` command author
3. The message is not from a bot (including our bot)
4. The message is an actual user message (not system messages)

### Verification Process
For each message in a bot-created thread:
```typescript
async function shouldProcessMessage(message: Message): Promise<boolean> {
  // Check if message is from a bot
  if (message.author.bot) return false;

  // Check if we're in a thread
  if (!message.channel.isThread()) return false;

  // Get the thread's starter message (original command)
  const starterMessage = await message.channel.fetchStarterMessage();

  // Verify the original author
  // The starter message is the bot's reply to the slash command
  // We need to track the original author separately
  // This can be done by:
  // 1. Storing author ID in thread name/metadata
  // 2. Checking interaction reply
  // 3. Using a Map/cache to track thread -> author

  return message.author.id === originalAuthorId;
}
```

## Conversation History

### Building Context
When a message is received in a thread:
1. Fetch all messages in the thread (excluding bot messages)
2. Order messages chronologically
3. Build chat history array:
   ```typescript
   [
     { role: 'user', content: 'First message' },
     { role: 'assistant', content: 'First response' },
     { role: 'user', content: 'Second message' },
     { role: 'assistant', content: 'Second response' },
     { role: 'user', content: 'Current message' }
   ]
   ```
4. Send complete history to chat endpoint

### Message Roles
- **user**: Messages from the thread author
- **assistant**: Messages from the bot
- **system**: (Optional) Initial system prompt if needed

## Thread Lifecycle

### Active Threads
- Thread remains active as long as Discord allows
- No automatic archiving by bot
- Let Discord's native thread archiving handle cleanup

### Thread Limits
- Discord has a limit on thread creation
- Consider implementing cooldown if necessary
- Handle rate limits gracefully

## Storage Considerations
For MVP, use in-memory storage:
- Map<threadId, originalAuthorId>
- Clear on bot restart (acceptable for demo)

For production:
- Consider persistent storage (database)
- Track conversation history
- Enable conversation resumption after bot restart
