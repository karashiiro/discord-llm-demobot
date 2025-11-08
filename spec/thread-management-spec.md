# Thread Management Specification

## Thread Creation
When a `/chat` command is executed:
1. Bot creates a public thread from its reply message
2. Thread name includes the user ID for easy lookup: `Chat - <userID>`
   - This allows on-demand verification of the original author
   - No in-memory state required

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

  // Extract original author ID from thread name
  // Thread name format: "Chat - <userID>"
  const threadName = message.channel.name;
  const userIdMatch = threadName.match(/Chat - (\d+)/);

  if (!userIdMatch) {
    // Not a thread created by our bot
    return false;
  }

  const originalAuthorId = userIdMatch[1];

  // Verify the message author matches the original author
  return message.author.id === originalAuthorId;
}
```

**Alternative Approach**: Instead of encoding in the thread name, you could:
1. Fetch the thread's starter message
2. Check if it's from the bot
3. Look for a mention or reference to the original user in that message
4. This keeps thread names clean but requires an additional API call

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

## On-Demand Lookup Strategy

### No State Storage Required
The bot uses Discord's native data structures to verify message eligibility:

**Approach 1: Thread Name Encoding (Recommended for simplicity)**
- Encode user ID in thread name: `Chat - <userID>`
- Extract user ID via regex when validating messages
- No additional API calls needed
- Survives bot restarts automatically

**Approach 2: Starter Message Lookup (Cleaner UX)**
- Fetch the thread's starter message
- Include user mention or ID in the starter message content
- Parse the message to extract original author
- Requires one additional API call per message validation
- Keeps thread names user-friendly

**Approach 3: Message History Scan**
- When validating, fetch the first few messages in the thread
- The oldest message from a non-bot user is the original author
- More resilient but requires fetching message history
- Best for threads where name encoding isn't desirable

### Benefits of On-Demand Lookup
- No in-memory state to manage
- Bot restarts don't lose thread ownership data
- Scales without memory concerns
- Thread information is self-contained
- No synchronization issues across instances
