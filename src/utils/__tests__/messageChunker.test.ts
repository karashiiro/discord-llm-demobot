import { describe, it, expect } from '@jest/globals';
import { chunkMessage } from '../messageChunker.js';

/**
 * Tests for messageChunker - Message Splitting Logic
 *
 * These tests ensure that:
 * 1. Messages under the limit are not split
 * 2. Long messages are split at appropriate boundaries
 * 3. Sentence boundaries are preferred for readability
 * 4. Newline and space boundaries are used as fallbacks
 * 5. Hard breaks occur when no good boundary exists
 * 6. Edge cases are handled correctly
 */
describe('chunkMessage', () => {
  const DISCORD_LIMIT = 2000;

  describe('Messages under limit', () => {
    it('should return single chunk for short message', () => {
      // Arrange
      const text = 'Hello, world!';

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toEqual([text]);
      expect(result).toHaveLength(1);
    });

    it('should return single chunk for message exactly at limit', () => {
      // Arrange
      const text = 'a'.repeat(DISCORD_LIMIT);

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toEqual([text]);
      expect(result).toHaveLength(1);
    });

    it('should return single chunk for message one char under limit', () => {
      // Arrange
      const text = 'a'.repeat(DISCORD_LIMIT - 1);

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toEqual([text]);
      expect(result).toHaveLength(1);
    });

    it('should return single chunk for empty string', () => {
      // Arrange
      const text = '';

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toEqual(['']);
      expect(result).toHaveLength(1);
    });
  });

  describe('Sentence boundary splitting', () => {
    it('should split at period followed by space', () => {
      // Arrange
      const sentence1 = 'a'.repeat(1500) + '.';
      const sentence2 = ' ' + 'b'.repeat(600);
      const text = sentence1 + sentence2;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(sentence1.trim());
      expect(result[1]).toBe(sentence2.trim());
    });

    it('should split at exclamation mark followed by space', () => {
      // Arrange
      const sentence1 = 'a'.repeat(1500) + '!';
      const sentence2 = ' ' + 'b'.repeat(600);
      const text = sentence1 + sentence2;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(sentence1.trim());
      expect(result[1]).toBe(sentence2.trim());
    });

    it('should split at question mark followed by space', () => {
      // Arrange
      const sentence1 = 'a'.repeat(1500) + '?';
      const sentence2 = ' ' + 'b'.repeat(600);
      const text = sentence1 + sentence2;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(sentence1.trim());
      expect(result[1]).toBe(sentence2.trim());
    });

    it('should split at last sentence boundary within limit', () => {
      // Arrange
      const part1 = 'First sentence. ';
      const part2 = 'a'.repeat(1900) + '. ';
      const part3 = 'b'.repeat(500);
      const text = part1 + part2 + part3;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('First sentence');
      expect(result[1]).toContain('b');
    });

    it('should NOT split at sentence boundary if too early (< 50% through)', () => {
      // Arrange
      // Early sentence at position 100, then fill to 2100 chars
      const earlySentence = 'a'.repeat(100) + '. ';
      const longPart = 'b'.repeat(2000);
      const text = earlySentence + longPart;

      // Act
      const result = chunkMessage(text);

      // Assert
      // Should not split at the early period, should use another boundary
      expect(result[0]).not.toBe(earlySentence.trim());
      expect(result[0]!.length).toBeGreaterThan(100);
    });
  });

  describe('Newline boundary splitting', () => {
    it('should split at newline when no sentence boundary exists', () => {
      // Arrange
      const line1 = 'a'.repeat(1500);
      const line2 = 'b'.repeat(600);
      const text = line1 + '\n' + line2;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(line1);
      expect(result[1]).toBe(line2);
    });

    it('should prefer sentence boundary over newline', () => {
      // Arrange
      const part1 = 'a'.repeat(1500) + '.';
      const part2 = ' b'.repeat(300);
      const part3 = '\nc'.repeat(300);
      const text = part1 + part2 + part3;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      // Should split at sentence, not newline
      expect(result[0]).toContain('a');
      expect(result[0]).not.toContain('c');
    });

    it('should NOT split at newline if too early (< 50% through)', () => {
      // Arrange
      const earlyLine = 'a'.repeat(100) + '\n';
      const longPart = 'b'.repeat(2000);
      const text = earlyLine + longPart;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result[0]).not.toBe(earlyLine.trim());
      expect(result[0]!.length).toBeGreaterThan(100);
    });
  });

  describe('Space boundary splitting', () => {
    it('should split at space when no sentence or newline boundary exists', () => {
      // Arrange
      const word1 = 'a'.repeat(1500);
      const word2 = 'b'.repeat(600);
      const text = word1 + ' ' + word2;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(word1);
      expect(result[1]).toBe(word2);
    });

    it('should NOT split at space if too early (< 50% through)', () => {
      // Arrange
      const earlySpace = 'a'.repeat(100) + ' ';
      const longPart = 'b'.repeat(2000);
      const text = earlySpace + longPart;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result[0]).not.toBe(earlySpace.trim());
      expect(result[0]!.length).toBeGreaterThan(100);
    });
  });

  describe('Hard break splitting', () => {
    it('should hard break at limit when no boundaries exist', () => {
      // Arrange - 2500 chars with no spaces, newlines, or sentence breaks
      const text = 'a'.repeat(2500);

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('a'.repeat(DISCORD_LIMIT));
      expect(result[1]).toBe('a'.repeat(500));
    });

    it('should hard break when all boundaries are too early', () => {
      // Arrange - space at position 100, rest is continuous
      const earlySpace = 'a'.repeat(100) + ' ';
      const continuous = 'b'.repeat(2500);
      const text = earlySpace + continuous;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result.length).toBeGreaterThan(1);
      // First chunk should be close to limit
      expect(result[0]!.length).toBeGreaterThan(1000);
      expect(result[0]!.length).toBeLessThanOrEqual(DISCORD_LIMIT);
    });
  });

  describe('Multiple chunks', () => {
    it('should split very long text into multiple chunks', () => {
      // Arrange - 5000 chars with sentences every 500 chars
      let text = '';
      for (let i = 0; i < 10; i++) {
        text += 'a'.repeat(500) + '. ';
      }

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result.length).toBeGreaterThan(2);
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_LIMIT);
      });
    });

    it('should handle multiple chunks with different boundary types', () => {
      // Arrange - mix of sentence, newline, and space boundaries
      const part1 = 'a'.repeat(1900) + '. ';
      const part2 = 'b'.repeat(1900) + '\n';
      const part3 = 'c'.repeat(1900) + ' ';
      const part4 = 'd'.repeat(500);
      const text = part1 + part2 + part3 + part4;

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_LIMIT);
      });
    });
  });

  describe('Whitespace handling', () => {
    it('should trim chunks', () => {
      // Arrange
      const text = '   ' + 'a'.repeat(1500) + '.   ' + 'b'.repeat(600) + '   ';

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).not.toMatch(/^\s/);
      expect(result[0]).not.toMatch(/\s$/);
      expect(result[1]).not.toMatch(/^\s/);
      expect(result[1]).not.toMatch(/\s$/);
    });

    it('should skip empty chunks after trimming', () => {
      // Arrange - create scenario where trimming might leave empty chunk
      const text = 'a'.repeat(DISCORD_LIMIT) + '     ';

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(1);
      expect(result.every((chunk) => chunk.length > 0)).toBe(true);
    });
  });

  describe('Custom max length', () => {
    it('should respect custom max length', () => {
      // Arrange
      const customLimit = 100;
      const text = 'a'.repeat(250);

      // Act
      const result = chunkMessage(text, customLimit);

      // Assert
      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(customLimit);
      });
    });

    it('should split at sentence with custom limit', () => {
      // Arrange
      const customLimit = 100;
      const text = 'a'.repeat(80) + '. ' + 'b'.repeat(80);

      // Act
      const result = chunkMessage(text, customLimit);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('a'.repeat(80) + '.');
      expect(result[1]).toBe('b'.repeat(80));
    });
  });

  describe('Edge cases', () => {
    it('should handle text with only punctuation', () => {
      // Arrange
      const text = '.'.repeat(2500);

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_LIMIT);
      });
    });

    it('should handle text with many consecutive newlines', () => {
      // Arrange
      const text = 'a'.repeat(1000) + '\n'.repeat(100) + 'b'.repeat(1000);

      // Act
      const result = chunkMessage(text);

      // Assert
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_LIMIT);
      });
    });

    it('should handle text with many consecutive spaces', () => {
      // Arrange
      const text = 'a'.repeat(1000) + ' '.repeat(100) + 'b'.repeat(1000);

      // Act
      const result = chunkMessage(text);

      // Assert
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_LIMIT);
      });
    });

    it('should handle realistic message with mixed content', () => {
      // Arrange
      const text = `This is a realistic message with multiple sentences. It has punctuation! And questions?

It also has newlines and proper formatting. Here's a longer section: ${'x'.repeat(1800)}

And then some more text at the end with proper sentences. This should split nicely.`;

      // Act
      const result = chunkMessage(text);

      // Assert
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_LIMIT);
        expect(chunk.length).toBeGreaterThan(0);
      });
    });

    it('should handle text that is exactly one char over limit', () => {
      // Arrange
      const text = 'a'.repeat(DISCORD_LIMIT + 1);

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('a'.repeat(DISCORD_LIMIT));
      expect(result[1]).toBe('a');
    });

    it('should handle text with sentence at exact limit boundary', () => {
      // Arrange
      const text = 'a'.repeat(DISCORD_LIMIT - 1) + '. b';

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]!.length).toBeLessThanOrEqual(DISCORD_LIMIT);
      expect(result[1]).toBe('b');
    });
  });

  describe('Boundary preference order', () => {
    it('should prefer sentence > newline > space > hard break', () => {
      // Arrange - All boundaries at valid positions (> 50% through)
      const base = 'a'.repeat(1400);
      const withSpace = base + ' x';
      const withNewline = withSpace + '\ny';
      const withSentence = withNewline + '. ';
      const text = withSentence + 'z' + 'b'.repeat(1000);

      // Act
      const result = chunkMessage(text);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Should split at sentence (the period)
      expect(result[0]).toContain('.');
      expect(result[0]).toContain('y');
    });
  });
});
