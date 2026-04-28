import "server-only";
import path from "path";
import fs from "fs";
import { chunkText, getRelevantChunks } from "./embedding";

interface StoredTranscript {
  id: string;
  chunks: Array<{
    id: string;
    text: string;
  }>;
  createdAt: number;
  wordCount: number;
}

interface Database {
  transcripts: {
    [key: string]: StoredTranscript;
  };
  timestamp: number;
}

const DB_DIR = path.join(process.cwd(), ".chroma_db");
const DB_FILE = path.join(DB_DIR, "database.json");

let currentTranscript: StoredTranscript | null = null;
let currentTranscriptId: string | null = null;

/**
 * Ensure database directory exists
 */
function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * Load database from file
 */
function loadDatabase(): Database {
  ensureDbDir();
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  }
  return { transcripts: {}, timestamp: Date.now() };
}

/**
 * Save database to file
 */
function saveDatabase(db: Database): void {
  ensureDbDir();
  db.timestamp = Date.now();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log(`✓ Saved to ${DB_FILE}`);
}

/**
 * Index a transcript using efficient chunking
 */
export async function indexTranscript(
  transcript: string,
  transcriptId?: string
): Promise<void> {
  const id = transcriptId || `transcript_${Date.now()}`;

  try {
    // Chunk the transcript
    const chunks = await chunkText(transcript);

    // Create chunk objects with IDs
    const chunkObjects = chunks.map((text, index) => ({
      id: `${id}_chunk_${index}`,
      text,
    }));

    // Create transcript object
    const transcriptObj: StoredTranscript = {
      id,
      chunks: chunkObjects,
      createdAt: Date.now(),
      wordCount: transcript.split(/\s+/).length,
    };

    // Save to database
    const db = loadDatabase();
    db.transcripts[id] = transcriptObj;
    saveDatabase(db);

    // Keep in memory for current session
    currentTranscript = transcriptObj;
    currentTranscriptId = id;

    console.log(`Indexed ${chunks.length} chunks from transcript (${transcriptObj.wordCount} words): ${id}`);
  } catch (error) {
    console.error("Error indexing transcript:", error);
    throw error;
  }
}

/**
 * Retrieve relevant chunks using text-based search
 */
export async function retrieveRelevantChunks(
  query: string,
  topK: number = 5
): Promise<string[]> {
  try {
    let chunks: Array<{ id: string; text: string }> = [];

    // Try to load from database first
    try {
      const db = loadDatabase();
      if (Object.keys(db.transcripts).length > 0) {
        // Get the most recent transcript
        const transcriptId = Object.keys(db.transcripts).sort()
          .reverse()[0];
        chunks = db.transcripts[transcriptId].chunks;
      }
    } catch (dbError) {
      console.warn("Could not load from database, using memory");
    }

    // Fallback to in-memory transcript
    if (chunks.length === 0 && currentTranscript) {
      chunks = currentTranscript.chunks;
    }

    if (chunks.length === 0) {
      console.warn("No chunks available for retrieval");
      return [];
    }

    // Get relevant chunks using text-based scoring
    const relevant = getRelevantChunks(query, chunks, topK);

    if (relevant.length === 0) {
      console.log("No relevant chunks found for query");
      return [];
    }

    console.log(
      `Retrieved ${relevant.length} relevant chunks for query`
    );
    return relevant.map(r => r.text);
  } catch (error) {
    console.error("Error retrieving chunks:", error);
    return [];
  }
}

/**
 * Get all transcripts in database
 */
export function getAllTranscripts(): Array<{
  id: string;
  chunkCount: number;
  wordCount: number;
  createdAt: string;
}> {
  const db = loadDatabase();
  return Object.values(db.transcripts).map(t => ({
    id: t.id,
    chunkCount: t.chunks.length,
    wordCount: t.wordCount,
    createdAt: new Date(t.createdAt).toISOString(),
  }));
}

/**
 * Clear the store
 */
export function clearStore(): void {
  currentTranscript = null;
  currentTranscriptId = null;

  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log("Database cleared");
  }
}

/**
 * Get current transcript ID
 */
export function getCurrentTranscriptId(): string | null {
  return currentTranscriptId;
}

/**
 * Get database info
 */
export function getDatabaseInfo(): {
  location: string;
  exists: boolean;
  size: string;
  transcriptCount: number;
  totalChunks: number;
  timestamp?: string;
} {
  ensureDbDir();
  const exists = fs.existsSync(DB_FILE);
  let size = "0 B";
  let transcriptCount = 0;
  let totalChunks = 0;
  let timestamp: string | undefined;

  if (exists) {
    const stats = fs.statSync(DB_FILE);
    size = `${(stats.size / 1024).toFixed(2)} KB`;

    const db = loadDatabase();
    transcriptCount = Object.keys(db.transcripts).length;
    totalChunks = Object.values(db.transcripts).reduce(
      (sum, t) => sum + t.chunks.length,
      0
    );
    timestamp = new Date(db.timestamp).toISOString();
  }

  return {
    location: DB_FILE,
    exists,
    size,
    transcriptCount,
    totalChunks,
    timestamp,
  };
}

/**
 * Export database as JSON
 */
export function exportDatabase(): Database | null {
  if (!fs.existsSync(DB_FILE)) {
    return null;
  }
  return loadDatabase();
}