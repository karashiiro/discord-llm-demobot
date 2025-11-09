// Set up environment variables for testing
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-discord-token';
process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'test-client-id';
process.env.CHAT_ENDPOINT_URL = process.env.CHAT_ENDPOINT_URL || 'https://api.example.com';
process.env.CHAT_API_KEY = process.env.CHAT_API_KEY || 'test-api-key';
process.env.CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-3.5-turbo';
process.env.CHAT_TEMPERATURE = process.env.CHAT_TEMPERATURE || '0.7';
process.env.CHAT_MAX_TOKENS = process.env.CHAT_MAX_TOKENS || '1000';
