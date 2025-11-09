import { config } from '../utils/config.js';
import type { ChatMessage, ChatCompletionRequest, ChatCompletionResponse } from '../types/chat.js';

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
      'Be concise, conversational, and friendly, responding in at most a couple of sentences.';
  }

  async sendChatRequest(messages: ChatMessage[]): Promise<string> {
    const url = `${this.endpointUrl}/v1/chat/completions`;
    const maxRetries = 9; // 10 total requests (1 initial + 9 retries)
    const timeoutMs = 30000; // 30 seconds

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

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`[ChatService] Retry attempt ${attempt}/${maxRetries}`);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

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
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`[ChatService] Request timeout after ${timeoutMs}ms`);
        } else {
          console.error(`[ChatService] Error:`, lastError.message);
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }

        // Otherwise, continue to next retry attempt
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to get chat response after ${maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate a thread name from a user message
   * Uses the chat model with a special prompt to create a concise thread name
   */
  async generateThreadName(userMessage: string): Promise<string> {
    try {
      const threadNamePrompt =
        'Based on the following user message, generate a concise thread name that summarizes the topic. ' +
        'The thread name must be no more than 50 characters. ' +
        'Respond with ONLY the thread name, no quotes, no explanations.';

      const messages: ChatMessage[] = [
        { role: 'system', content: threadNamePrompt },
        { role: 'user', content: userMessage },
      ];

      const response = await this.sendChatRequest(messages);

      // Trim and limit to 50 characters
      const threadName = response.trim().substring(0, 50);

      console.log(`[ChatService] Generated thread name: ${threadName}`);

      return threadName || 'Chat'; // Fallback to 'Chat' if empty
    } catch (error) {
      console.error('[ChatService] Error generating thread name:', error);
      return 'Chat'; // Fallback to 'Chat' on error
    }
  }
}
