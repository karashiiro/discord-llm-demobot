import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { config, validateConfig } from '../config.js';

/**
 * Tests for Config Utilities - Environment Variable Loading and Validation
 *
 * These tests ensure that:
 * 1. Configuration is loaded from environment variables
 * 2. Required variables are present
 * 3. Optional variables use correct defaults
 * 4. Number parsing works correctly
 * 5. Configuration structure is correct
 * 6. Validation logging works
 *
 * Note: The config module loads environment variables at import time,
 * so these tests verify the configuration in the test environment
 * (configured by jest.setup.js)
 */
describe('Config Utilities', () => {
  describe('config object structure', () => {
    it('should have discord configuration section', () => {
      expect(config.discord).toBeDefined();
      expect(typeof config.discord).toBe('object');
    });

    it('should have chat configuration section', () => {
      expect(config.chat).toBeDefined();
      expect(typeof config.chat).toBe('object');
    });

    it('should have all required discord fields', () => {
      expect(config.discord.token).toBeDefined();
      expect(config.discord.clientId).toBeDefined();
      expect(typeof config.discord.token).toBe('string');
      expect(typeof config.discord.clientId).toBe('string');
    });

    it('should have all required chat fields', () => {
      expect(config.chat.endpointUrl).toBeDefined();
      expect(config.chat.apiKey).toBeDefined();
      expect(config.chat.model).toBeDefined();
      expect(config.chat.temperature).toBeDefined();
      expect(config.chat.maxTokens).toBeDefined();
    });
  });

  describe('discord configuration', () => {
    it('should load DISCORD_TOKEN from environment', () => {
      expect(config.discord.token).toBe(process.env.DISCORD_TOKEN);
      expect(config.discord.token.length).toBeGreaterThan(0);
    });

    it('should load DISCORD_CLIENT_ID from environment', () => {
      expect(config.discord.clientId).toBe(process.env.DISCORD_CLIENT_ID);
      expect(config.discord.clientId.length).toBeGreaterThan(0);
    });
  });

  describe('chat configuration', () => {
    it('should load CHAT_ENDPOINT_URL from environment', () => {
      expect(config.chat.endpointUrl).toBe(process.env.CHAT_ENDPOINT_URL);
      expect(config.chat.endpointUrl.length).toBeGreaterThan(0);
    });

    it('should load CHAT_API_KEY from environment', () => {
      expect(config.chat.apiKey).toBe(process.env.CHAT_API_KEY);
    });

    it('should load CHAT_MODEL from environment with default fallback', () => {
      // In test environment, this is set by jest.setup.js
      expect(config.chat.model).toBe(process.env.CHAT_MODEL || 'gpt-3.5-turbo');
      expect(typeof config.chat.model).toBe('string');
    });

    it('should parse CHAT_TEMPERATURE as number with default fallback', () => {
      expect(typeof config.chat.temperature).toBe('number');
      expect(config.chat.temperature).toBeGreaterThanOrEqual(0);
      expect(config.chat.temperature).toBeLessThanOrEqual(2);
    });

    it('should parse CHAT_MAX_TOKENS as number with default fallback', () => {
      expect(typeof config.chat.maxTokens).toBe('number');
      expect(config.chat.maxTokens).toBeGreaterThan(0);
    });
  });

  describe('type validation', () => {
    it('should ensure all discord values are strings', () => {
      expect(typeof config.discord.token).toBe('string');
      expect(typeof config.discord.clientId).toBe('string');
    });

    it('should ensure chat endpoint and model are strings', () => {
      expect(typeof config.chat.endpointUrl).toBe('string');
      expect(typeof config.chat.apiKey).toBe('string');
      expect(typeof config.chat.model).toBe('string');
    });

    it('should ensure temperature and maxTokens are numbers', () => {
      expect(typeof config.chat.temperature).toBe('number');
      expect(typeof config.chat.maxTokens).toBe('number');
      expect(Number.isFinite(config.chat.temperature)).toBe(true);
      expect(Number.isFinite(config.chat.maxTokens)).toBe(true);
    });

    it('should ensure temperature is not NaN', () => {
      expect(Number.isNaN(config.chat.temperature)).toBe(false);
    });

    it('should ensure maxTokens is not NaN', () => {
      expect(Number.isNaN(config.chat.maxTokens)).toBe(false);
    });
  });

  describe('value constraints', () => {
    it('should have non-empty discord token', () => {
      expect(config.discord.token.length).toBeGreaterThan(0);
    });

    it('should have non-empty discord client ID', () => {
      expect(config.discord.clientId.length).toBeGreaterThan(0);
    });

    it('should have non-empty chat endpoint URL', () => {
      expect(config.chat.endpointUrl.length).toBeGreaterThan(0);
    });

    it('should have valid temperature range (0-2)', () => {
      expect(config.chat.temperature).toBeGreaterThanOrEqual(0);
      expect(config.chat.temperature).toBeLessThanOrEqual(2);
    });

    it('should have positive maxTokens', () => {
      expect(config.chat.maxTokens).toBeGreaterThan(0);
    });

    it('should have reasonable maxTokens value', () => {
      // Most models have token limits, so this should be reasonable
      expect(config.chat.maxTokens).toBeLessThanOrEqual(100000);
    });
  });

  describe('validateConfig function', () => {
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should not throw when called', () => {
      expect(() => validateConfig()).not.toThrow();
    });

    it('should log configuration header', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith('Configuration loaded:');
    });

    it('should log discord client ID', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Discord Client ID:',
        config.discord.clientId
      );
    });

    it('should log chat endpoint', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith('  Chat Endpoint:', config.chat.endpointUrl);
    });

    it('should log chat model', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith('  Chat Model:', config.chat.model);
    });

    it('should log temperature', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith('  Temperature:', config.chat.temperature);
    });

    it('should log max tokens', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith('  Max Tokens:', config.chat.maxTokens);
    });

    it('should log exactly 6 lines', () => {
      validateConfig();
      expect(consoleLogSpy).toHaveBeenCalledTimes(6);
    });

    it('should NOT log sensitive discord token', () => {
      validateConfig();
      const allCalls = consoleLogSpy.mock.calls;
      const loggedValues = allCalls.flat();
      expect(loggedValues).not.toContain(config.discord.token);
    });

    it('should NOT log sensitive API key', () => {
      validateConfig();
      const allCalls = consoleLogSpy.mock.calls;
      const loggedValues = allCalls.flat();
      if (config.chat.apiKey) {
        expect(loggedValues).not.toContain(config.chat.apiKey);
      }
    });
  });

  describe('integration', () => {
    it('should have a complete and valid configuration object', () => {
      // Verify the entire config structure
      expect(config).toEqual({
        discord: {
          token: expect.any(String),
          clientId: expect.any(String),
        },
        chat: {
          endpointUrl: expect.any(String),
          apiKey: expect.any(String),
          model: expect.any(String),
          temperature: expect.any(Number),
          maxTokens: expect.any(Number),
        },
      });
    });

    it('should be usable for creating a Discord client', () => {
      // Verify we have the minimum required fields for Discord.js
      expect(config.discord.token).toBeTruthy();
      expect(config.discord.clientId).toBeTruthy();
    });

    it('should be usable for making chat API requests', () => {
      // Verify we have the minimum required fields for chat API
      expect(config.chat.endpointUrl).toBeTruthy();
      expect(config.chat.model).toBeTruthy();
      expect(typeof config.chat.temperature).toBe('number');
      expect(typeof config.chat.maxTokens).toBe('number');
    });

    it('should match values from environment variables', () => {
      expect(config.discord.token).toBe(process.env.DISCORD_TOKEN);
      expect(config.discord.clientId).toBe(process.env.DISCORD_CLIENT_ID);
      expect(config.chat.endpointUrl).toBe(process.env.CHAT_ENDPOINT_URL);
      expect(config.chat.apiKey).toBe(process.env.CHAT_API_KEY || '');
      expect(config.chat.model).toBe(process.env.CHAT_MODEL || 'gpt-3.5-turbo');
    });
  });
});
