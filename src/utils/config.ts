import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

interface Config {
  discord: {
    token: string;
    clientId: string;
  };
  chat: {
    endpointUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return parsed;
}

export const config: Config = {
  discord: {
    token: getRequiredEnv('DISCORD_TOKEN'),
    clientId: getRequiredEnv('DISCORD_CLIENT_ID'),
  },
  chat: {
    endpointUrl: getRequiredEnv('CHAT_ENDPOINT_URL'),
    apiKey: getOptionalEnv('CHAT_API_KEY', ''),
    model: getOptionalEnv('CHAT_MODEL', 'gpt-3.5-turbo'),
    temperature: getNumberEnv('CHAT_TEMPERATURE', 0.7),
    maxTokens: getNumberEnv('CHAT_MAX_TOKENS', 1000),
  },
};

// Validate configuration
export function validateConfig(): void {
  console.log('Configuration loaded:');
  console.log('  Discord Client ID:', config.discord.clientId);
  console.log('  Chat Endpoint:', config.chat.endpointUrl);
  console.log('  Chat Model:', config.chat.model);
  console.log('  Temperature:', config.chat.temperature);
  console.log('  Max Tokens:', config.chat.maxTokens);
}
