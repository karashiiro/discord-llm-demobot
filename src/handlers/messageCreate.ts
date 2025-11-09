import { Message, Client } from 'discord.js';
import { ChatService } from '../services/chatService.js';
import { ThreadService } from '../services/threadService.js';
import { chunkMessage } from '../utils/messageChunker.js';

export async function handleMessageCreate(
  message: Message,
  client: Client,
  chatService: ChatService,
  threadService: ThreadService
): Promise<void> {
  try {
    // Check if this message should be processed
    if (!(await threadService.shouldProcessMessage(message, client.user?.id || ''))) {
      return;
    }

    console.log(
      `[MessageHandler] Processing message from ${message.author.id} in thread ${message.channel.id}`
    );

    // Message is in a thread created by our bot and from the original author
    if (!message.channel.isThread()) {
      return;
    }

    const thread = message.channel;

    // Check if this is the first user message (to generate thread name)
    // We'll count user messages (excluding bot messages and the starter message)
    const messages = await thread.messages.fetch({ limit: 10 });
    const userMessages = Array.from(messages.values()).filter(
      (msg: Message) => !msg.author.bot && msg.content
    );

    // If this is the first user message, generate a thread name asynchronously
    if (userMessages.length === 1 && userMessages[0]?.id === message.id) {
      console.log(`[MessageHandler] First user message detected, generating thread name`);

      // Generate thread name asynchronously (don't await - let it run in background)
      chatService
        .generateThreadName(message.content)
        .then(async (threadName) => {
          try {
            await thread.setName(threadName);
            console.log(`[MessageHandler] Thread name updated to: ${threadName}`);
          } catch (error) {
            console.error('[MessageHandler] Failed to update thread name:', error);
          }
        })
        .catch((error) => {
          console.error('[MessageHandler] Error in thread name generation:', error);
        });
    }

    // Build conversation history
    const conversationHistory = await threadService.buildConversationHistory(thread, client);

    // Send initial status message
    let statusMessage = await thread.send('_Thinking..._');

    // Get AI response with status updates
    const response = await chatService.sendChatRequest(conversationHistory, async (status) => {
      try {
        if (status.type === 'retrying' && status.attempt && status.maxAttempts) {
          let statusText = `_Error, retrying (${status.attempt}/${status.maxAttempts})..._`;
          if (status.error) {
            statusText += `\n_${status.error}_`;
          }
          await statusMessage.edit(statusText);
        }
      } catch (error) {
        console.error('[MessageHandler] Failed to update status message:', error);
      }
    });

    // Chunk the response if it's too long
    const chunks = chunkMessage(response);
    console.log(`[MessageHandler] Response split into ${chunks.length} chunk(s)`);

    // Edit the status message with the first chunk of the response
    if (chunks.length > 0) {
      await statusMessage.edit(chunks[0] || '');
    }

    // Send remaining chunks as new messages
    for (let i = 1; i < chunks.length; i++) {
      await thread.send(chunks[i] || '');
    }

    console.log(`[MessageHandler] Sent response in thread ${thread.id}`);
  } catch (error) {
    console.error('[MessageHandler] Error:', error);

    const errorMessage =
      'Sorry, I encountered an error while processing your message. Please try again later.';

    // Try to send error message in the thread
    try {
      if (message.channel.isThread()) {
        await message.channel.send(errorMessage);
      }
    } catch (replyError) {
      console.error('[MessageHandler] Failed to send error message:', replyError);
    }
  }
}
