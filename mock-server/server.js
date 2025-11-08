import express from 'express';

const app = express();
const PORT = process.env.MOCK_SERVER_PORT || 3001;

app.use(express.json());

// Mock responses for variety
const mockResponses = [
  "I'm a mock AI assistant! I'm here to help you test the Discord bot.",
  "This is a simulated response from the mock OpenAI server.",
  "Hello! I'm responding from the mock server. How can I assist you today?",
  "I understand you said: '{message}'. This is just a test response!",
  "Mock server responding! Everything seems to be working correctly.",
];

// Chat completions endpoint
app.post('/v1/chat/completions', (req, res) => {
  const { messages, model, temperature, max_tokens } = req.body;

  console.log('[Mock Server] Received chat completion request:');
  console.log(`  Model: ${model || 'not specified'}`);
  console.log(`  Temperature: ${temperature || 'not specified'}`);
  console.log(`  Max tokens: ${max_tokens || 'not specified'}`);
  console.log(`  Messages: ${messages?.length || 0} messages`);

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: {
        message: 'Invalid request: messages array is required',
        type: 'invalid_request_error',
      },
    });
  }

  // Get the last user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const userContent = lastUserMessage?.content || '';

  // Choose a response (echo mode or random)
  let responseContent;
  if (userContent.length > 0) {
    // Echo the user's message with a prefix
    responseContent = `I received your message: "${userContent}". This is a mock response from the test server!`;
  } else {
    // Random canned response
    responseContent = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  // Build OpenAI-compatible response
  const response = {
    id: `chatcmpl-mock-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model || 'gpt-3.5-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: responseContent,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };

  console.log(`[Mock Server] Responding with: "${responseContent.substring(0, 50)}..."`);

  res.json(response);
});

// Models endpoint (optional, for completeness)
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'gpt-3.5-turbo',
        object: 'model',
        created: 1677610602,
        owned_by: 'openai',
      },
      {
        id: 'gpt-4',
        object: 'model',
        created: 1687882411,
        owned_by: 'openai',
      },
    ],
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock OpenAI server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Endpoint not found: ${req.method} ${req.path}`,
      type: 'invalid_request_error',
    },
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock OpenAI Server running on http://localhost:${PORT}`);
  console.log(`   Chat completions: POST http://localhost:${PORT}/v1/chat/completions`);
  console.log(`   Health check: GET http://localhost:${PORT}/health`);
  console.log(`   Models: GET http://localhost:${PORT}/v1/models\n`);
});
