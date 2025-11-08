import { ThreadChannel, Message, Client } from 'discord.js';
import type { ChatMessage } from '../types/chat.js';

export class ThreadService {
  /**
   * Extract the original author ID from a thread name
   * Thread name format: "Chat - <userID>"
   */
  getThreadAuthorId(thread: ThreadChannel): string | null {
    const match = thread.name.match(/Chat - (\d+)/);
    return match?.[1] ?? null;
  }

  /**
   * Check if a message should be processed by the bot
   */
  shouldProcessMessage(message: Message, _botId: string): boolean {
    // Ignore bot messages
    if (message.author.bot) {
      return false;
    }

    // Check if we're in a thread
    if (!message.channel.isThread()) {
      return false;
    }

    // Extract original author ID from thread name
    const authorId = this.getThreadAuthorId(message.channel);

    if (!authorId) {
      // Not a thread created by our bot
      return false;
    }

    // Verify the message author matches the original author
    return message.author.id === authorId;
  }

  /**
   * Build conversation history from a thread's messages
   */
  async buildConversationHistory(
    thread: ThreadChannel,
    _client: Client,
    limit = 50
  ): Promise<ChatMessage[]> {
    console.log(`[ThreadService] Building conversation history for thread ${thread.id}`);

    // Fetch messages from the thread
    const messages = await thread.messages.fetch({ limit });

    // Sort messages chronologically (oldest first)
    const sortedMessages = Array.from(messages.values()).sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    const conversationHistory: ChatMessage[] = [];

    for (const msg of sortedMessages) {
      // Skip system messages and messages without content
      if (!msg.content || msg.system) {
        continue;
      }

      if (msg.author.bot) {
        // Assume bot messages are assistant responses
        conversationHistory.push({
          role: 'assistant',
          content: msg.content,
        });
      } else {
        // User messages
        conversationHistory.push({
          role: 'user',
          content: msg.content,
        });
      }
    }

    console.log(`[ThreadService] Built history with ${conversationHistory.length} messages`);

    return conversationHistory;
  }

  /**
   * Generate a thread name from a user ID
   */
  generateThreadName(userId: string): string {
    return `Chat - ${userId}`;
  }
}
