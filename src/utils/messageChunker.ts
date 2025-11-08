/**
 * Discord's message character limit
 */
const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Split a long message into chunks that fit within Discord's character limit.
 * Attempts to split at sentence boundaries to maintain readability.
 *
 * @param text The text to split
 * @param maxLength Maximum length per chunk (default: Discord's 2000 char limit)
 * @returns Array of text chunks
 */
export function chunkMessage(text: string, maxLength = DISCORD_MESSAGE_LIMIT): string[] {
  // If the text fits in a single message, return it as-is
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    // If what's left fits in one chunk, add it and we're done
    if (remainingText.length <= maxLength) {
      chunks.push(remainingText);
      break;
    }

    // Find a good breaking point within the limit
    let chunkEnd = maxLength;

    // Try to break at a sentence boundary (. ! ?)
    const sentenceBreak = findLastSentenceBreak(remainingText.substring(0, maxLength));
    if (sentenceBreak > 0 && sentenceBreak > maxLength * 0.5) {
      // Use sentence break if it's not too early (at least 50% through)
      chunkEnd = sentenceBreak;
    } else {
      // Try to break at a newline
      const newlineBreak = remainingText.lastIndexOf('\n', maxLength);
      if (newlineBreak > 0 && newlineBreak > maxLength * 0.5) {
        chunkEnd = newlineBreak;
      } else {
        // Try to break at a space
        const spaceBreak = remainingText.lastIndexOf(' ', maxLength);
        if (spaceBreak > 0 && spaceBreak > maxLength * 0.5) {
          chunkEnd = spaceBreak;
        }
        // Otherwise, hard break at maxLength (chunkEnd already set)
      }
    }

    // Extract the chunk and add it
    const chunk = remainingText.substring(0, chunkEnd).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move to the next chunk
    remainingText = remainingText.substring(chunkEnd).trim();
  }

  return chunks;
}

/**
 * Find the last sentence-ending punctuation in the text
 * @param text Text to search
 * @returns Index after the punctuation, or -1 if not found
 */
function findLastSentenceBreak(text: string): number {
  // Look for sentence-ending punctuation followed by space or end of string
  const patterns = [
    /[.!?]\s/g, // Punctuation followed by space
    /[.!?]$/g, // Punctuation at end
  ];

  let lastIndex = -1;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      lastIndex = Math.max(lastIndex, match.index + match[0].length);
    }
  }

  return lastIndex;
}
