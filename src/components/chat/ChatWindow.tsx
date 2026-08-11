
"use client";

import { useEffect, useRef, useState } from "react";

import {
  MoreVertical,
  Phone,
  Video,
  Trash2,
  X,
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
  // =====================================================
  // MESSAGES
  // =====================================================

  const [messages, setMessages] = useState<any[]>([]);

  const [typingUser, setTypingUser] =
    useState<string | null>(null);

  const messagesContainerRef =
    useRef<HTMLDivElement | null>(null);

  const shouldScrollRef = useRef(true);

  // =====================================================
  // FILE UPLOAD
  // =====================================================

  const [uploadingFile, setUploadingFile] =
    useState(false);

  // =====================================================
  // DELETE MENU
  // =====================================================

  const [deleteMenuMessage, setDeleteMenuMessage] =
    useState<any | null>(null);

  const [deleteMenuPosition, setDeleteMenuPosition] =
    useState<{
      top: number;
      left: number;
    } | null>(null);

  const [deletingMessageId, setDeletingMessageId] =
    useState<string | null>(null);

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
  // UPDATE STATUS
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
  // CLOSE DELETE MENU
  // =====================================================

  useEffect(() => {
    const handleOutsideClick = () => {
      setDeleteMenuMessage(null);
      setDeleteMenuPosition(null);
    };

    if (!deleteMenuMessage) {
      return;
    }

    document.addEventListener(
      "click",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleOutsideClick,
      );
    };
  }, [deleteMenuMessage]);

  // =====================================================
  // SCROLL
  // =====================================================

  const scrollToBottom = (
    behavior: ScrollBehavior = "smooth",
  ) => {
    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  // =====================================================
  // LOAD MESSAGES + SOCKET
  // =====================================================

  useEffect(() => {
    if (!conversation?._id) {
      return;
    }

    let mounted = true;

    const conversationId =
      String(conversation._id);

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
    // JOIN
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
        String(message.conversationId) !==
        conversationId
      ) {
        return;
      }

      setMessages((prev) => {
        const exists =
          prev.some(
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
                ) ===
                String(userId),
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
                ) ===
                String(userId),
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
    // MESSAGE DELETED
    // ===================================================

    const handleMessageDeleted = ({
      conversationId:
        eventConversationId,
      messageId,
      deleteType,
    }: {
      conversationId: string;
      messageId: string;
      deleteType:
        | "me"
        | "everyone";
    }) => {
      if (
        String(eventConversationId) !==
        conversationId
      ) {
        return;
      }

      if (
        deleteType ===
        "everyone"
      ) {
        setMessages((prev) =>
          prev.map((message) => {
            if (
              String(message._id) !==
              String(messageId)
            ) {
              return message;
            }

            return {
              ...message,
              deletedForEveryone:
                true,
              deletedAt:
                new Date().toISOString(),
            };
          }),
        );

        return;
      }

      if (
        deleteType === "me"
      ) {
        setMessages((prev) =>
          prev.filter(
            (message) =>
              String(message._id) !==
              String(messageId),
          ),
        );
      }
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
      "message-deleted",
      handleMessageDeleted,
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
        "message-deleted",
        handleMessageDeleted,
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
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    if (
      !shouldScrollRef.current
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 50);

    return () =>
      clearTimeout(timer);
  }, [messages.length]);

  // =====================================================
  // MARK MESSAGES SEEN
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
      messages.filter(
        (message) => {
          if (
            message.deletedForEveryone
          ) {
            return false;
          }

          const senderId =
            String(
              message.sender?._id ||
                message.sender ||
                "",
            );

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
                String(
                  currentUserId,
                ),
            );

          return !alreadySeen;
        },
      );

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
  // DELETE MESSAGE
  // =====================================================

  const deleteMessage = async (
    message: any,
    deleteForEveryone: boolean,
  ) => {
    if (!message?._id) {
      return;
    }

    const messageId =
      String(message._id);

    setDeletingMessageId(
      messageId,
    );

    try {
      const res = await fetch(
        `/api/messages/${conversation._id}`,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            conversationId:
              String(
                conversation._id,
              ),

            messageId,

            deleteForEveryone,
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
            "Failed to delete message.",
        );

        return;
      }

      if (
        data.deleteType === "me"
      ) {
        setMessages((prev) =>
          prev.filter(
            (item) =>
              String(item._id) !==
              messageId,
          ),
        );

        socket.emit(
          "message-deleted",
          {
            conversationId:
              String(
                conversation._id,
              ),

            messageId,

            deleteType: "me",

            userId:
              currentUserId,
          },
        );
      }

      if (
        data.deleteType ===
        "everyone"
      ) {
        setMessages((prev) =>
          prev.map((item) => {
            if (
              String(item._id) !==
              messageId
            ) {
              return item;
            }

            return {
              ...item,

              deletedForEveryone:
                true,

              deletedAt:
                new Date().toISOString(),
            };
          }),
        );

        socket.emit(
          "message-deleted",
          {
            conversationId:
              String(
                conversation._id,
              ),

            messageId,

            deleteType:
              "everyone",

            userId:
              currentUserId,
          },
        );
      }

      setDeleteMenuMessage(
        null,
      );

      setDeleteMenuPosition(
        null,
      );
    } catch (error) {
      console.error(
        "Delete message error:",
        error,
      );

      alert(
        "Failed to delete message.",
      );
    } finally {
      setDeletingMessageId(
        null,
      );
    }
  };

  // =====================================================
  // OPEN DELETE MENU
  // =====================================================

  const openDeleteMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    message: any,
  ) => {
    event.stopPropagation();

    const rect =
      event.currentTarget.getBoundingClientRect();

    setDeleteMenuMessage(
      message,
    );

    setDeleteMenuPosition({
      top:
        rect.bottom + 6,

      left: Math.max(
        10,
        rect.right - 190,
      ),
    });
  };

  // =====================================================
  // SEND TEXT MESSAGE
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
            attachments: [],
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

      setMessages((prev) => {
        const exists =
          prev.some(
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
  // FILE TYPE
  // =====================================================

  const getMessageType = (
    file: File,
  ): "image" | "file" => {
    if (
      file.type.startsWith(
        "image/",
      )
    ) {
      return "image";
    }

    return "file";
  };

  // =====================================================
  // HANDLE FILE SELECT
  // =====================================================

 const handleFileSelect = async (file: File) => {
  try {
    if (!file) {
      return;
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append(
      "messageType",
      file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : "file"
    );

    const res = await fetch(
      `/api/messages/${conversation._id}`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(
        data.message ||
          "Failed to upload file."
      );

      return;
    }

    const message = data.data;

    // Add immediately to current chat
    setMessages((prev) => {
      const exists = prev.some(
        (item) =>
          String(item._id) ===
          String(message._id)
      );

      if (exists) {
        return prev;
      }

      return [
        ...prev,
        message,
      ];
    });

    shouldScrollRef.current = true;

    // Send through socket
    socket.emit("send-message", {
      conversationId:
        conversation._id,

      message,
    });
  } catch (error) {
    console.error(
      "File upload error:",
      error
    );

    alert(
      "Failed to upload file."
    );
  }
};

  // =====================================================
  // CONVERSATION NAME
  // =====================================================

  const conversationName =
    conversation.type ===
    "group"
      ? conversation.name ||
        "Group"
      : otherUser?.name ||
        "Conversation";

  // =====================================================
  // AVATAR
  // =====================================================

  const conversationAvatar =
    conversation.type ===
    "group"
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

      setOtherUserStatus(
        "online",
      );

      setOtherUserLastSeen(
        null,
      );
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

      setOtherUserStatus(
        "offline",
      );

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

      {/* =================================================
          HEADER
      ================================================= */}

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

      {/* =================================================
          MESSAGES
      ================================================= */}

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 overflow-y-auto p-6"
        onScroll={() => {
          const container =
            messagesContainerRef.current;

          if (!container) {
            return;
          }

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
              (message) => {
                const own =
                  String(
                    message.sender?._id ||
                      message.sender ||
                      "",
                  ) ===
                  String(
                    currentUserId,
                  );

                const isDeleted =
                  message.deletedForEveryone ===
                  true;

                return (
                  <div
                    key={message._id}
                    className={`group relative flex ${
                      own
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div className="relative max-w-[70%]">

                      {!isDeleted && (
                        <button
                          type="button"
                          onClick={(event) =>
                            openDeleteMenu(
                              event,
                              message,
                            )
                          }
                          className={`absolute top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-800 group-hover:flex ${
                            own
                              ? "-left-9"
                              : "-right-9"
                          }`}
                        >
                          <MoreVertical
                            size={15}
                          />
                        </button>
                      )}

                      {isDeleted ? (
                        <div
                          className={`rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm italic text-gray-400 ${
                            own
                              ? "rounded-br-md"
                              : "rounded-bl-md"
                          }`}
                        >
                          This message was deleted
                        </div>
                      ) : (
                        <MessageBubble
                          message={message}
                          own={own}
                        />
                      )}

                    </div>
                  </div>
                );
              },
            )
          )}

          {typingUser && (
            <div className="text-sm text-gray-400">
              Typing...
            </div>
          )}

        </div>
      </div>

      {/* =================================================
          INPUT
      ================================================= */}

      <div className="relative shrink-0">

        {uploadingFile && (
          <div className="absolute bottom-full left-0 right-0 border-t border-gray-200 bg-white px-4 py-2">
            <p className="text-xs text-gray-500">
              Uploading file...
            </p>
          </div>
        )}

        <MessageInput
          conversationId={
            String(conversation._id)
          }
          currentUserId={
            String(currentUserId)
          }
          onSend={sendMessage}
          onFileSelect={
            handleFileSelect
          }
        />

      </div>

      {/* =================================================
          DELETE MENU
      ================================================= */}

      {deleteMenuMessage &&
        deleteMenuPosition && (
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            className="fixed z-[9999] w-[190px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
            style={{
              top:
                deleteMenuPosition.top,

              left:
                deleteMenuPosition.left,
            }}
          >

            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">

              <span className="text-xs font-semibold text-gray-500">
                Delete message
              </span>

              <button
                type="button"
                onClick={() => {
                  setDeleteMenuMessage(
                    null,
                  );

                  setDeleteMenuPosition(
                    null,
                  );
                }}
                className="grid h-6 w-6 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={14} />
              </button>

            </div>

            {/* DELETE FOR ME */}

            <button
              type="button"
              disabled={
                deletingMessageId ===
                String(
                  deleteMenuMessage._id,
                )
              }
              onClick={() =>
                deleteMessage(
                  deleteMenuMessage,
                  false,
                )
              }
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2
                size={16}
                className="text-gray-500"
              />

              <span>
                Delete for me
              </span>
            </button>

            {/* DELETE FOR EVERYONE */}

            {String(
              deleteMenuMessage.sender?._id ||
                deleteMenuMessage.sender ||
                "",
            ) ===
              String(
                currentUserId,
              ) && (
              <button
                type="button"
                disabled={
                  deletingMessageId ===
                  String(
                    deleteMenuMessage._id,
                  )
                }
                onClick={() =>
                  deleteMessage(
                    deleteMenuMessage,
                    true,
                  )
                }
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2
                  size={16}
                />

                <span>
                  Delete for everyone
                </span>
              </button>
            )}

          </div>
        )}

    </div>
  );
}

