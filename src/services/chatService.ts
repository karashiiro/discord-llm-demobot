import { config } from '../utils/config.js';
import type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types/chat.js';

export class ChatService {
  private readonly endpointUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly systemPrompt: string;

  constructor() {
    this.endpointUrl = config.chat.endpointUrl;
    this.apiKey = config.chat.apiKey;
    this.model = config.chat.model;
    this.temperature = config.chat.temperature;
    this.maxTokens = config.chat.maxTokens;
    this.systemPrompt =
      'You are a helpful AI assistant in a Discord chat. CRITICAL: Discord messages have a strict 2000 character limit. You MUST keep your responses under 2000 characters total. Be concise, conversational, and friendly. If a response would exceed 2000 characters, summarize or break it into key points instead.';
  }

  async sendChatRequest(messages: ChatMessage[]): Promise<string> {
    const url = `${this.endpointUrl}/v1/chat/completions`;

    // Prepend system prompt if not already present
    const messagesWithSystem: ChatMessage[] =
      messages[0]?.role === 'system'
        ? messages
        : [{ role: 'system', content: this.systemPrompt }, ...messages];

    const requestBody: ChatCompletionRequest = {
      model: this.model,
      messages: messagesWithSystem,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };

    console.log(`[ChatService] Sending request to ${url}`);
    console.log(`[ChatService] Messages: ${messages.length} messages`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Chat API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No choices in chat completion response');
      }

      const content = data.choices[0]?.message.content;
      if (!content) {
        throw new Error('No content in chat completion response');
      }

      console.log(`[ChatService] Received response: ${content.substring(0, 100)}...`);

      return content;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[ChatService] Error:`, error.message);
        throw new Error(`Failed to get chat response: ${error.message}`);
      }
      throw error;
    }
  }
}
