import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import axios from "axios";
import { REQUEST_URL, CHAT_URL, PROFILE_URL } from "../utils/constants";

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

const Avatar = ({ name, size = "w-8 h-8", group = false }) => {
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  return (
    <div className={`${size} rounded-full flex items-center justify-center ring-2 font-bold text-xs flex-shrink-0 ${
      group
        ? "bg-secondary/20 ring-secondary/20 text-secondary"
        : "bg-primary/20 ring-primary/20 text-primary"
    }`}>
      {initials}
    </div>
  );
};

/* ─── Create Group Modal ─────────────────────────────────────────────────── */
const CreateGroupModal = ({ connections, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const toggle = (peerId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(peerId) ? next.delete(peerId) : next.add(peerId);
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim()) { setError("Group name is required"); return; }
    if (selected.size < 2) { setError("Select at least 2 participants"); return; }
    setCreating(true);
    setError("");
    try {
      const res = await axios.post(
        CHAT_URL + "create-group",
        { name: name.trim(), participants: [...selected] },
        { withCredentials: true }
      );
      onCreate(res.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm mx-4 border border-base-300">
        <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between">
          <h3 className="font-bold text-base text-primary">New Group</h3>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-base-content/60 mb-1 block">Group name</label>
            <input
              type="text"
              value={name}
              placeholder="e.g. Study Squad"
              className="input input-bordered input-sm w-full bg-base-200/60 focus:border-primary focus:outline-none"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-base-content/60 mb-1 block">
              Participants <span className="text-base-content/40">(select at least 2)</span>
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-base-300 rounded-lg p-2">
              {connections.length === 0 ? (
                <p className="text-xs text-base-content/40 text-center py-3">No connections available</p>
              ) : (
                connections.map((c) => (
                  <label
                    key={c.peerId}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-base-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs checkbox-primary"
                      checked={selected.has(c.peerId)}
                      onChange={() => toggle(c.peerId)}
                    />
                    <Avatar name={c.label} size="w-7 h-7" />
                    <span className="text-sm truncate">{c.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <button
            className="btn btn-primary btn-sm w-full"
            onClick={submit}
            disabled={creating}
          >
            {creating ? <span className="loading loading-spinner loading-xs" /> : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Chat Sidebar ───────────────────────────────────────────────────────── */
const ChatSidebar = ({ activeChatId, onSelectChat }) => {
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const currentUser = useSelector((s) => s.user);
  const navigate = useNavigate();

  const myId = (
    currentUser?.userId ??
    currentUser?.data?.userId ??
    currentUser?._id ??
    currentUser?.id ??
    currentUser?.data?._id ??
    currentUser?.data?.id
  )?.toString() ?? "";

  const fetchAll = useCallback(async () => {
    try {
      const [sent, received, myChats] = await Promise.all([
        axios.get(REQUEST_URL + "invites/sent", { withCredentials: true }),
        axios.get(REQUEST_URL + "invites/received", { withCredentials: true }),
        axios.get(CHAT_URL + "my-chats", { withCredentials: true }),
      ]);

      const sentData     = sent.data?.data?.data    ?? sent.data?.data    ?? sent.data    ?? [];
      const receivedData = received.data?.data?.data ?? received.data?.data ?? received.data ?? [];

      const allConnections = [];

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

      const seen = new Set();
      const deduped = allConnections.filter((c) => {
        if (!c.peerId || seen.has(c.peerId) || c.peerId === myId) return false;
        seen.add(c.peerId);
        return true;
      });

      const withNames = await Promise.all(
        deduped.map(async (c) => {
          try {
            const res = await axios.get(PROFILE_URL + "profile/" + c.peerId, { withCredentials: true });
            const p = res.data?.data;
            const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
            return { ...c, label: name || c.label };
          } catch {
            return c;
          }
        })
      );

      setConnections(withNames);

      // Filter only group chats from my-chats
      const allChats = Array.isArray(myChats.data) ? myChats.data : [];
      setGroups(allChats.filter((c) => c.chatType === "group"));
    } catch (err) {
      if (err?.response?.status === 401) { navigate("/login"); return; }
      if (!err?.response) setError("A service is offline");
      else setError(err?.response?.data?.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, [navigate, myId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const startChat = async (peerId, label) => {
    try {
      const res = await axios.post(
        CHAT_URL + "create-direct",
        { receiverId: peerId },
        { withCredentials: true }
      );
      onSelectChat(res.data._id, label, false);
      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      alert(err?.response?.data?.message ?? "Could not start chat");
    }
  };

  const openGroup = (group) => {
    onSelectChat(group._id, group.name, true);
    navigate(`/chat/${group._id}`);
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
    onSelectChat(newGroup._id, newGroup.name, true);
    navigate(`/chat/${newGroup._id}`);
  };

  return (
    <>
      {showCreateGroup && (
        <CreateGroupModal
          connections={connections}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleGroupCreated}
        />
      )}

      <div className="w-64 flex-shrink-0 border-r border-base-300 bg-base-100/80 backdrop-blur-md flex flex-col h-full">
        <div className="px-4 py-4 border-b border-base-300">
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Messages
          </h2>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-sm text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-error/80 bg-error/5 m-3 rounded-lg">{error}</div>
          ) : (
            <>
              {/* Direct Messages */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/30">
                  Direct Messages
                </p>
              </div>
              {connections.length === 0 ? (
                <p className="px-4 py-2 text-xs text-base-content/30">No connections yet</p>
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
                      <Avatar name={c.label} size="w-9 h-9" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-base-content">{c.label}</p>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Groups */}
              <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/30">
                  Groups
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 h-5 min-h-0 px-1.5 text-[10px] font-semibold"
                  title="Create new group"
                >
                  + New
                </button>
              </div>
              {groups.length === 0 ? (
                <p className="px-4 py-2 text-xs text-base-content/30">No groups yet</p>
              ) : (
                groups.map((g) => {
                  const isActive = activeChatId === g._id;
                  return (
                    <button
                      key={g._id}
                      onClick={() => openGroup(g)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/5 transition-colors text-left border-b border-base-200/50 ${
                        isActive ? "bg-secondary/10 border-l-2 border-l-secondary" : ""
                      }`}
                    >
                      <Avatar name={g.name} size="w-9 h-9" group />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-base-content">{g.name}</p>
                        <p className="text-[10px] text-base-content/30">{g.participants?.length} members</p>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Message Bubble ─────────────────────────────────────────────────────── */
const Bubble = ({ msg, isMine, senderName, isGroup }) => (
  <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
    <div
      className={`max-w-[72%] rounded-2xl px-4 py-2 shadow-sm text-sm leading-relaxed ${
        isMine
          ? "bg-primary text-primary-content rounded-br-sm"
          : "bg-base-200 text-base-content rounded-bl-sm"
      }`}
    >
      {isGroup && !isMine && senderName && (
        <p className="text-[10px] font-semibold text-secondary mb-0.5">{senderName}</p>
      )}
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
      <p className="text-xs mt-1">Choose a connection or group from the sidebar</p>
    </div>
  </div>
);

/* ─── Chat Window ────────────────────────────────────────────────────────── */
const ChatWindow = ({ chatId, peerLabel, isGroup }) => {
  const currentUser = useSelector((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [senderNames, setSenderNames] = useState({});
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const myId = (
    currentUser?.userId ??
    currentUser?.data?.userId ??
    currentUser?._id ??
    currentUser?.id ??
    currentUser?.data?._id ??
    currentUser?.data?.id
  )?.toString();

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Resolve sender name for group chats
  const resolveSender = useCallback(async (senderId) => {
    if (!senderId || senderId === myId) return;
    setSenderNames((prev) => {
      if (prev[senderId]) return prev;
      axios.get(PROFILE_URL + "profile/" + senderId, { withCredentials: true })
        .then((res) => {
          const p = res.data?.data;
          const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
          if (name) setSenderNames((n) => ({ ...n, [senderId]: name }));
        })
        .catch(() => {});
      return prev;
    });
  }, [myId]);

  useEffect(() => {
    if (!chatId) return;

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${CHAT_URL}messages/${chatId}`, { withCredentials: true });
        const msgs = res.data;
        setMessages(msgs);
        if (isGroup) msgs.forEach((m) => resolveSender(m.senderId?.toString()));
      } catch (err) {
        console.error("Failed to load message history:", err);
      }
    };

    fetchHistory();

    const socket = io(CHAT_URL, { transports: ["websocket"], withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinChat", { chatId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]);
      if (isGroup) resolveSender(msg.senderId?.toString());
    });
    socket.on("error", (err) => console.error("Socket error:", err));

    return () => { socket.disconnect(); setMessages([]); setConnected(false); };
  }, [chatId, isGroup, resolveSender]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current?.connected) return;
    socketRef.current.emit("sendMessage", { chatId, text });
    setInput("");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const grouped = groupByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-base-300 bg-base-100/70 backdrop-blur flex items-center gap-3">
        <Avatar name={peerLabel ?? "?"} size="w-8 h-8" group={isGroup} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-base-content">{peerLabel ?? "Chat"}</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success" : "bg-base-300"}`} />
            <span className="text-xs text-base-content/40">
              {connected ? (isGroup ? "Group · Connected" : "Connected") : "Connecting…"}
            </span>
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
          grouped.map((item) => {
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
            return (
              <Bubble
                key={item._id}
                msg={item}
                isMine={isMine}
                isGroup={isGroup}
                senderName={senderNames[item.senderId?.toString()]}
              />
            );
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
  const [isGroup, setIsGroup] = useState(false);

  const handleSelectChat = (chatId, label, group) => {
    setActiveChatId(chatId);
    setPeerLabel(label);
    setIsGroup(!!group);
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
        <ChatWindow key={activeChatId} chatId={activeChatId} peerLabel={peerLabel} isGroup={isGroup} />
      ) : (
        <EmptyChat />
      )}
    </div>
  );
};

export default Chat;
