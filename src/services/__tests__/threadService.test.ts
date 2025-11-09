import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ThreadService } from '../threadService.js';
import { Message, ThreadChannel, User } from 'discord.js';

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
});
