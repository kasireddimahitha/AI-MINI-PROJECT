import { NextRequest, NextResponse } from "next/server";
import { getMeetingById, getChatHistory, deleteMeeting } from "@/utils/vectorStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const meeting = getMeetingById(id);
    
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    const chatHistory = getChatHistory(id);

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        meetingId: meeting.meetingId,
        title: meeting.meetingTitle,
        transcript: meeting.transcript,
        chatHistory,
        createdAt: meeting.createdAt,
        audioSource: meeting.audioSource,
      },
    });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const success = deleteMeeting(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
