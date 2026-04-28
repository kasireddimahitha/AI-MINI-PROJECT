import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { indexTranscript, retrieveRelevantChunks, addChatMessage, getMeetingById } from "@/utils/vectorStore";

export async function POST(req: NextRequest) {
  try {
    const { transcript, query, history, newTranscript, meetingId } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Allow either transcript or meetingId
    let currentTranscript = transcript;
    let currentMeetingId = meetingId;

    if (meetingId && !transcript) {
      const meeting = getMeetingById(meetingId);
      if (!meeting) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }
      currentTranscript = meeting.transcript;
      currentMeetingId = meetingId;
    }

    if (!currentTranscript) {
      return NextResponse.json(
        { error: "Transcript or valid meetingId is required" },
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
    if (newTranscript || (transcript && transcript.length > 100)) {
      const id = await indexTranscript(transcript || currentTranscript);
      currentMeetingId = id;
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

    // Save chat messages if meetingId is provided
    if (currentMeetingId) {
      addChatMessage(currentMeetingId, "user", query);
      addChatMessage(currentMeetingId, "assistant", answer);
    }

    return NextResponse.json({ 
      answer, 
      context: relevantChunks,
      meetingId: currentMeetingId,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during AI processing" },
      { status: 500 }
    );
  }
}
