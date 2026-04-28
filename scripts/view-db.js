#!/usr/bin/env node

/**
 * Database Inspection Tool
 * Run with: node scripts/view-db.js
 */

const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(process.cwd(), ".chroma_db");
const DB_FILE = path.join(DB_DIR, "database.json");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function viewDatabase() {
  console.log("\n=== Meeting Notes Database Inspector ===\n");

  if (!fs.existsSync(DB_FILE)) {
    console.log("No database found at:", DB_FILE);
    console.log("Database will be created when you upload your first meeting transcript.\n");
    return;
  }

  try {
    const stats = fs.statSync(DB_FILE);
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));

    console.log("Database Location:", DB_FILE);
    console.log("File Size:", formatBytes(stats.size));
    console.log("Last Updated:", new Date(data.timestamp).toLocaleString());
    console.log("\n--- Indexed Transcripts ---\n");

    let totalChunks = 0;
    let totalWords = 0;

    Object.entries(data.transcripts).forEach(([, transcript]) => {
      console.log(`ID: ${transcript.id}`);
      console.log(`  Chunks: ${transcript.chunks.length}`);
      console.log(`  Words: ${transcript.wordCount}`);
      console.log(`  Created: ${new Date(transcript.createdAt).toLocaleString()}`);
      
      if (transcript.chunks.length > 0) {
        console.log(`  Preview: "${transcript.chunks[0].text.substring(0, 80)}..."`);
      }
      console.log();

      totalChunks += transcript.chunks.length;
      totalWords += transcript.wordCount;
    });

    console.log("--- Total Statistics ---");
    console.log(`Total Transcripts: ${Object.keys(data.transcripts).length}`);
    console.log(`Total Chunks: ${totalChunks}`);
    console.log(`Total Words: ${totalWords}`);
    console.log();
  } catch (error) {
    console.error("Error reading database:", error.message);
  }
}

function exportDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("No database found");
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error exporting database:", error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === "export") {
  exportDatabase();
} else {
  viewDatabase();
}

