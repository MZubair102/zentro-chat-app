"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Search,
  UserCircle,
  MessageCircle,
  Users,
  Plus,
  X,
  RefreshCw,
  Mail,
} from "lucide-react";

import { socket } from "@/lib/socket";

interface Props {
  currentUserId: string;

  selectedConversation: any;

  onSelect: (conversation: any) => void;
}

export default function ChatSidebar({
  currentUserId,

  selectedConversation,

  onSelect,
}: Props) {
  const [conversations, setConversations] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [newChatOpen, setNewChatOpen] = useState(false);

  const [email, setEmail] = useState("");

  const [creatingChat, setCreatingChat] = useState(false);

  const [chatError, setChatError] = useState("");

  const [chatSuccess, setChatSuccess] = useState("");

  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  const loadConversations = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/conversions", {
        method: "GET",

        credentials: "include",

        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setConversations([]);

        return;
      }

      setConversations(
        Array.isArray(data.data)
          ? data.data.map((conversation: any) => ({
              ...conversation,

              participants: conversation.participants?.map((user: any) => ({
                ...user,

                status: user.status === "online" ? "online" : "offline",
              })),
            }))
          : [],
      );
    } catch (error) {
      console.error("Conversation error", error);

      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SOCKET CONNECTION
  // =====================================================

  useEffect(() => {
    // if (!currentUserId) return;

    loadConversations();

    // connect socket

    // if (!socket.connected) {
    //   socket.connect();
    // }

    // // join current user

    // socket.emit("join-user", currentUserId);

    // =====================================================
    // RECEIVE MESSAGE
    // =====================================================

    const receiveMessage = (message: any) => {
      setConversations((prev) => {
        const updated = prev.map((conversation) =>
          conversation._id.toString() === message.conversationId.toString()
            ? {
                ...conversation,
                lastMessage: message,
              }
            : conversation,
        );

        updated.sort((a, b) => {
          const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();

          const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();

          return bTime - aTime;
        });

        return [...updated];
      });
    };

    // =====================================================
    // USER ONLINE
    // =====================================================

    const userOnline = ({ userId }: any) => {
      setConversations((prev) =>
        prev.map((conversation) => ({
          ...conversation,

          participants: conversation.participants?.map((user: any) =>
            user._id.toString() === userId.toString()
              ? {
                  ...user,

                  status: "online",
                }
              : user,
          ),
        })),
      );
    };

    // =====================================================
    // USER OFFLINE
    // =====================================================

    const userOffline = ({ userId, lastSeen }: any) => {
      setConversations((prev) =>
        prev.map((conversation) => ({
          ...conversation,
          participants: conversation.participants.map((user: any) =>
            user._id.toString() === userId.toString()
              ? {
                  ...user,
                  status: "offline",
                  lastSeen,
                }
              : user,
          ),
        })),
      );
    };

    // socket.on("receive-message", receiveMessage);

    // socket.on("user-online", userOnline);

    // socket.on("user-offline", userOffline);

    return () => {
      // socket.off("receive-message", receiveMessage);

      // socket.off("user-online", userOnline);

      // socket.off("user-offline", userOffline);
    };
  }, [currentUserId]);
  // =====================================================
  // CREATE CHAT
  // =====================================================

  const createConversation = async () => {
    const cleanEmail = email.trim().toLowerCase();

    setChatError("");

    setChatSuccess("");

    if (!cleanEmail) {
      setChatError("Please enter email.");

      return;
    }

    try {
      setCreatingChat(true);

      const res = await fetch("/api/conversions", {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: cleanEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setChatError(data.message || "Unable to create conversation.");

        return;
      }

      await loadConversations();

      if (data.data) {
        onSelect(data.data);
      }

      setChatSuccess(
        data.existing
          ? "Conversation already exists."
          : "Conversation created successfully.",
      );

      setEmail("");

      setTimeout(() => {
        setNewChatOpen(false);

        setChatSuccess("");
      }, 700);
    } catch (error) {
      console.error(error);

      setChatError("Something went wrong.");
    } finally {
      setCreatingChat(false);
    }
  };

  // =====================================================
  // SEARCH FILTER
  // =====================================================

  const filteredConversations = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return conversations;
    }

    return conversations.filter((conversation: any) => {
      const otherUsers = (conversation.participants || []).filter(
        (user: any) => user._id.toString() !== currentUserId.toString(),
      );

      const name = otherUsers

        .map((user: any) => user.name || "")

        .join(" ")

        .toLowerCase();

      const userEmail = otherUsers

        .map((user: any) => user.email || "")

        .join(" ")

        .toLowerCase();

      return (
        name.includes(value) ||
        userEmail.includes(value) ||
        (conversation.name || "")

          .toLowerCase()

          .includes(value)
      );
    });
  }, [search, conversations, currentUserId]);

  // =====================================================
  // GET OTHER USER
  // =====================================================

  const getOtherUser = (conversation: any) => {
    return (conversation.participants || []).find(
      (user: any) => user._id.toString() !== currentUserId.toString(),
    );
  };

  // =====================================================
  // GET NAME
  // =====================================================

  const getConversationName = (conversation: any) => {
    if (conversation.type === "group") {
      return conversation.name || "Group";
    }

    const user = getOtherUser(conversation);

    return user?.name || "Unknown User";
  };

  // =====================================================
  // GET AVATAR
  // =====================================================

  const getConversationAvatar = (conversation: any) => {
    if (conversation.type === "group") {
      return conversation.image || "";
    }

    const user = getOtherUser(conversation);

    return user?.avatar || "";
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (date: string) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) {
      return "";
    }

    const today = new Date();

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "numeric",

        minute: "2-digit",

        hour12: true,
      });
    }

    return messageDate.toLocaleDateString("en-US", {
      month: "short",

      day: "numeric",
    });
  };

  // =====================================================
  // MODAL OPEN / CLOSE
  // =====================================================

  const openNewChat = () => {
    setEmail("");

    setChatError("");

    setChatSuccess("");

    setNewChatOpen(true);
  };

  const closeNewChat = () => {
    if (creatingChat) return;

    setNewChatOpen(false);

    setEmail("");

    setChatError("");

    setChatSuccess("");
  };
  return (
    <>
      <aside className="flex w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* HEADER */}

        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>

              <p className="mt-1 text-xs text-gray-500">Your conversations</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={loadConversations}
                disabled={loading}
                className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 transition hover:bg-gray-100"
              >
                <RefreshCw
                  size={17}
                  className={`${loading ? "animate-spin" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={openNewChat}
                className="grid h-9 w-9 place-items-center rounded-lg bg-[#0E1320] text-white transition hover:bg-[#1b2435]"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* SEARCH */}

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
            <Search size={18} className="text-gray-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* CONVERSATION LIST */}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({
                length: 5,
              })

                .map((_, i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-3"
                  >
                    <div className="h-11 w-11 rounded-full bg-gray-200" />

                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded bg-gray-200" />

                      <div className="h-3 w-44 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <UserCircle size={40} className="text-gray-400" />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                {search ? "No conversations found" : "No conversations"}
              </p>

              {!search && (
                <button
                  onClick={openNewChat}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-[#0E1320] px-4 py-2 text-xs text-white"
                >
                  <Plus size={15} />
                  New conversation
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation: any) => {
              const otherUser = getOtherUser(conversation);

              const name = getConversationName(conversation);

              const avatar = getConversationAvatar(conversation);

              const active =
                selectedConversation?._id?.toString() ===
                conversation._id?.toString();

              const lastMessage = conversation.lastMessage;

              const messageText = lastMessage?.deleted
                ? "Message deleted"
                : lastMessage?.text ||
                  (lastMessage?.messageType === "image"
                    ? "📷 Image"
                    : lastMessage?.messageType === "file"
                      ? "📎 File"
                      : "No messages yet");

              return (
                <button
                  key={conversation._id}
                  onClick={() => onSelect(conversation)}
                  className={`
flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition
${active ? "bg-gray-100" : "hover:bg-gray-50"}
`}
                >
                  {/* AVATAR */}

                  <div className="relative shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : conversation.type === "group" ? (
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-gray-200">
                        <Users size={18} />
                      </div>
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0E1320] text-sm font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* ONLINE DOT */}

                    {conversation.type === "private" && (
  <span
    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
      otherUser?.status === "online"
        ? "bg-green-500"
        : "bg-gray-400"
    }`}
  />
)}
                  </div>

                  {/* CONTENT */}

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {name}
                      </p>

                      {lastMessage?.createdAt && (
                        <span className="text-[10px] text-gray-400">
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs text-gray-500">
                      {messageText}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
      {/* NEW CHAT MODAL */}

      {newChatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeNewChat();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  New conversation
                </h2>

                <p className="mt-1 text-xs text-gray-500">Enter user's email</p>
              </div>

              <button
                type="button"
                onClick={closeNewChat}
                disabled={creatingChat}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* BODY */}

            <div className="p-5">
              <label className="text-xs font-medium text-gray-700">
                User email
              </label>

              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <Mail size={17} className="text-gray-400" />

                <input
                  type="email"
                  value={email}
                  autoFocus
                  onChange={(e) => {
                    setEmail(e.target.value);

                    setChatError("");

                    setChatSuccess("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();

                      createConversation();
                    }
                  }}
                  placeholder="friend@example.com"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              {/* ERROR */}

              {chatError && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {chatError}
                </div>
              )}

              {/* SUCCESS */}

              {chatSuccess && (
                <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-600">
                  {chatSuccess}
                </div>
              )}

              {/* BUTTONS */}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeNewChat}
                  disabled={creatingChat}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={createConversation}
                  disabled={creatingChat || !email.trim()}
                  className="flex items-center gap-2 rounded-lg bg-[#0E1320] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1b2435] disabled:opacity-40"
                >
                  {creatingChat ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <MessageCircle size={15} />
                  )}

                  {creatingChat ? "Creating..." : "Start chat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
