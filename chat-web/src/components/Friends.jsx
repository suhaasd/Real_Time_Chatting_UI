import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { REQUEST_URL, PROFILE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";

const STATUS_BADGE = {
  pending: { cls: "badge-warning", label: "Pending" },
  accepted: { cls: "badge-success", label: "Accepted" },
  rejected: { cls: "badge-error", label: "Rejected" },
};

const Avatar = ({ name, photoUrl, size = "w-10 h-10" }) => {
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";
  return photoUrl ? (
    <div className={`${size} rounded-full overflow-hidden ring-2 ring-primary/30`}>
      <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
    </div>
  ) : (
    <div
      className={`${size} rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30 text-primary font-bold text-sm`}
    >
      {initials}
    </div>
  );
};

/* ─── People to Discover ─────────────────────────────────────────────────── */
const DiscoverTab = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  const sendInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      await axios.post(
        REQUEST_URL + "invite/send",
        { toEmail: email.trim() },
        { withCredentials: true }
      );
      setMsg({ type: "success", text: "Invite sent!" });
      setEmail("");
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Failed to send invite",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div className="card bg-base-100/80 backdrop-blur-md border border-primary/20 rounded-2xl shadow-xl">
        <div className="card-body space-y-4">
          <div className="flex flex-col gap-1 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-primary">Send an Invite</h2>
            <p className="text-xs text-base-content/50">Enter a user's email to connect</p>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-base-content/70">Email address</span>
            </label>
            <input
              type="email"
              value={email}
              placeholder="friend@example.com"
              className="input input-bordered input-sm bg-base-200/60 focus:border-primary focus:outline-none w-full"
              onChange={(e) => { setEmail(e.target.value); setMsg(null); }}
              onKeyDown={(e) => e.key === "Enter" && sendInvite()}
            />
          </div>

          {msg && (
            <div className={`alert ${msg.type === "success" ? "alert-success" : "alert-error"} py-2 text-sm`}>
              {msg.text}
            </div>
          )}

          <button
            className="btn btn-primary btn-sm w-full font-semibold tracking-wide"
            onClick={sendInvite}
            disabled={loading || !email.trim()}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Sent Requests ──────────────────────────────────────────────────────── */
const SentTab = () => {
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const navigate = useNavigate();

  const fetchSent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(REQUEST_URL + "invites/sent", {
        withCredentials: true,
      });
      const reqs = res.data?.data?.data ?? res.data?.data ?? [];
      setRequests(reqs);

      const profileMap = {};
      await Promise.all(
        reqs.map(async (r) => {
          const id = r.toUserId?.toString();
          if (!id) return;
          try {
            const p = await axios.get(PROFILE_URL + "profile/" + id, { withCredentials: true });
            profileMap[id] = p.data?.data;
          } catch { /* leave undefined */ }
        })
      );
      setProfiles(profileMap);
    } catch (err) {
      if (err?.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchSent(); }, [fetchSent]);

  const cancelRequest = async (id) => {
    setCancelling(id);
    try {
      await axios.delete(`${REQUEST_URL}request/cancel/${id}`, { withCredentials: true });
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-base-content/40">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
        </svg>
        <p className="text-sm">No sent requests yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 py-6 px-2 sm:px-4">
      {requests.map((r) => {
        const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
        return (
          <div
            key={r._id}
            className="card bg-base-100/70 backdrop-blur border border-base-300 rounded-xl shadow hover:shadow-md transition-shadow"
          >
            <div className="card-body flex-row items-center gap-4 py-3 px-4">
              <Avatar name={[profiles[r.toUserId?.toString()]?.firstName, profiles[r.toUserId?.toString()]?.lastName].filter(Boolean).join(" ") || r.toUserId?.toString() || "?"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">To: <span className="text-base-content/70">{[profiles[r.toUserId?.toString()]?.firstName, profiles[r.toUserId?.toString()]?.lastName].filter(Boolean).join(" ") || r.toUserId?.toString()}</span></p>
                <p className="text-xs text-base-content/40 mt-0.5">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className={`badge badge-sm ${badge.cls} font-medium`}>{badge.label}</span>
              {r.status === "pending" && (
                <button
                  className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                  onClick={() => cancelRequest(r._id)}
                  disabled={cancelling === r._id}
                >
                  {cancelling === r._id ? <span className="loading loading-spinner loading-xs" /> : "Cancel"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Received Requests ──────────────────────────────────────────────────── */
const ReceivedTab = () => {
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const navigate = useNavigate();

  const fetchReceived = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(REQUEST_URL + "invites/received", {
        withCredentials: true,
      });

      const allReceived = res.data?.data?.data ?? res.data?.data ?? [];
      const pendingOnly = allReceived.filter(r => r.status === "pending");
      setRequests(pendingOnly);

      const profileMap = {};
      await Promise.all(
        pendingOnly.map(async (r) => {
          const id = r.fromUserId?.toString();
          if (!id) return;
          try {
            const p = await axios.get(PROFILE_URL + "profile/" + id, { withCredentials: true });
            profileMap[id] = p.data?.data;
          } catch { /* leave undefined */ }
        })
      );
      setProfiles(profileMap);
    } catch (err) {
      if (err?.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchReceived(); }, [fetchReceived]);

  const respond = async (requestId, status) => {
    setActing(requestId + status);
    try {
      await axios.patch(
        `${REQUEST_URL}respond/${requestId}`,
        { status },
        { withCredentials: true }
      );
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-base-content/40">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p className="text-sm">No pending invites</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 py-6 px-2 sm:px-4">
      {requests.map((r) => (
        <div
          key={r._id}
          className="card bg-base-100/70 backdrop-blur border border-primary/15 rounded-xl shadow hover:shadow-md transition-shadow"
        >
          <div className="card-body flex-row items-center gap-4 py-3 px-4">
            <Avatar name={[profiles[r.fromUserId?.toString()]?.firstName, profiles[r.fromUserId?.toString()]?.lastName].filter(Boolean).join(" ") || r.fromUserId?.toString() || "?"} size="w-11 h-11" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">From: <span className="text-base-content/70">{[profiles[r.fromUserId?.toString()]?.firstName, profiles[r.fromUserId?.toString()]?.lastName].filter(Boolean).join(" ") || r.fromUserId?.toString()}</span></p>
              {r.message && <p className="text-xs text-base-content/50 mt-0.5 italic truncate">"{r.message}"</p>}
              <p className="text-xs text-base-content/40 mt-0.5">
                {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-xs btn-success"
                onClick={() => respond(r._id, "accepted")}
                disabled={!!acting}
              >
                {acting === r._id + "accepted" ? <span className="loading loading-spinner loading-xs" /> : "Accept"}
              </button>
              <button
                className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                onClick={() => respond(r._id, "rejected")}
                disabled={!!acting}
              >
                {acting === r._id + "rejected" ? <span className="loading loading-spinner loading-xs" /> : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Friends Page ───────────────────────────────────────────────────────── */
const TABS = [
  { id: "discover", label: "Discover", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )},
  { id: "sent", label: "Sent", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )},
  { id: "received", label: "Received", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
];

const Friends = () => {
  const [activeTab, setActiveTab] = useState("discover");

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-base-300 to-base-200 pb-28 pt-6 px-2"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <h1 className="text-2xl font-bold text-primary tracking-wide">Connections</h1>
          <p className="text-xs text-base-content/40">Manage your chat network</p>
        </div>

        {/* Tab bar */}
        <div className="flex bg-base-100/60 backdrop-blur-md border border-base-300 rounded-2xl p-1 gap-1 shadow-inner mb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-content shadow"
                  : "text-base-content/60 hover:text-base-content hover:bg-base-200/50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={activeTab} className="animate-[fadeSlide_0.2s_ease]">
          {activeTab === "discover" && <DiscoverTab />}
          {activeTab === "sent" && <SentTab />}
          {activeTab === "received" && <ReceivedTab />}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Friends;
