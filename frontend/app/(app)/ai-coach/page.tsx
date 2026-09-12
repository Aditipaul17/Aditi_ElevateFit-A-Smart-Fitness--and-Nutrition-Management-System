"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Send,
  User,
  History,
  Loader2,
  AlertCircle,
  Trash2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthContext";
import {
  ChatMessage,
  clearChatHistory,
  fetchChatHistory,
  sendCoachMessage,
  ApiError,
} from "@/lib/api";

const suggestedPrompts = [
  "Give me a 30 minute home workout",
  "Suggest a high protein meal",
  "How can I improve my fitness?",
  "Create a weekly workout plan",
];

export default function AiCoachPage() {
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load user chat history on mount or when token changes
  useEffect(() => {
    if (!token) {
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    fetchChatHistory(token)
      .then((history) => {
        setMessages(history);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load conversation history.");
        }
      })
      .finally(() => setLoadingHistory(false));
  }, [token]);

  async function handleSendMessage(promptToSend?: string) {
    const prompt = (promptToSend || inputMessage).trim();
    if (!prompt || !token || sending) return;

    setError(null);
    setLastFailedPrompt(null);
    setInputMessage("");

    // Optimistically push user message to UI
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      message: prompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const assistantMsg = await sendCoachMessage(token, prompt);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setLastFailedPrompt(prompt);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach AI Coach. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleClearHistory() {
    if (!token || sending) return;
    if (!confirm("Are you sure you want to clear your chat history?")) return;

    try {
      await clearChatHistory(token);
      setMessages([]);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to clear chat history.");
      }
    }
  }

  // Calculate athlete bio metrics
  const bmi =
    user?.weight && user?.height
      ? (user.weight / Math.pow(user.height / 100, 2)).toFixed(1)
      : null;

  return (
    <>
      <Topbar placeholder="Search advice..." />
      <main className="px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Bio & Sessions */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Athlete Bio
              </p>
              <Sparkles size={14} className="text-accent" />
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Name</span>
                <span className="font-semibold text-ink dark:text-white truncate max-w-[120px]">
                  {user?.name || "Athlete"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">BMI</span>
                <span className="font-semibold text-ink dark:text-white">
                  {bmi || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Fitness Goal</span>
                <span className="font-semibold text-accent truncate max-w-[130px]">
                  {user?.fitness_goal || "General Fitness"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Experience</span>
                <span className="font-semibold text-ink dark:text-white capitalize">
                  {user?.workout_experience || "Intermediate"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Diet</span>
                <span className="font-semibold text-ink dark:text-white capitalize truncate max-w-[120px]">
                  {user?.dietary_preference || "Flexible"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Active Session
              </p>
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  title="Clear Chat History"
                  className="flex items-center gap-1 text-xs text-error hover:underline transition-colors"
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex w-full items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-2 text-sm font-medium">
                <History size={14} /> AI Personal Trainer
              </div>
              <p className="text-xs text-ink-muted px-1">
                Contextual training &amp; meal recommendations personalized to your profile.
              </p>
            </div>
          </Card>
        </div>

        {/* Main Chat Interface */}
        <div className="flex flex-col h-[calc(100vh-8rem)] surface-card rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink dark:text-white">
                  ElevateFit AI Coach
                </h2>
                <p className="text-xs text-ink-muted">
                  Powered by Gemini • Personalized to {user?.name || "you"}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-ink-muted hover:text-error hover:border-error transition-colors"
              >
                <Trash2 size={14} /> Clear Chat
              </button>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-error/10 text-error text-sm px-4 py-3 border border-error/20">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
              {lastFailedPrompt && (
                <button
                  onClick={() => handleSendMessage(lastFailedPrompt)}
                  className="flex items-center gap-1 font-semibold text-xs bg-error text-white px-3 py-1.5 rounded-lg hover:bg-error/90 transition-colors"
                >
                  <RotateCcw size={13} /> Retry
                </button>
              )}
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {loadingHistory ? (
              <div className="flex h-full items-center justify-center gap-2 text-ink-muted text-sm">
                <Loader2 size={20} className="animate-spin text-primary" />
                Loading conversation history...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bot size={28} />
                </div>
                <h3 className="text-base font-semibold text-ink dark:text-white">
                  Welcome, {user?.name || "Athlete"}!
                </h3>
                <p className="text-sm text-ink-muted max-w-md">
                  I am your AI Coach. Ask me for custom workout programming, macro splits, recovery tips, or nutrition advice tailored to your goals.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {msg.role === "user" ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-white text-xs font-bold">
                      <User size={15} />
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot size={16} />
                    </span>
                  )}

                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ink dark:text-white"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                    <div
                      className={`text-[10px] mt-2 text-right ${
                        msg.role === "user" ? "text-white/70" : "text-ink-muted"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot size={16} />
                </span>
                <div className="rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-4 text-sm text-ink-muted flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  Generating personalized advice...
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts & Input */}
          <div className="pt-4 border-t border-black/10 dark:border-white/10 mt-2">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendMessage(p)}
                  disabled={sending}
                  className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask your AI Coach anything..."
                disabled={sending}
                className="flex-1 bg-transparent px-3 py-1.5 text-sm text-ink dark:text-white placeholder:text-ink-muted outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-secondary transition-colors disabled:opacity-50 shrink-0"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </form>
            <p className="text-center text-[11px] text-ink-muted mt-2">
              AI Coach generates recommendations based on your bio. Verify critical medical advice.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
