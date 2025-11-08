import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ChatService } from '../services/chatService.js';
import { ThreadService } from '../services/threadService.js';

export const data = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('Start a conversation with an AI assistant')
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('Your message to the AI')
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  chatService: ChatService,
  threadService: ThreadService
): Promise<void> {
  try {
    // Defer the reply to prevent timeout (we have 15 minutes after deferring)
    await interaction.deferReply();

    const userMessage = interaction.options.getString('message', true);
    const userId = interaction.user.id;

    console.log(`[ChatCommand] User ${userId} sent: ${userMessage}`);

    // Send message to chat service
    const response = await chatService.sendChatRequest([
      { role: 'user', content: userMessage },
    ]);

    // Edit the deferred reply with the AI response
    const reply = await interaction.editReply(response);

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
