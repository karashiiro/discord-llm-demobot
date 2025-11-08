import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ThreadService } from '../services/threadService.js';

export const data = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('Start a conversation with an AI assistant');

export async function execute(
  interaction: ChatInputCommandInteraction,
  threadService: ThreadService
): Promise<void> {
  try {
    const userId = interaction.user.id;

    console.log(`[ChatCommand] User ${userId} starting new chat`);

    // Reply with a message that will become the thread starter
    const reply = await interaction.reply({
      content: '💬 Conversation started! Send your first message in the thread below.',
      fetchReply: true,
    });

    // Create a thread from the reply
    const threadName = threadService.generateThreadName(userId);

    console.log(`[ChatCommand] Creating thread: ${threadName}`);

    const thread = await reply.startThread({
      name: threadName,
      autoArchiveDuration: 60, // Archive after 1 hour of inactivity
    });

    console.log(`[ChatCommand] Thread created: ${thread.id}`);
  } catch (error) {
    console.error('[ChatCommand] Error:', error);

    const errorMessage =
      error instanceof Error
        ? `Sorry, I encountered an error: ${error.message}`
        : 'Sorry, I encountered an unexpected error. Please try again later.';

    // Try to respond with error message
    try {
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('[ChatCommand] Failed to send error message:', replyError);
    }
  }
}
