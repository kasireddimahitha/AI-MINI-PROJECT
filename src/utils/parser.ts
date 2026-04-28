export function extractSpeaker(line: string): string | null {
  const match = line.match(/^\[?\d{2}:\d{2}\]?\s*([^:]+):/);
  if (match && match[1]) {
    return match[1].trim();
  }
  const simpleMatch = line.match(/^([^:]+):/);
  if (simpleMatch && simpleMatch[1]) {
    return simpleMatch[1].trim();
  }
  return null;
}

export function isActionItem(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes("action item") || lower.includes("will do") || lower.includes("need to");
}
