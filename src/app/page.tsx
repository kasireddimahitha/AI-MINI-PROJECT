"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import styles from "./page.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSend = async (queryOverride?: string) => {
    const query = queryOverride || input;
    if (!query.trim() || !transcript.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, query, history: messages }),
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
      </header>

      <main className={styles.main}>
        {/* Sidebar: Transcript Upload & Edit */}
        <section className={`glass ${styles.sidebar}`}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 500 }}>
            Transcript Context
          </h2>
          
          <div 
            className={styles.uploadArea}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className={styles.uploadIcon}>Upload</p>
            <p className={styles.uploadText}>Upload a meeting transcript (.txt)</p>
            <input 
              type="file" 
              accept=".txt" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
          </div>
          
          <div className={styles.divider}>OR</div>

          <div className={styles.textAreaWrapper}>
            <label htmlFor="transcript" className={styles.uploadText} style={{ textAlign: 'left' }}>
              Paste transcript text below:
            </label>
            <textarea
              id="transcript"
              className={styles.textArea}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="E.g. [00:00] Alice: Welcome everyone. Today we need to decide on the Q3 budget..."
            />
          </div>
        </section>

        {/* Main Area: Chat Interface */}
        <section className={`glass ${styles.chatArea}`}>
          <div className={styles.chatHeader}>
            <h2>Ask about the meeting</h2>
          </div>

          <div className={styles.chatMessages}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>Ready to analyze your meeting</h3>
                <p style={{ maxWidth: '400px' }}>Upload or paste a transcript, then ask questions to extract decisions, action items, or summarize discussions.</p>
                <div className={styles.quickActions}>
                  <button 
                    className={styles.pillBtn} 
                    onClick={() => handleSend("What are the key decisions made?")}
                    disabled={!transcript.trim()}
                  >
                    Key Decisions
                  </button>
                  <button 
                    className={styles.pillBtn} 
                    onClick={() => handleSend("List all action items with assignees.")}
                    disabled={!transcript.trim()}
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
              placeholder={transcript.trim() ? "Ask a question..." : "Please add a transcript first..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!transcript.trim() || isLoading}
            />
            <button 
              className={styles.sendButton} 
              onClick={() => handleSend()}
              disabled={!input.trim() || !transcript.trim() || isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
