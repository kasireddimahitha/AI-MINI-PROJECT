"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, Trash2 } from "lucide-react";
import styles from "./page.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Meeting = {
  id: string;
  meetingId: string;
  title: string;
  createdAt: string;
  wordCount: number;
  audioSource?: string;
};

export default function Home() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Load previous meetings
  useEffect(() => {
    fetchMeetings();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch("/api/meetings");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    }
  };

  const loadMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/meeting/${id}`);
      if (res.ok) {
        const data = await res.json();
        const meeting = data.meeting;
        setSelectedMeetingId(id);
        setTranscript(meeting.transcript);
        setMeetingTitle(meeting.title);
        setMessages(meeting.chatHistory || []);
      }
    } catch (error) {
      console.error("Error loading meeting:", error);
    }
  };

  const newMeeting = () => {
    setSelectedMeetingId(null);
    setTranscript("");
    setMeetingTitle("");
    setMessages([]);
    setInput("");
  };

  const handleDeleteMeeting = async (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
      return;
    }

    setIsDeletingMeeting(meetingId);
    try {
      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMeetings(meetings.filter(m => m.id !== meetingId));
        if (selectedMeetingId === meetingId) {
          newMeeting();
        }
      } else {
        alert("Failed to delete meeting");
      }
    } catch (error) {
      console.error("Error deleting meeting:", error);
      alert("Error deleting meeting");
    } finally {
      setIsDeletingMeeting(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setTranscript(text);
      }
    };
    reader.readAsText(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, show a message that transcription is needed
    alert(
      "Audio file received! To enable automatic transcription, set the ASSEMBLYAI_API_KEY environment variable. " +
      "For now, please manually transcribe the audio or paste the transcript text."
    );
  };

  const handleSaveMeeting = async () => {
    if (!transcript?.trim()) return;

    setIsSavingMeeting(true);
    try {
      const formData = new FormData();
      formData.append("transcript", transcript);
      formData.append("meetingTitle", meetingTitle || `Meeting ${new Date().toLocaleDateString()}`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedMeetingId(data.meetingId);
        await fetchMeetings();
        loadMeeting(data.meetingId);
      }
    } catch (error) {
      console.error("Error saving meeting:", error);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleSend = async (queryOverride?: string) => {
    const query = queryOverride || input;
    if (!query.trim() || !transcript?.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript, 
          query, 
          history: messages,
          meetingId: selectedMeetingId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please ensure your Gemini API key is set." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Basic markdown-like rendering for the chat
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('> ')) {
        return <blockquote key={i}>{line.replace('> ', '')}</blockquote>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <ul key={i}><li>{line.replace(/^[-*]\s/, '')}</li></ul>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <ol key={i}><li>{line.replace(/^\d+\.\s/, '')}</li></ol>;
      }
      if (line.trim() === '') return <br key={i} />;
      
      // Handle basic bold syntax
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Meeting Notes Summariser</h1>
        <button className={styles.newMeetingBtn} onClick={newMeeting}>
          <Plus size={20} /> New Meeting
        </button>
      </header>

      <main className={styles.main}>
        {/* Sidebar: Previous Meetings */}
        <aside className={`glass ${styles.meetingsSidebar}`}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '1rem' }}>
            Previous Meetings ({meetings.length})
          </h3>
          
          <div className={styles.meetingsList}>
            {meetings.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                No meetings yet. Create one to get started!
              </p>
            ) : (
              meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={`${styles.meetingItem} ${selectedMeetingId === meeting.id ? styles.active : ""}`}
                  onClick={() => loadMeeting(meeting.id)}
                >
                  <div className={styles.meetingInfo}>
                    <div className={styles.meetingTitle}>{meeting.title}</div>
                    <div className={styles.meetingMeta}>
                      ID: {meeting.meetingId ? meeting.meetingId.substring(4, 14) : meeting.id.substring(0, 10)}
                    </div>
                    <div className={styles.meetingDate}>
                      {new Date(meeting.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteMeeting(e, meeting.id)}
                    disabled={isDeletingMeeting === meeting.id}
                    title="Delete meeting"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Area: Transcript & Chat */}
        <div className={styles.mainContent}>
          {/* Sidebar: Transcript Upload & Edit */}
          <section className={`glass ${styles.sidebar}`}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Transcript Context
            </h2>
            
            {selectedMeetingId && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                <strong>Meeting ID:</strong> {meetings.find(m => m.id === selectedMeetingId)?.meetingId || selectedMeetingId.substring(0, 15)}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="meetingTitle" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                Meeting Title:
              </label>
              <input
                id="meetingTitle"
                type="text"
                className={styles.textInput}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="E.g., Q3 Budget Review"
              />
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '1rem', marginBottom: '0.5rem' }}>
              Upload Options
            </h3>
            
            <div className={styles.uploadButtonGroup}>
              <div 
                className={styles.uploadArea}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className={styles.uploadIcon}>📄</p>
                <p className={styles.uploadText}>Upload Transcript</p>
                <input 
                  type="file" 
                  accept=".txt" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                />
              </div>

              <div 
                className={styles.uploadArea}
                onClick={() => audioInputRef.current?.click()}
              >
                <p className={styles.uploadIcon}>🎙️</p>
                <p className={styles.uploadText}>Upload Audio</p>
                <input 
                  type="file" 
                  accept="audio/*" 
                  ref={audioInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleAudioUpload} 
                />
              </div>
            </div>
            
            <div className={styles.divider}>OR</div>

            <div className={styles.textAreaWrapper}>
              <label htmlFor="transcript" className={styles.uploadText} style={{ textAlign: 'left' }}>
                Paste transcript text:
              </label>
              <textarea
                id="transcript"
                className={styles.textArea}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="E.g. [00:00] Alice: Welcome everyone. Today we need to decide on the Q3 budget..."
              />
            </div>

            {!selectedMeetingId && transcript?.trim() && (
              <button 
                className={styles.saveMeetingBtn}
                onClick={handleSaveMeeting}
                disabled={isSavingMeeting}
              >
                {isSavingMeeting ? "Saving..." : "Save Meeting"}
              </button>
            )}
          </section>

          {/* Main Area: Chat Interface */}
          <section className={`glass ${styles.chatArea}`}>
            <div className={styles.chatHeader}>
              <h2>Ask about the meeting</h2>
              {selectedMeetingId && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Chatting with: {meetingTitle}
                </div>
              )}
            </div>

            <div className={styles.chatMessages}>
              {messages.length === 0 && !selectedMeetingId ? (
                <div className={styles.emptyState}>
                  <h3>Ready to analyze your meeting</h3>
                  <p style={{ maxWidth: '400px' }}>Upload or paste a transcript, then ask questions to extract decisions, action items, or summarize discussions.</p>
                  <div className={styles.quickActions}>
                    <button 
                      className={styles.pillBtn} 
                      onClick={() => handleSend("What are the key decisions made?")}
                      disabled={!transcript?.trim()}
                    >
                      Key Decisions
                    </button>
                    <button 
                      className={styles.pillBtn} 
                      onClick={() => handleSend("List all action items with assignees.")}
                      disabled={!transcript?.trim()}
                    >
                      Action Items
                    </button>
                  </div>
                </div>
              ) : messages.length === 0 && selectedMeetingId ? (
                <div className={styles.emptyState}>
                  <h3>Start chatting</h3>
                  <p>Ask questions about this meeting to get started.</p>
                  <div className={styles.quickActions}>
                    <button 
                      className={styles.pillBtn} 
                      onClick={() => handleSend("What are the key decisions made?")}
                      disabled={!transcript?.trim()}
                    >
                      Key Decisions
                    </button>
                    <button 
                      className={styles.pillBtn} 
                      onClick={() => handleSend("List all action items with assignees.")}
                      disabled={!transcript?.trim()}
                    >
                      Action Items
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`${styles.message} ${styles[m.role]}`}>
                    <div className={`${styles.avatar} ${styles[m.role]}`}>
                      <span>{m.role === 'user' ? 'You' : 'AI'}</span>
                    </div>
                    <div className={styles.messageContent}>
                      {renderMessageContent(m.content)}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className={`${styles.message} ${styles.assistant}`}>
                  <div className={`${styles.avatar} ${styles.assistant}`}>
                    <span>AI</span>
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.loadingDots}>
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.chatInputWrapper}>
              <textarea
                className={styles.chatInput}
                placeholder={transcript?.trim() ? "Ask a question..." : "Please add a transcript first..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!transcript?.trim() || isLoading}
              />
              <button 
                className={styles.sendButton} 
                onClick={() => handleSend()}
                disabled={!input.trim() || !transcript?.trim() || isLoading}
              >
                <Send size={20} />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
