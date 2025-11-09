import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ThreadService } from '../threadService.js';
import { Message, ThreadChannel, User, Client, Collection } from 'discord.js';

/**
 * Tests for ThreadService - Thread-based User Isolation
 *
 * These tests ensure that:
 * 1. Only the original chat command user receives responses in their thread
 * 2. Other users cannot interact with someone else's thread
 * 3. Messages outside of threads are ignored
 */
describe('ThreadService - Thread-based User Isolation', () => {
  let threadService: ThreadService;
  const ORIGINAL_USER_ID = 'user-123';
  const OTHER_USER_ID = 'user-456';
  const BOT_ID = 'bot-789';

  beforeEach(() => {
    threadService = new ThreadService();
  });

  /**
   * Helper function to create a mock thread channel with a starter message
   */
  function createMockThread(authorId: string): ThreadChannel {
    const mockInteractionUser = {
      id: authorId,
      bot: false,
    } as User;

    const mockInteractionMetadata = {
      user: mockInteractionUser,
    };

    const mockStarterMessage = {
      interactionMetadata: mockInteractionMetadata,
      interaction: {
        user: mockInteractionUser,
      },
    } as unknown as Message;

    const mockThread = {
      id: 'thread-123',
      isThread: () => true,
      fetchStarterMessage: jest.fn(async () => mockStarterMessage),
    } as unknown as ThreadChannel;

    return mockThread;
  }

  /**
   * Helper function to create a mock message
   */
  function createMockMessage(
    userId: string,
    isBot: boolean,
    channel: ThreadChannel | null,
    content = 'test message',
    isSystem = false
  ): Message {
    return {
      author: {
        id: userId,
        bot: isBot,
      } as User,
      content,
      system: isSystem,
      channel: channel || {
        isThread: () => false,
      },
    } as unknown as Message;
  }

  describe('shouldProcessMessage - Thread Creator Isolation', () => {
    it('should process messages from the original thread creator', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const message = createMockMessage(ORIGINAL_USER_ID, false, thread);

      // Act
      const result = await threadService.shouldProcessMessage(message, BOT_ID);

      // Assert
      expect(result).toBe(true);
    });

    it('should NOT process messages from users other than the thread creator', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const message = createMockMessage(OTHER_USER_ID, false, thread);

      // Act
      const result = await threadService.shouldProcessMessage(message, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT process messages from multiple different users in the same thread', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const messageFromOtherUser1 = createMockMessage('user-999', false, thread);
      const messageFromOtherUser2 = createMockMessage('user-888', false, thread);

      // Act
      const result1 = await threadService.shouldProcessMessage(messageFromOtherUser1, BOT_ID);
      const result2 = await threadService.shouldProcessMessage(messageFromOtherUser2, BOT_ID);

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('shouldProcessMessage - Thread vs Non-Thread', () => {
    it('should NOT process messages outside of threads', async () => {
      // Arrange - Message not in a thread
      const message = createMockMessage(ORIGINAL_USER_ID, false, null);

      // Act
      const result = await threadService.shouldProcessMessage(message, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });

    it('should only process messages inside threads', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const messageInThread = createMockMessage(ORIGINAL_USER_ID, false, thread);
      const messageOutsideThread = createMockMessage(ORIGINAL_USER_ID, false, null);

      // Act
      const resultInThread = await threadService.shouldProcessMessage(messageInThread, BOT_ID);
      const resultOutsideThread = await threadService.shouldProcessMessage(
        messageOutsideThread,
        BOT_ID
      );

      // Assert
      expect(resultInThread).toBe(true);
      expect(resultOutsideThread).toBe(false);
    });
  });

  describe('shouldProcessMessage - Bot and System Messages', () => {
    it('should NOT process bot messages', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const botMessage = createMockMessage(BOT_ID, true, thread);

      // Act
      const result = await threadService.shouldProcessMessage(botMessage, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT process system messages', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const systemMessage = createMockMessage(ORIGINAL_USER_ID, false, thread, 'System', true);

      // Act
      const result = await threadService.shouldProcessMessage(systemMessage, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT process messages without content', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);
      const emptyMessage = createMockMessage(ORIGINAL_USER_ID, false, thread, '');

      // Act
      const result = await threadService.shouldProcessMessage(emptyMessage, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('shouldProcessMessage - Thread Without Metadata', () => {
    it('should NOT process messages in threads without interaction metadata', async () => {
      // Arrange - Thread without proper starter message metadata
      const mockThread = {
        id: 'thread-without-metadata',
        isThread: () => true,
        fetchStarterMessage: jest.fn(async () => null),
      } as unknown as ThreadChannel;

      const message = createMockMessage(ORIGINAL_USER_ID, false, mockThread);

      // Act
      const result = await threadService.shouldProcessMessage(message, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT process messages when starter message has no interaction data', async () => {
      // Arrange
      const mockStarterMessage = {
        interactionMetadata: null,
        interaction: null,
      } as unknown as Message;

      const mockThread = {
        id: 'thread-no-interaction',
        isThread: () => true,
        fetchStarterMessage: jest.fn(async () => mockStarterMessage),
      } as unknown as ThreadChannel;

      const message = createMockMessage(ORIGINAL_USER_ID, false, mockThread);

      // Act
      const result = await threadService.shouldProcessMessage(message, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('shouldProcessMessage - Error Handling', () => {
    it('should return false when fetchStarterMessage throws an error', async () => {
      // Arrange
      const mockThread = {
        id: 'thread-error',
        isThread: () => true,
        fetchStarterMessage: jest.fn(async () => {
          throw new Error('Failed to fetch starter message');
        }),
      } as unknown as ThreadChannel;

      const message = createMockMessage(ORIGINAL_USER_ID, false, mockThread);

      // Act
      const result = await threadService.shouldProcessMessage(message, BOT_ID);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getThreadAuthorId', () => {
    it('should correctly extract the author ID from interaction metadata', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);

      // Act
      const authorId = await threadService.getThreadAuthorId(thread);

      // Assert
      expect(authorId).toBe(ORIGINAL_USER_ID);
    });

    it('should return null when starter message is not found', async () => {
      // Arrange
      const mockThread = {
        id: 'thread-no-starter',
        fetchStarterMessage: jest.fn(async () => null),
      } as unknown as ThreadChannel;

      // Act
      const authorId = await threadService.getThreadAuthorId(mockThread);

      // Assert
      expect(authorId).toBeNull();
    });

    it('should return null when interaction metadata is missing', async () => {
      // Arrange
      const mockStarterMessage = {
        interactionMetadata: null,
        interaction: null,
      } as unknown as Message;

      const mockThread = {
        id: 'thread-no-metadata',
        fetchStarterMessage: jest.fn(async () => mockStarterMessage),
      } as unknown as ThreadChannel;

      // Act
      const authorId = await threadService.getThreadAuthorId(mockThread);

      // Assert
      expect(authorId).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      // Arrange
      const mockThread = {
        id: 'thread-error',
        fetchStarterMessage: jest.fn(async () => {
          throw new Error('Network error');
        }),
      } as unknown as ThreadChannel;

      // Act
      const authorId = await threadService.getThreadAuthorId(mockThread);

      // Assert
      expect(authorId).toBeNull();
    });
  });

  describe('Integration Tests - Multiple Scenarios', () => {
    it('should handle a realistic scenario with multiple users trying to use the same thread', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);

      const messageFromCreator = createMockMessage(ORIGINAL_USER_ID, false, thread, 'Hello!');
      const messageFromIntruder1 = createMockMessage(
        OTHER_USER_ID,
        false,
        thread,
        'Can I join?'
      );
      const messageFromIntruder2 = createMockMessage('user-999', false, thread, 'Me too!');
      const anotherMessageFromCreator = createMockMessage(
        ORIGINAL_USER_ID,
        false,
        thread,
        'More text'
      );

      // Act & Assert
      expect(await threadService.shouldProcessMessage(messageFromCreator, BOT_ID)).toBe(true);
      expect(await threadService.shouldProcessMessage(messageFromIntruder1, BOT_ID)).toBe(false);
      expect(await threadService.shouldProcessMessage(messageFromIntruder2, BOT_ID)).toBe(false);
      expect(await threadService.shouldProcessMessage(anotherMessageFromCreator, BOT_ID)).toBe(
        true
      );
    });

    it('should correctly handle edge cases in sequence', async () => {
      // Arrange
      const thread = createMockThread(ORIGINAL_USER_ID);

      const botMessage = createMockMessage(BOT_ID, true, thread);
      const systemMessage = createMockMessage(ORIGINAL_USER_ID, false, thread, 'System', true);
      const emptyMessage = createMockMessage(ORIGINAL_USER_ID, false, thread, '');
      const validMessage = createMockMessage(ORIGINAL_USER_ID, false, thread, 'Valid');

      // Act & Assert - Should only process the valid message
      expect(await threadService.shouldProcessMessage(botMessage, BOT_ID)).toBe(false);
      expect(await threadService.shouldProcessMessage(systemMessage, BOT_ID)).toBe(false);
      expect(await threadService.shouldProcessMessage(emptyMessage, BOT_ID)).toBe(false);
      expect(await threadService.shouldProcessMessage(validMessage, BOT_ID)).toBe(true);
    });
  });

  describe('buildConversationHistory', () => {
    const mockClient = {} as Client;

    /**
     * Helper function to create a message for conversation history tests
     */
    function createHistoryMessage(
      content: string,
      isBot: boolean,
      timestamp: number,
      isSystem = false
    ): Message {
      return {
        content,
        author: {
          bot: isBot,
        } as User,
        system: isSystem,
        createdTimestamp: timestamp,
      } as Message;
    }

    /**
     * Helper function to create a thread with messages
     */
    function createThreadWithMessages(messages: Message[]): ThreadChannel {
      const messageCollection = new Collection<string, Message>();
      messages.forEach((msg, index) => {
        messageCollection.set(`msg-${index}`, msg);
      });

      return {
        id: 'thread-123',
        messages: {
          fetch: jest.fn(async () => messageCollection),
        },
      } as any;
    }

    describe('Message Fetching and Conversion', () => {
      it('should fetch messages and convert to ChatMessage format', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('Hello', false, 1000),
          createHistoryMessage('Hi there!', true, 2000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ role: 'user', content: 'Hello' });
        expect(result[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
      });

      it('should correctly assign user role to non-bot messages', async () => {
        // Arrange
        const messages = [createHistoryMessage('User message', false, 1000)];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]?.role).toBe('user');
        expect(result[0]?.content).toBe('User message');
      });

      it('should correctly assign assistant role to bot messages', async () => {
        // Arrange
        const messages = [createHistoryMessage('Bot response', true, 1000)];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]?.role).toBe('assistant');
        expect(result[0]?.content).toBe('Bot response');
      });
    });

    describe('Chronological Sorting', () => {
      it('should sort messages chronologically (oldest first)', async () => {
        // Arrange - Messages in reverse order
        const messages = [
          createHistoryMessage('Third', false, 3000),
          createHistoryMessage('First', false, 1000),
          createHistoryMessage('Second', true, 2000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0]?.content).toBe('First');
        expect(result[1]?.content).toBe('Second');
        expect(result[2]?.content).toBe('Third');
      });

      it('should handle messages with same timestamp', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('Message A', false, 1000),
          createHistoryMessage('Message B', true, 1000),
          createHistoryMessage('Message C', false, 1000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(3);
        // Should maintain stable sort for equal timestamps
      });
    });

    describe('Message Filtering', () => {
      it('should skip system messages', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('User message', false, 1000),
          createHistoryMessage('Thread renamed', false, 2000, true),
          createHistoryMessage('Bot response', true, 3000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]?.content).toBe('User message');
        expect(result[1]?.content).toBe('Bot response');
      });

      it('should skip messages with empty content', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('Valid message', false, 1000),
          createHistoryMessage('', false, 2000),
          createHistoryMessage('Another valid', true, 3000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]?.content).toBe('Valid message');
        expect(result[1]?.content).toBe('Another valid');
      });

      it('should skip both system messages and empty content', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('Valid', false, 1000),
          createHistoryMessage('', false, 2000),
          createHistoryMessage('System msg', false, 3000, true),
          createHistoryMessage('', true, 4000),
          createHistoryMessage('Valid bot', true, 5000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]?.content).toBe('Valid');
        expect(result[1]?.content).toBe('Valid bot');
      });
    });

    describe('Message Limit', () => {
      it('should respect custom message limit', async () => {
        // Arrange
        const messages = Array.from({ length: 100 }, (_, i) =>
          createHistoryMessage(`Message ${i}`, false, i * 1000)
        );
        const thread = createThreadWithMessages(messages);

        // Act
        await threadService.buildConversationHistory(thread, mockClient, 10);

        // Assert
        // The fetch is called with limit 10, so thread will only have those messages
        expect(thread.messages.fetch).toHaveBeenCalledWith({ limit: 10 });
      });

      it('should use default limit of 50 when not specified', async () => {
        // Arrange
        const messages = [createHistoryMessage('Test', false, 1000)];
        const thread = createThreadWithMessages(messages);

        // Act
        await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(thread.messages.fetch).toHaveBeenCalledWith({ limit: 50 });
      });
    });

    describe('Edge Cases', () => {
      it('should return empty array for thread with no messages', async () => {
        // Arrange
        const thread = createThreadWithMessages([]);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when all messages are filtered out', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('', false, 1000),
          createHistoryMessage('System', false, 2000, true),
          createHistoryMessage('', true, 3000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle alternating user and bot messages', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('User 1', false, 1000),
          createHistoryMessage('Bot 1', true, 2000),
          createHistoryMessage('User 2', false, 3000),
          createHistoryMessage('Bot 2', true, 4000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(4);
        expect(result[0]?.role).toBe('user');
        expect(result[1]?.role).toBe('assistant');
        expect(result[2]?.role).toBe('user');
        expect(result[3]?.role).toBe('assistant');
      });

      it('should handle consecutive messages from same role', async () => {
        // Arrange
        const messages = [
          createHistoryMessage('User 1', false, 1000),
          createHistoryMessage('User 2', false, 2000),
          createHistoryMessage('Bot 1', true, 3000),
          createHistoryMessage('Bot 2', true, 4000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(4);
        expect(result[0]?.role).toBe('user');
        expect(result[1]?.role).toBe('user');
        expect(result[2]?.role).toBe('assistant');
        expect(result[3]?.role).toBe('assistant');
      });
    });

    describe('Integration', () => {
      it('should handle realistic conversation with mixed content', async () => {
        // Arrange - Realistic conversation with some noise
        const messages = [
          createHistoryMessage('', false, 100, true), // System message to skip
          createHistoryMessage('Hello, I need help', false, 1000),
          createHistoryMessage('Hi! How can I assist you?', true, 2000),
          createHistoryMessage('Thread updated', false, 2500, true), // System message
          createHistoryMessage('I have a question about TypeScript', false, 3000),
          createHistoryMessage('', false, 3500), // Empty message to skip
          createHistoryMessage('Sure! What would you like to know?', true, 4000),
          createHistoryMessage('How do interfaces work?', false, 5000),
        ];
        const thread = createThreadWithMessages(messages);

        // Act
        const result = await threadService.buildConversationHistory(thread, mockClient);

        // Assert
        expect(result).toHaveLength(5);
        expect(result[0]).toEqual({ role: 'user', content: 'Hello, I need help' });
        expect(result[1]).toEqual({ role: 'assistant', content: 'Hi! How can I assist you?' });
        expect(result[2]).toEqual({
          role: 'user',
          content: 'I have a question about TypeScript',
        });
        expect(result[3]).toEqual({
          role: 'assistant',
          content: 'Sure! What would you like to know?',
        });
        expect(result[4]).toEqual({ role: 'user', content: 'How do interfaces work?' });
      });
    });
  });
});
