import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { indexTranscript, retrieveRelevantChunks, clearStore } from "@/utils/vectorStore";

export async function POST(req: NextRequest) {
  try {
    const { transcript, query, history, newTranscript } = await req.json();

    if (!transcript || !query) {
      return NextResponse.json(
        { error: "Transcript and query are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Index the transcript if it's new or changed
    if (newTranscript || transcript.length > 100) {
      await indexTranscript(transcript);
    }

    // Retrieve relevant chunks using efficient text-based search
    const relevantChunks = await retrieveRelevantChunks(query, 5);
    const context = relevantChunks.length > 0 
      ? relevantChunks.join("\n\n") 
      : "No relevant context found in the transcript.";

    // Construct the prompt with retrieved context
    const systemInstruction = `
You are an expert Meeting Notes Summariser and Assistant.
Answer questions about meeting transcripts with clarity and precision.

INSTRUCTIONS:
1. Be Direct: Answer concisely without unnecessary explanations.
2. No Quotes: Do not include long quote blocks or "Quote:" prefixes.
3. Use Context Only: Base answers ONLY on the provided transcript chunks.
4. Clear Format: Use short bullet points when listing items. Use bold for emphasis.
5. Be Helpful: If information is not in the transcript, say "Not mentioned in the transcript."

TRANSCRIPT CONTEXT:
---
${context}
---

Answer the question directly and clearly.
`;

    let fullPrompt = systemInstruction + "\n\nUser Question: " + query;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const answer = response.text || "No response generated.";

    return NextResponse.json({ answer, context: relevantChunks });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during AI processing" },
      { status: 500 }
    );
  }
}
