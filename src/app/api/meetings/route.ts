import { NextRequest, NextResponse } from "next/server";
import { getAllTranscripts } from "@/utils/vectorStore";

export async function GET(req: NextRequest) {
  try {
    const meetings = getAllTranscripts();
    
    return NextResponse.json({
      success: true,
      meetings: meetings.map(m => ({
        id: m.id,
        meetingId: m.meetingId || `MID-${m.id}`,
        title: m.meetingTitle || "Untitled Meeting",
        createdAt: m.createdAt,
        wordCount: m.wordCount,
        audioSource: m.audioSource || "pasted",
      })),
      total: meetings.length,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings", success: false },
      { status: 500 }
    );
  }
}
