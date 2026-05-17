/** Strip common markdown artifacts the model still emits. */
export function normalizeChatText(text) {
  if (!text) return '';

  let out = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/^[-|:\s]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

/**
 * Split assistant text into renderable blocks (paragraphs and bullet lists).
 */
export function parseChatBlocks(text) {
  const normalized = normalizeChatText(text);
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks = [];
  let bulletBuffer = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      blocks.push({ type: 'list', items: [...bulletBuffer] });
      bulletBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }

    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    flushBullets();
    blocks.push({ type: 'paragraph', text: line });
  }

  flushBullets();
  return blocks;
}
