import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { execute } from '../chat.js';
import { ThreadService } from '../../services/threadService.js';
import { ChatInputCommandInteraction, Message, User } from 'discord.js';

/**
 * Tests for Chat Command - Slash Command Handler
 *
 * These tests ensure that:
 * 1. Command creates a reply to the interaction
 * 2. Thread is created from the reply message
 * 3. Thread has correct name and settings
 * 4. Auto-archive duration is set properly
 * 5. Errors are handled gracefully
 * 6. User receives appropriate error messages
 * 7. Interaction states (deferred, replied) are handled correctly
 */
describe('Chat Command', () => {
  let threadService: ThreadService;

  beforeEach(() => {
    threadService = new ThreadService();
  });

  /**
   * Helper to create a mock interaction
   */
  function createMockInteraction(userId = 'user-123'): ChatInputCommandInteraction {
    const mockUser = {
      id: userId,
      username: 'testuser',
    } as User;

    const mockReplyMessage = {
      id: 'reply-msg-123',
      content: '💬 Conversation started! Send your first message in the thread below.',
      startThread: jest.fn(async (options: any) => ({
        id: 'thread-123',
        name: options.name,
        autoArchiveDuration: options.autoArchiveDuration,
      })),
    } as unknown as Message;

    const mockInteraction = {
      user: mockUser,
      reply: jest.fn(async () => mockReplyMessage),
      editReply: jest.fn(async (content: string) => ({ content })),
      deferred: false,
      replied: false,
    } as unknown as ChatInputCommandInteraction;

    return mockInteraction;
  }

  describe('Successful Command Execution', () => {
    it('should reply to the interaction with conversation started message', async () => {
      // Arrange
      const interaction = createMockInteraction();

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(interaction.reply).toHaveBeenCalledWith({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });
    });

    it('should create a thread from the reply message', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(replyMessage.startThread).toHaveBeenCalled();
    });

    it('should create thread with correct name', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(replyMessage.startThread).toHaveBeenCalledWith({
        name: 'Chat',
        autoArchiveDuration: 60,
      });
    });

    it('should set auto-archive duration to 60 minutes', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(replyMessage.startThread).toHaveBeenCalledWith(
        expect.objectContaining({
          autoArchiveDuration: 60,
        })
      );
    });

    it('should use ThreadService.generateThreadName for thread name', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });

      jest.spyOn(threadService, 'generateThreadName').mockReturnValue('Custom Chat Name');

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(threadService.generateThreadName).toHaveBeenCalled();
      expect(replyMessage.startThread).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Chat Name',
        })
      );
    });
  });

  describe('Error Handling - Reply Failure', () => {
    it('should handle error when reply fails', async () => {
      // Arrange
      const interaction = createMockInteraction();
      (interaction.reply as any).mockRejectedValue(new Error('Failed to reply'));

      // Act & Assert - Should not throw
      await expect(execute(interaction, threadService)).resolves.not.toThrow();

      // Should attempt to send error message
      expect(interaction.reply).toHaveBeenCalled();
    });

    it('should send error message when reply fails', async () => {
      // Arrange
      const interaction = createMockInteraction();
      let replyCallCount = 0;
      (interaction.reply as any).mockImplementation(async () => {
        replyCallCount++;
        if (replyCallCount === 1) {
          throw new Error('Network error');
        }
        return { content: 'Error message' };
      });

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(interaction.reply).toHaveBeenCalledTimes(2);
      expect(interaction.reply).toHaveBeenLastCalledWith({
        content: expect.stringContaining('encountered an error'),
        ephemeral: true,
      });
    });
  });

  describe('Error Handling - Thread Creation Failure', () => {
    it('should handle error when thread creation fails', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });
      (replyMessage.startThread as any).mockRejectedValue(
        new Error('Failed to create thread')
      );

      // Act & Assert - Should not throw
      await expect(execute(interaction, threadService)).resolves.not.toThrow();
    });

    it('should send error message when thread creation fails', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });
      (replyMessage.startThread as any).mockRejectedValue(
        new Error('Cannot create thread')
      );

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('encountered an error'),
          ephemeral: true,
        })
      );
    });

    it('should include error message details in user-facing error', async () => {
      // Arrange
      const interaction = createMockInteraction();
      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });
      (replyMessage.startThread as any).mockRejectedValue(
        new Error('Permission denied')
      );

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Permission denied'),
        })
      );
    });
  });

  describe('Error Handling - Deferred Interaction', () => {
    it('should use editReply when interaction is already deferred', async () => {
      // Arrange
      const interaction = createMockInteraction();
      (interaction as any).deferred = true;
      (interaction.reply as any).mockRejectedValue(new Error('Test error'));

      // Act
      await execute(interaction, threadService);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('encountered an error')
      );
    });

    it('should use reply when interaction is not deferred', async () => {
      // Arrange
      const interaction = createMockInteraction();
      (interaction as any).deferred = false;
      (interaction.reply as any).mockRejectedValue(new Error('Test error'));

      // Act
      await execute(interaction, threadService);

      // Assert
      // Should be called twice - once for initial attempt, once for error
      expect(interaction.reply).toHaveBeenCalledTimes(2);
      expect(interaction.editReply).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Error Message Failure', () => {
    it('should handle error when sending error message fails', async () => {
      // Arrange
      const interaction = createMockInteraction();
      (interaction.reply as any).mockRejectedValue(new Error('Network error'));
      (interaction.editReply as any).mockRejectedValue(
        new Error('Cannot send error message')
      );

      // Act & Assert - Should not throw even if error message fails
      await expect(execute(interaction, threadService)).resolves.not.toThrow();
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const interaction = createMockInteraction();
      (interaction.reply as any).mockRejectedValue('String error');

      // Act & Assert
      await expect(execute(interaction, threadService)).resolves.not.toThrow();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('unexpected error'),
        })
      );
    });
  });

  describe('Integration', () => {
    it('should complete full flow successfully', async () => {
      // Arrange
      const interaction = createMockInteraction('user-456');

      // Act
      await execute(interaction, threadService);

      // Assert - Verify full flow
      expect(interaction.reply).toHaveBeenCalledWith({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });

      const replyMessage = await interaction.reply({
        content: '💬 Conversation started! Send your first message in the thread below.',
        fetchReply: true,
      });

      expect(replyMessage.startThread).toHaveBeenCalledWith({
        name: 'Chat',
        autoArchiveDuration: 60,
      });
    });

    it('should work with different user IDs', async () => {
      // Arrange
      const user1Interaction = createMockInteraction('user-111');
      const user2Interaction = createMockInteraction('user-222');

      // Act
      await execute(user1Interaction, threadService);
      await execute(user2Interaction, threadService);

      // Assert
      expect(user1Interaction.reply).toHaveBeenCalled();
      expect(user2Interaction.reply).toHaveBeenCalled();
    });
  });
});
