import { REST, Routes } from 'discord.js';
import { config } from './utils/config.js';
import * as chatCommand from './commands/chat.js';

const commands = [chatCommand.data.toJSON()];

const rest = new REST().setToken(config.discord.token);

async function deployCommands(): Promise<void> {
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

    // Register commands globally
    const data = await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commands,
    });

    console.log(
      `✅ Successfully reloaded ${Array.isArray(data) ? data.length : 0} application (/) commands.`
    );
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

void deployCommands();
