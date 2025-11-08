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
    if (!threadService.shouldProcessMessage(message, client.user?.id || '')) {
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

    // Send typing indicator
    await thread.sendTyping();

    // Build conversation history
    const conversationHistory = await threadService.buildConversationHistory(
      thread,
      client
    );

    // Get AI response
    const response = await chatService.sendChatRequest(conversationHistory);

    // Chunk the response if it's too long
    const chunks = chunkMessage(response);
    console.log(`[MessageHandler] Response split into ${chunks.length} chunk(s)`);

    // Send all chunks in the thread
    for (const chunk of chunks) {
      await thread.send(chunk);
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
