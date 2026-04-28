import "server-only";
import path from "path";
import fs from "fs";
import { chunkText, getRelevantChunks } from "./embedding";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface StoredTranscript {
  id: string;
  meetingId: string;
  meetingTitle: string;
  transcript: string;
  chunks: Array<{
    id: string;
    text: string;
  }>;
  chatHistory: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  audioSource?: string; // 'uploaded', 'pasted', or 'transcribed'
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
  transcriptId?: string,
  meetingTitle?: string,
  audioSource?: string
): Promise<string> {
  const id = transcriptId || `meeting_${Date.now()}`;
  const meetingId = `MID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Chunk the transcript
    const chunks = await chunkText(transcript);

    // Create chunk objects with IDs
    const chunkObjects = chunks.map((text, index) => ({
      id: `${id}_chunk_${index}`,
      text,
    }));

    const now = Date.now();

    // Create transcript object
    const transcriptObj: StoredTranscript = {
      id,
      meetingId,
      meetingTitle: meetingTitle || `Meeting ${new Date(now).toLocaleDateString()}`,
      transcript,
      chunks: chunkObjects,
      chatHistory: [],
      createdAt: now,
      updatedAt: now,
      wordCount: transcript.split(/\s+/).length,
      audioSource: audioSource || 'pasted',
    };

    // Save to database
    const db = loadDatabase();
    db.transcripts[id] = transcriptObj;
    saveDatabase(db);

    // Keep in memory for current session
    currentTranscript = transcriptObj;
    currentTranscriptId = id;

    console.log(`Indexed ${chunks.length} chunks from transcript (${transcriptObj.wordCount} words): ${id}`);
    return id;
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
  meetingId: string;
  meetingTitle: string;
  chunkCount: number;
  wordCount: number;
  createdAt: string;
  audioSource?: string;
}> {
  const db = loadDatabase();
  return Object.values(db.transcripts)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(t => ({
      id: t.id,
      meetingId: t.meetingId,
      meetingTitle: t.meetingTitle,
      chunkCount: t.chunks.length,
      wordCount: t.wordCount,
      createdAt: new Date(t.createdAt).toISOString(),
      audioSource: t.audioSource,
    }));
}

/**
 * Get a specific meeting by ID
 */
export function getMeetingById(meetingId: string): {
  id: string;
  meetingId: string;
  meetingTitle: string;
  transcript: string;
  chatHistory: ChatMessage[];
  createdAt: string;
  audioSource?: string;
} | null {
  const db = loadDatabase();
  const meeting = Object.values(db.transcripts).find(t => t.id === meetingId);
  
  if (!meeting) return null;

  return {
    id: meeting.id,
    meetingId: meeting.meetingId,
    meetingTitle: meeting.meetingTitle,
    transcript: meeting.transcript,
    chatHistory: meeting.chatHistory,
    createdAt: new Date(meeting.createdAt).toISOString(),
    audioSource: meeting.audioSource,
  };
}

/**
 * Add a chat message to a meeting's history
 */
export function addChatMessage(
  meetingId: string,
  role: "user" | "assistant",
  content: string
): boolean {
  const db = loadDatabase();
  const meeting = Object.values(db.transcripts).find(t => t.id === meetingId);
  
  if (!meeting) return false;

  meeting.chatHistory.push({
    role,
    content,
    timestamp: Date.now(),
  });
  
  meeting.updatedAt = Date.now();
  saveDatabase(db);
  return true;
}

/**
 * Get chat history for a meeting
 */
export function getChatHistory(meetingId: string): ChatMessage[] {
  const db = loadDatabase();
  const meeting = Object.values(db.transcripts).find(t => t.id === meetingId);
  
  if (!meeting) return [];
  
  return meeting.chatHistory;
}

/**
 * Delete a meeting by ID
 */
export function deleteMeeting(meetingId: string): boolean {
  const db = loadDatabase();
  
  if (!db.transcripts[meetingId]) {
    return false;
  }
  
  delete db.transcripts[meetingId];
  saveDatabase(db);
  
  console.log(`Deleted meeting: ${meetingId}`);
  return true;
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