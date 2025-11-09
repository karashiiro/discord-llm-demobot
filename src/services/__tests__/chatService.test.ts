import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ChatService } from '../chatService.js';
import type { ChatMessage, ChatCompletionResponse } from '../../types/chat.js';

/**
 * Tests for ChatService - AI Chat API Integration
 *
 * These tests ensure that:
 * 1. API requests are sent correctly with proper formatting
 * 2. Retry logic works correctly on failures
 * 3. Timeout handling works as expected
 * 4. Status callbacks are invoked at the right times
 * 5. Responses are parsed and validated correctly
 * 6. Thread name generation works properly
 */
describe('ChatService', () => {
  let chatService: ChatService;
  let originalFetch: typeof global.fetch;

  /**
   * Helper function to create a complete ChatCompletionResponse
   */
  function createMockResponse(content: string): ChatCompletionResponse {
    return {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
    };
  }

  beforeEach(() => {

    // Store original fetch
    originalFetch = global.fetch;

    // Create a new instance for each test
    chatService = new ChatService();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('sendChatRequest - Successful Requests', () => {
    it('should successfully send a chat request and return the response', async () => {
      // Arrange
      const mockResponse = createMockResponse('Hello! How can I help you?');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act
      const result = await chatService.sendChatRequest(messages);

      // Assert
      expect(result).toBe('Hello! How can I help you?');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should prepend system prompt if not already present', async () => {
      // Arrange
      const mockResponse = createMockResponse('Response');

      let capturedBody: any;
      global.fetch = jest.fn(async (_url, options) => {
        capturedBody = JSON.parse((options as any).body);
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await chatService.sendChatRequest(messages);

      // Assert
      expect(capturedBody.messages).toHaveLength(2);
      expect(capturedBody.messages[0].role).toBe('system');
      expect(capturedBody.messages[0].content).toContain('concise');
      expect(capturedBody.messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should NOT prepend system prompt if already present', async () => {
      // Arrange
      const mockResponse = createMockResponse('Response');

      let capturedBody: any;
      global.fetch = jest.fn(async (_url, options) => {
        capturedBody = JSON.parse((options as any).body);
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [
        { role: 'system', content: 'Custom system prompt' },
        { role: 'user', content: 'Hello' },
      ];

      // Act
      await chatService.sendChatRequest(messages);

      // Assert
      expect(capturedBody.messages).toHaveLength(2);
      expect(capturedBody.messages[0]).toEqual({ role: 'system', content: 'Custom system prompt' });
    });

    it('should send correct request body with model, temperature, and max_tokens', async () => {
      // Arrange
      const mockResponse = createMockResponse('Response');

      let capturedBody: any;
      global.fetch = jest.fn(async (_url, options) => {
        capturedBody = JSON.parse((options as any).body);
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await chatService.sendChatRequest(messages);

      // Assert
      expect(capturedBody.model).toBe('gpt-3.5-turbo');
      expect(capturedBody.temperature).toBe(0.7);
      expect(capturedBody.max_tokens).toBe(1000);
    });

    it('should include Authorization header with API key', async () => {
      // Arrange
      const mockResponse = createMockResponse('Response');

      let capturedHeaders: any;
      global.fetch = jest.fn(async (_url, options) => {
        capturedHeaders = (options as any).headers;
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await chatService.sendChatRequest(messages);

      // Assert
      expect(capturedHeaders['Content-Type']).toBe('application/json');
      expect(capturedHeaders.Authorization).toBe('Bearer test-api-key');
    });

    it('should call thinking status callback at the start', async () => {
      // Arrange
      const mockResponse = createMockResponse('Response');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const statusCallback = jest.fn<(status: any) => Promise<void>>(async () => {});

      // Act
      await chatService.sendChatRequest(messages, statusCallback);

      // Assert
      expect(statusCallback).toHaveBeenCalledWith({ type: 'thinking' });
    });
  });

  describe('sendChatRequest - Error Handling', () => {
    it('should throw error when response has no choices', async () => {
      // Arrange
      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [],
      };

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act & Assert
      await expect(chatService.sendChatRequest(messages)).rejects.toThrow(
        'Failed to get chat response after 10 attempts'
      );
    });

    it('should throw error when response has no content', async () => {
      // Arrange
      const mockResponse = createMockResponse('');
      mockResponse.choices[0]!.message.content = '';

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act & Assert
      await expect(chatService.sendChatRequest(messages)).rejects.toThrow(
        'Failed to get chat response after 10 attempts'
      );
    });

    it('should throw error when API returns non-200 status', async () => {
      // Arrange
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details',
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act & Assert
      await expect(chatService.sendChatRequest(messages)).rejects.toThrow(
        'Failed to get chat response after 10 attempts'
      );
    });

    it('should throw error when API returns 401 Unauthorized', async () => {
      // Arrange
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act & Assert
      await expect(chatService.sendChatRequest(messages)).rejects.toThrow(
        'Failed to get chat response after 10 attempts'
      );
    });

    it('should throw error when API returns 429 Rate Limit', async () => {
      // Arrange
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      })) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act & Assert
      await expect(chatService.sendChatRequest(messages)).rejects.toThrow(
        'Failed to get chat response after 10 attempts'
      );
    });
  });

  describe('sendChatRequest - Retry Logic', () => {
    it('should retry up to 10 times (1 initial + 9 retries) on network errors', async () => {
      // Arrange
      global.fetch = jest.fn(async () => {
        throw new Error('Network error');
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act & Assert
      await expect(chatService.sendChatRequest(messages)).rejects.toThrow(
        'Failed to get chat response after 10 attempts'
      );
      expect(global.fetch).toHaveBeenCalledTimes(10); // 1 initial + 9 retries
    });

    it('should succeed on retry after initial failures', async () => {
      // Arrange
      const mockResponse = createMockResponse('Success on retry');

      let attemptCount = 0;
      global.fetch = jest.fn(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act
      const result = await chatService.sendChatRequest(messages);

      // Assert
      expect(result).toBe('Success on retry');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should call retry status callback on failures with error details', async () => {
      // Arrange
      const mockResponse = createMockResponse('Success');

      let attemptCount = 0;
      global.fetch = jest.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network failure');
        }
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const statusCallback = jest.fn<(status: any) => Promise<void>>(async () => {});

      // Act
      await chatService.sendChatRequest(messages, statusCallback);

      // Assert
      expect(statusCallback).toHaveBeenCalledTimes(2);
      expect(statusCallback).toHaveBeenNthCalledWith(1, { type: 'thinking' });
      expect(statusCallback).toHaveBeenNthCalledWith(2, {
        type: 'retrying',
        attempt: 1,
        maxAttempts: 10,
        error: 'Network failure',
      });
    });

    it('should NOT call retry status callback on the last failed attempt', async () => {
      // Arrange
      global.fetch = jest.fn(async () => {
        throw new Error('Network error');
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const statusCallback = jest.fn<(status: any) => Promise<void>>(async () => {});

      // Act & Assert
      await expect(chatService.sendChatRequest(messages, statusCallback)).rejects.toThrow();

      // Should only call thinking (1x) and retrying (9x) - not on the 10th attempt
      expect(statusCallback).toHaveBeenCalledTimes(10); // 1 thinking + 9 retrying
    });
  });

  describe('sendChatRequest - Timeout Handling', () => {
    it('should timeout after 30 seconds and retry', async () => {
      // Arrange
      jest.useFakeTimers();

      const mockResponse = createMockResponse('Success');

      let attemptCount = 0;
      global.fetch = jest.fn(async (_url, options) => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt - simulate timeout
          return new Promise((resolve) => {
            const signal = (options as any).signal;
            signal.addEventListener('abort', () => {
              resolve({
                ok: false,
                status: 500,
                text: async () => 'Timeout',
              });
            });
          });
        }
        // Second attempt succeeds
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      // Act
      const resultPromise = chatService.sendChatRequest(messages);

      // Fast-forward time to trigger timeout
      await jest.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      // Assert
      expect(result).toBe('Success');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should include timeout error in retry status callback', async () => {
      // Arrange
      jest.useFakeTimers();

      const mockResponse = createMockResponse('Success');

      let attemptCount = 0;
      global.fetch = jest.fn(async (_url, options) => {
        attemptCount++;
        if (attemptCount === 1) {
          return new Promise((_resolve, reject) => {
            const signal = (options as any).signal;
            signal.addEventListener('abort', () => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            });
          });
        }
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const statusCallback = jest.fn<(status: any) => Promise<void>>(async () => {});

      // Act
      const resultPromise = chatService.sendChatRequest(messages, statusCallback);
      await jest.advanceTimersByTimeAsync(30000);
      await resultPromise;

      // Assert
      expect(statusCallback).toHaveBeenCalledWith({
        type: 'retrying',
        attempt: 1,
        maxAttempts: 10,
        error: 'Request timeout after 30000ms',
      });

      jest.useRealTimers();
    });
  });

  describe('generateThreadName', () => {
    it('should generate a thread name from user message', async () => {
      // Arrange
      const mockResponse = createMockResponse('Python Tutorial Discussion');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      // Act
      const result = await chatService.generateThreadName('Can you help me learn Python?');

      // Assert
      expect(result).toBe('Python Tutorial Discussion');
    });

    it('should truncate thread name to 50 characters', async () => {
      // Arrange
      const longName = 'This is a very long thread name that exceeds fifty characters in total length';
      const mockResponse = createMockResponse(longName);

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      // Act
      const result = await chatService.generateThreadName('Some user message');

      // Assert
      expect(result).toBe(longName.substring(0, 50));
      expect(result.length).toBe(50);
    });

    it('should trim whitespace from thread name', async () => {
      // Arrange
      const mockResponse = createMockResponse('  JavaScript Help  ');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      // Act
      const result = await chatService.generateThreadName('Need help with JavaScript');

      // Assert
      expect(result).toBe('JavaScript Help');
    });

    it('should fallback to "Chat" when API returns empty response', async () => {
      // Arrange
      const mockResponse = createMockResponse('');
      mockResponse.choices[0]!.message.content = '';

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      // Act
      const result = await chatService.generateThreadName('Hello');

      // Assert
      expect(result).toBe('Chat');
    });

    it('should fallback to "Chat" when API returns only whitespace', async () => {
      // Arrange
      const mockResponse = createMockResponse('   ');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as any;

      // Act
      const result = await chatService.generateThreadName('Hello');

      // Assert
      expect(result).toBe('Chat');
    });

    it('should fallback to "Chat" on API error', async () => {
      // Arrange
      global.fetch = jest.fn(async () => {
        throw new Error('API error');
      }) as any;

      // Act
      const result = await chatService.generateThreadName('Hello');

      // Assert
      expect(result).toBe('Chat');
    });

    it('should use correct prompt for thread name generation', async () => {
      // Arrange
      const mockResponse = createMockResponse('Thread Name');

      let capturedBody: any;
      global.fetch = jest.fn(async (_url, options) => {
        capturedBody = JSON.parse((options as any).body);
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as any;

      // Act
      await chatService.generateThreadName('User message here');

      // Assert
      expect(capturedBody.messages).toHaveLength(2);
      expect(capturedBody.messages[0].role).toBe('system');
      expect(capturedBody.messages[0].content).toContain('concise thread name');
      expect(capturedBody.messages[0].content).toContain('50 characters');
      expect(capturedBody.messages[1]).toEqual({ role: 'user', content: 'User message here' });
    });
  });
});
