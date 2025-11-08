import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { config, validateConfig } from './utils/config.js';
import { ChatService } from './services/chatService.js';
import { ThreadService } from './services/threadService.js';
import { handleMessageCreate } from './handlers/messageCreate.js';
import * as chatCommand from './commands/chat.js';

// Validate configuration on startup
validateConfig();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize services
const chatService = new ChatService();
const threadService = new ThreadService();

// Store commands in a collection
const commands = new Collection<string, typeof chatCommand>();
commands.set(chatCommand.data.name, chatCommand);

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  console.log(`📊 Serving ${readyClient.guilds.cache.size} guilds`);
});

// Interaction handler (for slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, threadService);
  } catch (error) {
    console.error('Error executing command:', error);
    const errorMessage = 'There was an error while executing this command!';
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
});

// Message handler (for thread messages)
client.on(Events.MessageCreate, async (message) => {
  await handleMessageCreate(message, client, chatService, threadService);
});

// Error handlers
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Login to Discord
console.log('🚀 Starting Discord LLM Demo Bot...');
client.login(config.discord.token).catch((error) => {
  console.error('Failed to login to Discord:', error);
  process.exit(1);
});
