import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { handleMessageCreate } from '../messageCreate.js';
import { ChatService } from '../../services/chatService.js';
import { ThreadService } from '../../services/threadService.js';
import { Message, Client, ThreadChannel, User, Collection } from 'discord.js';
import type { ChatMessage } from '../../types/chat.js';

/**
 * Tests for handleMessageCreate - Main Message Handler
 *
 * These tests ensure that:
 * 1. Messages are properly validated before processing
 * 2. First message in thread triggers thread name generation
 * 3. Status messages are created and updated correctly
 * 4. Retry status updates work properly
 * 5. Multi-chunk responses are handled
 * 6. Errors are caught and user-friendly messages sent
 * 7. Integration between ChatService and ThreadService works
 */
describe('handleMessageCreate', () => {
  let chatService: ChatService;
  let threadService: ThreadService;
  let mockClient: Client;

  beforeEach(() => {
    chatService = new ChatService();
    threadService = new ThreadService();
    mockClient = {
      user: {
        id: 'bot-123',
      },
    } as Client;
  });

  /**
   * Helper to create a mock thread channel
   */
  function createMockThread(threadId = 'thread-123'): ThreadChannel {
    const mockMessages = new Map<string, Message>();

    const mockThread = {
      id: threadId,
      isThread: () => true,
      send: jest.fn(async (content: string) => ({
        id: `msg-${Date.now()}`,
        content,
        edit: jest.fn(async (newContent: string) => ({
          id: `msg-${Date.now()}`,
          content: newContent,
        })),
      })),
      setName: jest.fn(async (_name: string) => {}),
      messages: {
        fetch: jest.fn(async () => {
          const collection = new Collection<string, Message>();
          mockMessages.forEach((msg, id) => collection.set(id, msg));
          return collection;
        }),
      },
    } as unknown as ThreadChannel;

    return mockThread;
  }

  /**
   * Helper to create a mock message
   */
  function createMockMessage(
    content: string,
    authorId: string,
    thread: ThreadChannel,
    messageId = 'msg-456'
  ): Message {
    return {
      id: messageId,
      content,
      author: {
        id: authorId,
        bot: false,
      } as User,
      channel: thread,
      system: false,
    } as Message;
  }

  describe('Message Processing Flow', () => {
    it('should process valid message and send AI response', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Hi there!');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(threadService.shouldProcessMessage).toHaveBeenCalledWith(message, 'bot-123');
      expect(threadService.buildConversationHistory).toHaveBeenCalledWith(thread, mockClient);
      expect(chatService.sendChatRequest).toHaveBeenCalled();
      expect(thread.send).toHaveBeenCalledWith('_Thinking..._');
    });

    it('should NOT process message when shouldProcessMessage returns false', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(false);
      jest.spyOn(chatService, 'sendChatRequest');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(threadService.shouldProcessMessage).toHaveBeenCalledWith(message, 'bot-123');
      expect(chatService.sendChatRequest).not.toHaveBeenCalled();
      expect(thread.send).not.toHaveBeenCalled();
    });

    it('should return early if channel is not a thread', async () => {
      // Arrange
      const mockChannel = {
        isThread: () => false,
      };
      const message = {
        content: 'Hello',
        author: { id: 'user-123', bot: false },
        channel: mockChannel,
        system: false,
      } as unknown as Message;

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(chatService, 'sendChatRequest');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(chatService.sendChatRequest).not.toHaveBeenCalled();
    });
  });

  describe('First Message Thread Naming', () => {
    it('should generate thread name for first user message', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Can you help me with Python?', 'user-123', thread);

      // Mock fetch to return only this one user message
      const mockMessagesCollection = new Collection<string, Message>();
      mockMessagesCollection.set(message.id, message);
      (thread.messages.fetch as any).mockResolvedValue(mockMessagesCollection);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Can you help me with Python?' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Sure!');
      jest.spyOn(chatService, 'generateThreadName').mockResolvedValue('Python Help');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Wait a bit for async thread naming
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(chatService.generateThreadName).toHaveBeenCalledWith('Can you help me with Python?');
      expect(thread.setName).toHaveBeenCalledWith('Python Help');
    });

    it('should NOT generate thread name for second user message', async () => {
      // Arrange
      const thread = createMockThread();
      const message1 = createMockMessage('First message', 'user-123', thread, 'msg-1');
      const message2 = createMockMessage('Second message', 'user-123', thread, 'msg-2');

      // Mock fetch to return two user messages
      const mockMessagesCollection = new Collection<string, Message>();
      mockMessagesCollection.set(message1.id, message1);
      mockMessagesCollection.set(message2.id, message2);
      (thread.messages.fetch as any).mockResolvedValue(mockMessagesCollection);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'First message' },
        { role: 'user', content: 'Second message' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Response');
      jest.spyOn(chatService, 'generateThreadName');

      // Act
      await handleMessageCreate(message2, mockClient, chatService, threadService);

      // Assert
      expect(chatService.generateThreadName).not.toHaveBeenCalled();
    });

    it('should handle thread name generation errors gracefully', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      const mockMessagesCollection = new Collection<string, Message>();
      mockMessagesCollection.set(message.id, message);
      (thread.messages.fetch as any).mockResolvedValue(mockMessagesCollection);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Hi!');
      jest.spyOn(chatService, 'generateThreadName').mockRejectedValue(new Error('API error') as never);

      // Act & Assert - Should not throw
      await expect(
        handleMessageCreate(message, mockClient, chatService, threadService)
      ).resolves.not.toThrow();

      // Wait for async thread naming to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Thread name should not be set due to error
      expect(thread.setName).not.toHaveBeenCalled();
    });
  });

  describe('Status Message Updates', () => {
    it('should create status message with "Thinking..." initially', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Response');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(thread.send).toHaveBeenCalledWith('_Thinking..._');
    });

    it('should update status message on retry', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      const mockStatusMessage = {
        id: 'status-msg',
        content: '_Thinking..._',
        edit: jest.fn(async (content: string) => ({ content })),
      };
      (thread.send as any).mockResolvedValue(mockStatusMessage);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);

      // Mock sendChatRequest to call status callback
      jest.spyOn(chatService, 'sendChatRequest').mockImplementation(
        async (
          _messages: ChatMessage[],
          onStatusUpdate?: (status: any) => Promise<void>
        ): Promise<string> => {
          if (onStatusUpdate) {
            await onStatusUpdate({ type: 'thinking' });
            await onStatusUpdate({
              type: 'retrying',
              attempt: 1,
              maxAttempts: 10,
              error: 'Network error',
            });
          }
          return 'Final response';
        }
      );

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(mockStatusMessage.edit).toHaveBeenCalledWith(
        expect.stringContaining('Error, retrying (1/10)')
      );
      expect(mockStatusMessage.edit).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
    });

    it('should replace status message with AI response', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      const mockStatusMessage = {
        id: 'status-msg',
        content: '_Thinking..._',
        edit: jest.fn(async (content: string) => ({ content })),
      };
      (thread.send as any).mockResolvedValue(mockStatusMessage);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Hi there!');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(mockStatusMessage.edit).toHaveBeenCalledWith('Hi there!');
    });
  });

  describe('Multi-chunk Response Handling', () => {
    it('should send multiple messages for long responses', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Tell me a story', 'user-123', thread);

      const mockStatusMessage = {
        id: 'status-msg',
        content: '_Thinking..._',
        edit: jest.fn(async (content: string) => ({ content })),
      };
      (thread.send as any).mockResolvedValue(mockStatusMessage);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Tell me a story' },
      ]);

      // Create a response longer than 2000 chars
      const longResponse = 'a'.repeat(1500) + '. ' + 'b'.repeat(1500);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue(longResponse);

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      // First chunk should edit the status message
      expect(mockStatusMessage.edit).toHaveBeenCalledWith(expect.stringContaining('a'));
      // Second chunk should be sent as new message
      expect(thread.send).toHaveBeenCalledWith(expect.stringContaining('b'));
    });

    it('should handle single chunk response without extra sends', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      const mockStatusMessage = {
        id: 'status-msg',
        content: '_Thinking..._',
        edit: jest.fn(async (content: string) => ({ content })),
      };
      (thread.send as any).mockResolvedValue(mockStatusMessage);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Short response');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(mockStatusMessage.edit).toHaveBeenCalledWith('Short response');
      // Should only have been called once for initial status message
      expect(thread.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should send error message when chat service fails', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockRejectedValue(new Error('API error') as never);

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(thread.send).toHaveBeenCalledWith(
        expect.stringContaining('encountered an error')
      );
    });

    it('should send error message when conversation history fails', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest
        .spyOn(threadService, 'buildConversationHistory')
        .mockRejectedValue(new Error('Failed to fetch messages'));

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(thread.send).toHaveBeenCalledWith(
        expect.stringContaining('encountered an error')
      );
    });

    it('should handle error when sending error message fails', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([]);
      jest.spyOn(chatService, 'sendChatRequest').mockRejectedValue(new Error('API error') as never);
      (thread.send as any).mockRejectedValue(new Error('Cannot send message'));

      // Act & Assert - Should not throw
      await expect(
        handleMessageCreate(message, mockClient, chatService, threadService)
      ).resolves.not.toThrow();
    });

    it('should handle error when status message update fails', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      const mockStatusMessage = {
        id: 'status-msg',
        content: '_Thinking..._',
        edit: jest.fn(async () => {
          throw new Error('Cannot edit message');
        }),
      };
      (thread.send as any).mockResolvedValue(mockStatusMessage);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);

      // Mock to trigger status update
      jest.spyOn(chatService, 'sendChatRequest').mockImplementation(
        async (
          _messages: ChatMessage[],
          onStatusUpdate?: (status: any) => Promise<void>
        ): Promise<string> => {
          if (onStatusUpdate) {
            await onStatusUpdate({
              type: 'retrying',
              attempt: 1,
              maxAttempts: 10,
              error: 'Test error',
            });
          }
          return 'Response';
        }
      );

      // Act & Assert - Should not throw even if status update fails
      await expect(
        handleMessageCreate(message, mockClient, chatService, threadService)
      ).resolves.not.toThrow();
    });
  });

  describe('Integration with Services', () => {
    it('should pass conversation history to chat service', async () => {
      // Arrange
      const thread = createMockThread();
      const message = createMockMessage('What is 2+2?', 'user-123', thread);

      const mockHistory: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'What is 2+2?' },
      ];

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue(mockHistory);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('4');

      // Act
      await handleMessageCreate(message, mockClient, chatService, threadService);

      // Assert
      expect(chatService.sendChatRequest).toHaveBeenCalledWith(
        mockHistory,
        expect.any(Function)
      );
    });

    it('should use client user ID for message validation', async () => {
      // Arrange
      const customClient = {
        user: {
          id: 'custom-bot-id',
        },
      } as Client;

      const thread = createMockThread();
      const message = createMockMessage('Hello', 'user-123', thread);

      jest.spyOn(threadService, 'shouldProcessMessage').mockResolvedValue(true);
      jest.spyOn(threadService, 'buildConversationHistory').mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ]);
      jest.spyOn(chatService, 'sendChatRequest').mockResolvedValue('Hi!');

      // Act
      await handleMessageCreate(message, customClient, chatService, threadService);

      // Assert
      expect(threadService.shouldProcessMessage).toHaveBeenCalledWith(
        message,
        'custom-bot-id'
      );
    });
  });
});
