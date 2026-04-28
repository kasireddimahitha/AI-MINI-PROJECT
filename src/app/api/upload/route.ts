import { NextRequest, NextResponse } from "next/server";
import { indexTranscript, addChatMessage } from "@/utils/vectorStore";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const meetingTitle = formData.get("meetingTitle") as string;
    const transcriptText = formData.get("transcript") as string;

    if (!file && !transcriptText) {
      return NextResponse.json(
        { error: "Either audio file or transcript text is required" },
        { status: 400 }
      );
    }

    let finalTranscript = transcriptText;

    // If audio file is provided, we need to transcribe it
    // For now, we'll return an instruction that audio needs to be transcribed
    if (file) {
      // Check if the API key for transcription is available
      // You can integrate with AssemblyAI, Google Cloud Speech-to-Text, etc.
      
      // For now, we'll return a status that requires transcription
      // In a real implementation, you would:
      // 1. Upload to AssemblyAI
      // 2. Wait for transcription
      // 3. Use the transcript
      
      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      
      if (!apiKey) {
        return NextResponse.json(
          { 
            error: "Audio transcription not configured. Please set ASSEMBLYAI_API_KEY or provide transcript text.",
            requiresManualTranscript: true,
            fileName: file.name,
          },
          { status: 400 }
        );
      }

      // TODO: Implement AssemblyAI transcription
      // For now, this is a placeholder
      finalTranscript = `[Audio file received: ${file.name}. Transcription feature coming soon.]`;
    }

    // Index the transcript
    const meetingId = await indexTranscript(
      finalTranscript,
      undefined,
      meetingTitle || "Untitled Meeting",
      file ? "uploaded" : "pasted"
    );

    return NextResponse.json({
      success: true,
      meetingId,
      message: "Meeting transcript saved successfully",
    });
  } catch (error) {
    console.error("Error uploading meeting:", error);
    return NextResponse.json(
      { error: "Failed to upload meeting" },
      { status: 500 }
    );
  }
}
