import "server-only";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

/**
 * Split text into overlapping chunks for efficient searching
 */
export async function chunkText(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  return splitter.splitText(text);
}

/**
 * Simple text similarity scoring - counts word matches
 * Higher score = more relevant
 */
export function calculateRelevanceScore(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textLower = text.toLowerCase();
  
  let score = 0;
  
  // Exact phrase match (highest score)
  if (textLower.includes(query.toLowerCase())) {
    score += 100;
  }
  
  // Individual word matches
  for (const word of queryWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      score += matches.length * 10;
    }
  }
  
  return score;
}

/**
 * Get relevant chunks based on text similarity
 */
export function getRelevantChunks(
  query: string,
  chunks: Array<{ id: string; text: string }>,
  topK: number = 5
): Array<{ id: string; text: string; score: number }> {
  const scored = chunks.map(chunk => ({
    ...chunk,
    score: calculateRelevanceScore(query, chunk.text),
  }));
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}