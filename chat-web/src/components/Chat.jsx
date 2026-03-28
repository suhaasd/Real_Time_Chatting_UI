import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import axios from "axios";
import { REQUEST_URL, CHAT_URL } from "../utils/constants";

const fmt = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const groupByDate = (messages) => {
  const groups = [];
  let lastDate = null;
  for (const msg of messages) {
    const d = fmtDate(msg.createdAt);
    if (d !== lastDate) {
      groups.push({ type: "date", label: d, key: d + msg._id });
      lastDate = d;
    }
    groups.push({ type: "msg", ...msg });
  }
  return groups;
};

const Avatar = ({ name, size = "w-8 h-8" }) => {
  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : "?";
  return (
    <div className={`${size} rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/20 text-primary font-bold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
};

/* ─── Chat Sidebar ───────────────────────────────────────────────────────── */
const ChatSidebar = ({ activeChatId, onSelectChat }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUser = useSelector((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const [sent, received] = await Promise.all([
          axios.get(REQUEST_URL + "invites/sent", { withCredentials: true }),
          axios.get(REQUEST_URL + "invites/received", { withCredentials: true }),
        ]);

        const sentData   = sent.data?.data?.data    ?? sent.data?.data    ?? sent.data    ?? [];
        const receivedData = received.data?.data?.data ?? received.data?.data ?? received.data ?? [];

        // Updated ID extraction to catch both Auth and Profile documents
        const myId = (
          currentUser?.userId ??
          currentUser?.data?.userId ??
          currentUser?._id ??
          currentUser?.id ??
          currentUser?.data?._id ??
          currentUser?.data?.id
        )?.toString() ?? "";

        // Build unified connection list — only accepted ones
        const allConnections = [];

        // From sent — peer is toUserId
        (Array.isArray(sentData) ? sentData : [])
          .filter((r) => r.status === "accepted")
          .forEach((r) => {
            allConnections.push({
              requestId: r._id,
              peerId: r.toUserId?.toString(),
              label: `User …${r.toUserId?.toString().slice(-6)}`,
              date: r.updatedAt ?? r.createdAt,
            });
          });

        // From received — peer is fromUserId (these are accepted by us)
        (Array.isArray(receivedData) ? receivedData : [])
          .filter((r) => r.status === "accepted")
          .forEach((r) => {
            allConnections.push({
              requestId: r._id,
              peerId: r.fromUserId?.toString(),
              label: `User …${r.fromUserId?.toString().slice(-6)}`,
              date: r.updatedAt ?? r.createdAt,
            });
          });

        // Deduplicate by peerId
        const seen = new Set();
        const deduped = allConnections.filter((c) => {
          if (!c.peerId || seen.has(c.peerId) || c.peerId === myId) return false;
          seen.add(c.peerId);
          return true;
        });

        setConnections(deduped);
      } catch (err) {
        if (err?.response?.status === 401) { navigate("/login"); return; }
        if (!err?.response) setError("Request service offline (port 5002)");
        else setError(err?.response?.data?.message || "Failed to load connections");
      } finally {
        setLoading(false);
      }
    };
    fetchConnections();
  }, [navigate, currentUser]);

  const startChat = async (peerId, label) => {
    try {
      const res = await axios.post(
        CHAT_URL + "create-direct",
        { receiverId: peerId },
        { withCredentials: true }
      );
      onSelectChat(res.data._id, label);
      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      console.error("Start chat error:", err?.response?.data?.message ?? err?.message);
      alert(err?.response?.data?.message ?? "Could not start chat — is chatService running on port 5003?");
    }
  };

  return (
    <div className="w-64 flex-shrink-0 border-r border-base-300 bg-base-100/80 backdrop-blur-md flex flex-col h-full">
      <div className="px-4 py-4 border-b border-base-300">
        <h2 className="text-base font-bold text-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Messages
        </h2>
        <p className="text-xs text-base-content/30 mt-0.5">{connections.length} connection{connections.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-sm text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 text-xs text-error/80 bg-error/5 m-3 rounded-lg">{error}</div>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-base-content/30 px-4 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-xs">No accepted connections.<br />Accept an invite first.</p>
          </div>
        ) : (
          connections.map((c) => {
            const isActive = activeChatId === c._chatId;
            return (
              <button
                key={c.requestId}
                onClick={() => startChat(c.peerId, c.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-base-200/50 ${
                  isActive ? "bg-primary/10 border-l-2 border-l-primary" : ""
                }`}
              >
                <Avatar name={c.label} size="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-base-content">{c.label}</p>
                  <p className="text-xs text-base-content/40 mt-0.5 truncate font-mono">{c.peerId?.slice(-12)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ─── Message Bubble ─────────────────────────────────────────────────────── */
const Bubble = ({ msg, isMine }) => (
  <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
    <div
      className={`max-w-[72%] rounded-2xl px-4 py-2 shadow-sm text-sm leading-relaxed ${
        isMine
          ? "bg-primary text-primary-content rounded-br-sm"
          : "bg-base-200 text-base-content rounded-bl-sm"
      }`}
    >
      <p className="break-words">{msg.text}</p>
      <p className={`text-[10px] mt-1 ${isMine ? "text-primary-content/60 text-right" : "text-base-content/40"}`}>
        {fmt(msg.createdAt)}
      </p>
    </div>
  </div>
);

/* ─── Empty State ────────────────────────────────────────────────────────── */
const EmptyChat = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-base-content/30">
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/50">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div className="text-center">
      <p className="font-semibold text-base-content/50">Select a conversation</p>
      <p className="text-xs mt-1">Choose a connection from the sidebar to start chatting</p>
    </div>
  </div>
);

/* ─── Chat Window ────────────────────────────────────────────────────────── */
const ChatWindow = ({ chatId, peerLabel }) => {
  const currentUser = useSelector((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!chatId) return;

    // 1. Fetch History First
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${CHAT_URL}messages/${chatId}`, {
          withCredentials: true,
        });
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to load message history:", err);
      }
    };
    
    fetchHistory();

    // 2. Connect the Socket
    const socket = io(CHAT_URL, { transports: ["websocket"], withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinChat", { chatId });
    });
    
    socket.on("disconnect", () => setConnected(false));
    
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]);
    });
    
    socket.on("error", (err) => console.error("Socket error:", err));

    return () => { socket.disconnect(); setMessages([]); setConnected(false); };
  }, [chatId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current?.connected) return;
    
    // Send directly to socket (Optimistic UI removed to prevent double echoing)
    socketRef.current.emit("sendMessage", { chatId, text });
    
    setInput("");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Updated ID extraction to match the sidebar fix
  const myId = (
    currentUser?.userId ?? 
    currentUser?.data?.userId ?? 
    currentUser?._id ?? 
    currentUser?.id ?? 
    currentUser?.data?._id ?? 
    currentUser?.data?.id
  )?.toString();
  
  const grouped = groupByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-base-300 bg-base-100/70 backdrop-blur flex items-center gap-3">
        <Avatar name={peerLabel ?? "?"} size="w-8 h-8" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-base-content">{peerLabel ?? "Chat"}</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success" : "bg-base-300"}`} />
            <span className="text-xs text-base-content/40">{connected ? "Connected" : "Connecting…"}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/30 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-xs">No messages yet. Say hello!</p>
          </div>
        ) : (
          grouped.map((item, i) => {
            if (item.type === "date") {
              return (
                <div key={item.key} className="flex items-center gap-3 my-3">
                  <div className="flex-1 border-t border-base-300" />
                  <span className="text-[10px] text-base-content/30 font-medium px-2">{item.label}</span>
                  <div className="flex-1 border-t border-base-300" />
                </div>
              );
            }
            const isMine = item.senderId?.toString() === myId;
            return <Bubble key={item._id} msg={item} isMine={isMine} />;
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-base-300 bg-base-100/70 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            placeholder={connected ? "Type a message…" : "Waiting for connection…"}
            className="textarea textarea-bordered bg-base-200/60 focus:border-primary focus:outline-none resize-none flex-1 text-sm leading-relaxed max-h-32 min-h-[2.5rem]"
            style={{ height: "2.5rem" }}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "2.5rem";
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
            }}
            onKeyDown={handleKey}
            disabled={!connected}
          />
          <button
            className="btn btn-primary btn-sm px-4 self-end h-10"
            onClick={sendMessage}
            disabled={!input.trim() || !connected}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-base-content/30 mt-1.5 ml-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
};

/* ─── Chat Page ──────────────────────────────────────────────────────────── */
const Chat = () => {
  const { chatId: urlChatId } = useParams();
  const [activeChatId, setActiveChatId] = useState(urlChatId ?? null);
  const [peerLabel, setPeerLabel] = useState(null);

  const handleSelectChat = (chatId, label) => {
    setActiveChatId(chatId);
    setPeerLabel(label);
  };

  useEffect(() => {
    if (urlChatId) setActiveChatId(urlChatId);
  }, [urlChatId]);

  return (
    <div
      className="flex bg-gradient-to-br from-base-300 to-base-200"
      style={{ height: "calc(100vh - 4rem - 3.5rem)" }}
    >
      <ChatSidebar activeChatId={activeChatId} onSelectChat={handleSelectChat} />
      {activeChatId ? (
        <ChatWindow key={activeChatId} chatId={activeChatId} peerLabel={peerLabel} />
      ) : (
        <EmptyChat />
      )}
    </div>
  );
};

export default Chat;