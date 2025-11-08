import { ThreadChannel, Message, Client } from 'discord.js';
import type { ChatMessage } from '../types/chat.js';

export class ThreadService {
  /**
   * Extract the original author ID from the thread's starter message
   * Uses the interaction metadata from the starter message to get the user who created the thread
   */
  async getThreadAuthorId(thread: ThreadChannel): Promise<string | null> {
    try {
      // Fetch the starter message (the bot's message that started the thread)
      const starterMessage = await thread.fetchStarterMessage();

      if (!starterMessage) {
        console.log(`[ThreadService] No starter message found for thread ${thread.id}`);
        return null;
      }

      // Get the user from the interaction metadata
      // The starter message is a reply to an interaction, so it has interactionMetadata
      const interactionUser =
        starterMessage.interactionMetadata?.user || starterMessage.interaction?.user;

      if (!interactionUser) {
        console.log(`[ThreadService] No interaction metadata found for thread ${thread.id}`);
        return null;
      }

      return interactionUser.id;
    } catch (error) {
      console.error(
        `[ThreadService] Error fetching thread author ID for thread ${thread.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Check if a message should be processed by the bot
   */
  async shouldProcessMessage(message: Message, _botId: string): Promise<boolean> {
    // Ignore bot messages
    if (message.author.bot) {
      return false;
    }

    // Check if we're in a thread
    if (!message.channel.isThread()) {
      return false;
    }

    // Extract original author ID from the thread's starter message
    const authorId = await this.getThreadAuthorId(message.channel);

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
   * Generate a thread name
   * Note: The user ID is no longer stored in the thread name.
   * Instead, it's retrieved from the starter message's interaction metadata.
   */
  generateThreadName(): string {
    return 'Chat';
  }
}
