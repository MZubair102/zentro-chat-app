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
  const [messages, setMessages] =
    useState<any[]>([]);

  const [typingUser, setTypingUser] =
    useState<string | null>(null);

  const messagesContainerRef =
    useRef<HTMLDivElement | null>(null);

  const shouldScrollRef =
    useRef(true);

  // =====================================================
  // OTHER USER
  // =====================================================

  const otherUser =
    conversation.participants?.find(
      (user: any) =>
        String(user._id) !==
        String(currentUserId),
    );

  const otherUserId =
    otherUser?._id?.toString();

  // =====================================================
  // STATUS
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
  // AUTO SCROLL
  // =====================================================

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
  // LOAD MESSAGES
  // =====================================================

  useEffect(() => {
    if (!conversation?._id) {
      return;
    }

    let mounted = true;

    const conversationId =
      String(conversation._id);

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
          const loaded =
            Array.isArray(data.data)
              ? data.data
              : [];

          setMessages(loaded);

          shouldScrollRef.current =
            true;

          setTimeout(() => {
            scrollToBottom("auto");
          }, 50);
        }
      } catch (error) {
        console.error(
          "Load messages error:",
          error,
        );
      }
    };

    loadMessages();

    // ===================================================
    // JOIN CONVERSATION
    // ===================================================

    socket.emit(
      "join-conversation",
      conversationId,
    );

    // ===================================================
    // RECEIVE MESSAGE
    // ===================================================

    const receiveMessage = (
      message: any,
    ) => {
      if (
        String(
          message.conversationId,
        ) !== conversationId
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

      shouldScrollRef.current =
        true;
    };

    // ===================================================
    // DELIVERED
    // ===================================================

    const handleMessageDelivered = ({
      conversationId:
        eventConversationId,
      messageId,
      userId,
    }: {
      conversationId: string;
      messageId: string;
      userId: string;
    }) => {
      if (
        String(eventConversationId) !==
        conversationId
      ) {
        return;
      }

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

          const exists =
            currentDeliveredBy.some(
              (id: any) =>
                String(
                  id?._id || id,
                ) === String(userId),
            );

          if (exists) {
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
    // SEEN
    // ===================================================

    const handleMessageSeen = ({
      conversationId:
        eventConversationId,
      messageId,
      userId,
    }: {
      conversationId: string;
      messageId: string;
      userId: string;
    }) => {
      if (
        String(eventConversationId) !==
        conversationId
      ) {
        return;
      }

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

          const exists =
            currentSeenBy.some(
              (id: any) =>
                String(
                  id?._id || id,
                ) === String(userId),
            );

          if (exists) {
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
    // TYPING
    // ===================================================

    const userTyping = ({
      conversationId:
        typingConversationId,
      userId,
    }: any) => {
      if (
        String(
          typingConversationId,
        ) !== conversationId
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
    // STOP TYPING
    // ===================================================

    const userStopTyping = ({
      conversationId:
        typingConversationId,
    }: any) => {
      if (
        String(
          typingConversationId,
        ) === conversationId
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

      setTypingUser(null);
    };
  }, [
    conversation?._id,
    currentUserId,
  ]);

  // =====================================================
  // AUTO SCROLL WHEN MESSAGES CHANGE
  // =====================================================

  useEffect(() => {
    if (!shouldScrollRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);

    return () => clearTimeout(timer);
  }, [messages.length]);

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

    const conversationId =
      String(conversation._id);

    const unreadMessages =
      messages.filter((message) => {
        const senderId = String(
          message.sender?._id ||
            message.sender ||
            "",
        );

        // Own messages ko seen nahi karna
        if (
          senderId ===
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

        const alreadySeen =
          seenBy.some(
            (id: any) =>
              String(
                id?._id || id,
              ) ===
              String(currentUserId),
          );

        return !alreadySeen;
      });

    if (!unreadMessages.length) {
      return;
    }

    unreadMessages.forEach(
      (message) => {
        socket.emit(
          "message-seen",
          {
            conversationId,
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

      const data = await res.json();

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

      // ------------------------------------------
      // LOCAL MESSAGE
      // ------------------------------------------

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

      shouldScrollRef.current =
        true;

      // ------------------------------------------
      // SOCKET
      // ------------------------------------------

      socket.emit(
        "send-message",
        {
          conversationId:
            conversation._id,
          message,
        },
      );
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
  // AVATAR
  // =====================================================

  const conversationAvatar =
    conversation.type === "group"
      ? conversation.image
      : otherUser?.avatar;

  // =====================================================
  // LAST SEEN
  // =====================================================

  const formatLastSeen = (
    date:
      | string
      | Date
      | null
      | undefined,
  ) => {
    if (!date) {
      return "last seen recently";
    }

    const lastSeen =
      new Date(date);

    if (
      Number.isNaN(
        lastSeen.getTime(),
      )
    ) {
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

    if (
      lastSeen.toDateString() ===
      now.toDateString()
    ) {
      return `last seen today at ${time}`;
    }

    const yesterday =
      new Date(now);

    yesterday.setDate(
      now.getDate() - 1,
    );

    if (
      lastSeen.toDateString() ===
      yesterday.toDateString()
    ) {
      return `last seen yesterday at ${time}`;
    }

    return `last seen ${lastSeen.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      },
    )} at ${time}`;
  };

  // =====================================================
  // LIVE USER STATUS
  // =====================================================

  useEffect(() => {
    if (!otherUserId) {
      return;
    }

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
  // UI
  // =====================================================

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fb]">

      {/* HEADER */}

      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">

        <div className="flex items-center gap-3">

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

      {/* MESSAGES */}

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 overflow-y-auto p-6"
        onScroll={() => {
          const container =
            messagesContainerRef.current;

          if (!container) return;

          const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

          shouldScrollRef.current =
            distanceFromBottom < 100;
        }}
      >
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-gray-400">
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
                        message.sender ||
                        "",
                    ) ===
                    String(
                      currentUserId,
                    )
                  }
                />
              ),
            )
          )}

          {typingUser && (
            <div className="text-sm text-gray-400">
              Typing...
            </div>
          )}
        </div>
      </div>

      {/* INPUT */}

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