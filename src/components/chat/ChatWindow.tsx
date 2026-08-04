
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";

import { socket } from "@/lib/socket";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

interface Props {
  conversation: any;
  currentUserId: string;
}

export default function ChatWindow({
  conversation,
  currentUserId,
}: Props) {
  const [messages, setMessages] = useState<any[]>([]);

  const [typingUser, setTypingUser] =
    useState<string | null>(null);

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  const messagesContainerRef =
    useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (
    behavior: ScrollBehavior = "smooth",
  ) => {
    const container =
      messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  // =====================================================
  // OTHER USER
  // =====================================================

  const otherUser =
    conversation?.participants?.find(
      (user: any) =>
        String(user._id) !==
        String(currentUserId),
    );

  const otherUserId =
    otherUser?._id?.toString();

  // =====================================================
  // USER STATUS
  // =====================================================

  const [otherUserStatus, setOtherUserStatus] =
    useState<"online" | "offline">(
      otherUser?.status === "online"
        ? "online"
        : "offline",
    );

  const [otherUserLastSeen, setOtherUserLastSeen] =
    useState<string | null>(
      otherUser?.lastSeen || null,
    );

  // =====================================================
  // UPDATE STATUS WHEN CONVERSATION CHANGES
  // =====================================================

  useEffect(() => {
    setOtherUserStatus(
      otherUser?.status === "online"
        ? "online"
        : "offline",
    );

    setOtherUserLastSeen(
      otherUser?.lastSeen || null,
    );
  }, [
    conversation?._id,
    otherUser?.status,
    otherUser?.lastSeen,
  ]);

  // =====================================================
  // FORMAT LAST SEEN
  // =====================================================

  const formatLastSeen = (
    date: string | Date | null | undefined,
  ) => {
    if (!date) {
      return "last seen recently";
    }

    const lastSeen = new Date(date);

    if (Number.isNaN(lastSeen.getTime())) {
      return "last seen recently";
    }

    const now = new Date();

    const time =
      lastSeen.toLocaleTimeString(
        "en-US",
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        },
      );

    // TODAY

    if (
      lastSeen.toDateString() ===
      now.toDateString()
    ) {
      return `last seen today at ${time}`;
    }

    // YESTERDAY

    const yesterday = new Date(now);

    yesterday.setDate(
      now.getDate() - 1,
    );

    if (
      lastSeen.toDateString() ===
      yesterday.toDateString()
    ) {
      return `last seen yesterday at ${time}`;
    }

    // OLDER

    return `last seen ${lastSeen.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      },
    )} at ${time}`;
  };

  // =====================================================
  // LIVE ONLINE / OFFLINE
  // =====================================================

  useEffect(() => {
    if (!otherUserId) return;

    const handleUserOnline = ({
      userId,
    }: {
      userId: string;
    }) => {
      if (
        String(userId) !==
        String(otherUserId)
      ) {
        return;
      }

      setOtherUserStatus("online");
      setOtherUserLastSeen(null);
    };

    const handleUserOffline = ({
      userId,
      lastSeen,
    }: {
      userId: string;
      lastSeen?: string;
    }) => {
      if (
        String(userId) !==
        String(otherUserId)
      ) {
        return;
      }

      setOtherUserStatus("offline");

      setOtherUserLastSeen(
        lastSeen ||
          new Date().toISOString(),
      );
    };

    socket.on(
      "user-online",
      handleUserOnline,
    );

    socket.on(
      "user-offline",
      handleUserOffline,
    );

    return () => {
      socket.off(
        "user-online",
        handleUserOnline,
      );

      socket.off(
        "user-offline",
        handleUserOffline,
      );
    };
  }, [otherUserId]);

  // =====================================================
  // LOAD + LIVE MESSAGES
  // =====================================================

  useEffect(() => {
    if (!conversation?._id) return;

    let mounted = true;

    const conversationId =
      conversation._id.toString();

    // ===================================================
    // LOAD MESSAGES
    // ===================================================

    const loadMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages/${conversationId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const data = await res.json();

        if (
          mounted &&
          data.success
        ) {
          const loadedMessages =
            Array.isArray(data.data)
              ? data.data
              : [];

          setMessages(
            loadedMessages,
          );

          // ---------------------------------------------
          // IMPORTANT:
          // Existing incoming messages ko delivered mark
          // karo agar current user receiver hai.
          // ---------------------------------------------

          loadedMessages.forEach(
            (message: any) => {
              const senderId =
                message.sender?._id ||
                message.sender;

              if (
                String(senderId) ===
                String(currentUserId)
              ) {
                return;
              }

              const deliveredBy =
                Array.isArray(
                  message.deliveredBy,
                )
                  ? message.deliveredBy
                  : [];

              const alreadyDelivered =
                deliveredBy.some(
                  (id: any) =>
                    String(
                      id?._id || id,
                    ) ===
                    String(currentUserId),
                );

              if (!alreadyDelivered) {
                socket.emit(
                  "message-delivered",
                  {
                    conversationId,
                    messageId:
                      message._id,
                    userId:
                      currentUserId,
                  },
                );
              }
            },
          );
        }
      } catch (error) {
        console.error(
          "Load messages error:",
          error,
        );
      }
    };

    // ===================================================
    // JOIN CONVERSATION
    // ===================================================

    socket.emit(
      "join-conversation",
      conversationId,
    );

    // Load after joining room
    loadMessages();

    // ===================================================
    // RECEIVE MESSAGE
    // ===================================================

    const receiveMessage = (
      message: any,
    ) => {
      if (
        String(
          message.conversationId,
        ) !==
        String(conversationId)
      ) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (item) =>
            String(item._id) ===
            String(message._id),
        );

        if (exists) {
          return prev;
        }

        return [
          ...prev,
          message,
        ];
      });

      // -----------------------------------------------
      // IMPORTANT:
      // Agar message kisi aur ne bheja hai,
      // current user receiver hai.
      // Message delivered mark karo.
      // -----------------------------------------------

      const senderId =
        message.sender?._id ||
        message.sender;

      if (
        String(senderId) !==
        String(currentUserId)
      ) {
        const deliveredBy =
          Array.isArray(
            message.deliveredBy,
          )
            ? message.deliveredBy
            : [];

        const alreadyDelivered =
          deliveredBy.some(
            (id: any) =>
              String(
                id?._id || id,
              ) ===
              String(currentUserId),
          );

        if (!alreadyDelivered) {
          socket.emit(
            "message-delivered",
            {
              conversationId,
              messageId:
                message._id,
              userId:
                currentUserId,
            },
          );
        }
      }

      // Scroll after new message
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 50);
    };

    // ===================================================
    // MESSAGE DELIVERED
    // ===================================================

    const handleMessageDelivered = ({
      messageId,
      userId,
    }: {
      messageId: string;
      userId: string;
    }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (
            String(message._id) !==
            String(messageId)
          ) {
            return message;
          }

          const currentDeliveredBy =
            Array.isArray(
              message.deliveredBy,
            )
              ? message.deliveredBy
              : [];

          const alreadyDelivered =
            currentDeliveredBy.some(
              (id: any) =>
                String(
                  id?._id || id,
                ) ===
                String(userId),
            );

          if (alreadyDelivered) {
            return message;
          }

          return {
            ...message,

            deliveredBy: [
              ...currentDeliveredBy,
              userId,
            ],
          };
        }),
      );
    };

    // ===================================================
    // MESSAGE SEEN
    // ===================================================

    const handleMessageSeen = ({
      messageId,
      userId,
    }: {
      messageId: string;
      userId: string;
    }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (
            String(message._id) !==
            String(messageId)
          ) {
            return message;
          }

          const currentSeenBy =
            Array.isArray(
              message.seenBy,
            )
              ? message.seenBy
              : [];

          const alreadySeen =
            currentSeenBy.some(
              (id: any) =>
                String(
                  id?._id || id,
                ) ===
                String(userId),
            );

          if (alreadySeen) {
            return message;
          }

          return {
            ...message,

            seenBy: [
              ...currentSeenBy,
              userId,
            ],
          };
        }),
      );
    };

    // ===================================================
    // USER TYPING
    // ===================================================

    const userTyping = ({
      conversationId:
        typingConversationId,
      userId,
    }: any) => {
      if (
        String(
          typingConversationId,
        ) !==
        String(conversationId)
      ) {
        return;
      }

      if (
        String(userId) ===
        String(currentUserId)
      ) {
        return;
      }

      setTypingUser(userId);
    };

    // ===================================================
    // USER STOP TYPING
    // ===================================================

    const userStopTyping = ({
      conversationId:
        typingConversationId,
    }: any) => {
      if (
        String(
          typingConversationId,
        ) ===
        String(conversationId)
      ) {
        setTypingUser(null);
      }
    };

    // ===================================================
    // SOCKET LISTENERS
    // ===================================================

    socket.on(
      "receive-message",
      receiveMessage,
    );

    socket.on(
      "message-delivered",
      handleMessageDelivered,
    );

    socket.on(
      "message-seen",
      handleMessageSeen,
    );

    socket.on(
      "user-typing",
      userTyping,
    );

    socket.on(
      "user-stop-typing",
      userStopTyping,
    );

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      mounted = false;

      socket.emit(
        "leave-conversation",
        conversationId,
      );

      socket.off(
        "receive-message",
        receiveMessage,
      );

      socket.off(
        "message-delivered",
        handleMessageDelivered,
      );

      socket.off(
        "message-seen",
        handleMessageSeen,
      );

      socket.off(
        "user-typing",
        userTyping,
      );

      socket.off(
        "user-stop-typing",
        userStopTyping,
      );
    };
  }, [
    conversation?._id,
    currentUserId,
  ]);

  // =====================================================
  // AUTO SCROLL WHEN MESSAGES CHANGE
  // =====================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom("auto");
    }, 50);

    return () => clearTimeout(timer);
  }, [
    conversation?._id,
    messages.length,
  ]);

  // =====================================================
  // MARK RECEIVED MESSAGES AS SEEN
  // =====================================================

  useEffect(() => {
    if (
      !conversation?._id ||
      !currentUserId ||
      !messages.length
    ) {
      return;
    }

    const unreadMessages =
      messages.filter(
        (message) => {
          const senderId =
            message.sender?._id ||
            message.sender;

          if (
            String(senderId) ===
            String(currentUserId)
          ) {
            return false;
          }

          const seenBy =
            Array.isArray(
              message.seenBy,
            )
              ? message.seenBy
              : [];

          return !seenBy.some(
            (id: any) =>
              String(
                id?._id || id,
              ) ===
              String(currentUserId),
          );
        },
      );

    if (
      !unreadMessages.length
    ) {
      return;
    }

    unreadMessages.forEach(
      (message) => {
        socket.emit(
          "message-seen",
          {
            conversationId:
              conversation._id,
            messageId:
              message._id,
            userId:
              currentUserId,
          },
        );
      },
    );
  }, [
    messages,
    conversation?._id,
    currentUserId,
  ]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = async (
    text: string,
  ) => {
    const cleanText =
      text.trim();

    if (!cleanText) {
      return;
    }

    try {
      const res = await fetch(
        `/api/messages/${conversation._id}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            text: cleanText,
            messageType: "text",
          }),
        },
      );

      const data =
        await res.json();

      if (
        !res.ok ||
        !data.success
      ) {
        alert(
          data.message ||
            "Failed to send message.",
        );

        return;
      }

      const message =
        data.data;

      // -----------------------------------------------
      // Add locally immediately
      // -----------------------------------------------

      setMessages((prev) => {
        const exists = prev.some(
          (item) =>
            String(item._id) ===
            String(message._id),
        );

        if (exists) {
          return prev;
        }

        return [
          ...prev,
          message,
        ];
      });

      // -----------------------------------------------
      // Socket
      // -----------------------------------------------

      socket.emit(
        "send-message",
        {
          conversationId:
            conversation._id,
          message,
        },
      );

      // -----------------------------------------------
      // Scroll down
      // -----------------------------------------------

      setTimeout(() => {
        scrollToBottom("smooth");
      }, 50);
    } catch (error) {
      console.error(
        "Send message error:",
        error,
      );

      alert(
        "Failed to send message.",
      );
    }
  };

  // =====================================================
  // CONVERSATION NAME
  // =====================================================

  const conversationName =
    conversation.type === "group"
      ? conversation.name ||
        "Group"
      : otherUser?.name ||
        "Conversation";

  // =====================================================
  // CONVERSATION AVATAR
  // =====================================================

  const conversationAvatar =
    conversation.type === "group"
      ? conversation.image
      : otherUser?.avatar;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fb]">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">

        <div className="flex items-center gap-3">

          {/* AVATAR */}

          <div className="relative shrink-0">
            {conversationAvatar ? (
              <img
                src={conversationAvatar}
                alt={conversationName}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gray-200 font-semibold text-gray-600">
                {conversationName
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}

            {/* ONLINE DOT */}

            {conversation.type ===
              "private" && (
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                  otherUserStatus ===
                  "online"
                    ? "bg-green-500"
                    : "bg-gray-400"
                }`}
              />
            )}
          </div>

          {/* NAME + STATUS */}

          <div>
            <h2 className="font-semibold text-gray-900">
              {conversationName}
            </h2>

            {conversation.type ===
            "private" ? (
              otherUserStatus ===
              "online" ? (
                <p className="text-xs font-medium text-green-600">
                  Online
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  {formatLastSeen(
                    otherUserLastSeen,
                  )}
                </p>
              )
            ) : (
              <p className="text-xs text-gray-400">
                Group
              </p>
            )}
          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100"
          >
            <Phone size={18} />
          </button>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100"
          >
            <Video size={18} />
          </button>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* ================================================= */}
      {/* MESSAGES */}
      {/* ================================================= */}

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No messages yet.
          </div>
        ) : (
          messages.map(
            (message) => (
              <MessageBubble
                key={message._id}
                message={message}
                own={
                  String(
                    message.sender?._id ||
                      message.sender,
                  ) ===
                  String(currentUserId)
                }
              />
            ),
          )
        )}

        {/* TYPING */}

        {typingUser && (
          <div className="text-sm text-gray-400">
            Typing...
          </div>
        )}

        {/* SCROLL TARGET */}

        <div className="h-px" />
      </div>

      {/* ================================================= */}
      {/* INPUT */}
      {/* ================================================= */}

      <div className="shrink-0">
        <MessageInput
          conversationId={
            conversation._id
          }
          currentUserId={
            currentUserId
          }
          onSend={sendMessage}
        />
      </div>
    </div>
  );
}

