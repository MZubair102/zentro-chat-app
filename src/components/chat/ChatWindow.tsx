"use client";

import {
  useEffect,
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

  const otherUser = conversation.participants?.find(
    (user: any) => user._id !== currentUserId
  );
// =================
 //Format last seen
//=====================
  const formatLastSeen = (date: string | Date | null | undefined) => {
  if (!date) return "";

  const lastSeen = new Date(date);

  if (Number.isNaN(lastSeen.getTime())) return "";

  const now = new Date();

  const isToday =
    lastSeen.toDateString() === now.toDateString();

  if (isToday) {
    return `last seen today at ${lastSeen.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (lastSeen.toDateString() === yesterday.toDateString()) {
    return `last seen yesterday at ${lastSeen.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return `last seen ${lastSeen.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} at ${lastSeen.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
};
  useEffect(() => {
    if (!conversation?._id) return;

    let mounted = true;

    const loadMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages/${conversation._id}`,
          {
            credentials: "include",
          }
        );

        const data = await res.json();

        if (mounted && data.success) {
          setMessages(data.data || []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadMessages();

    socket.emit(
      "join-conversation",
      conversation._id
    );

    const receiveMessage = (message: any) => {
      if (
        message.conversationId !==
        conversation._id
      ) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (item) => item._id === message._id
        );

        if (exists) {
          return prev;
        }

        return [...prev, message];
      });
    };

    const userTyping = ({
      conversationId,
      userId,
    }: any) => {
      if (
        conversationId === conversation._id &&
        userId !== currentUserId
      ) {
        setTypingUser(userId);
      }
    };

    const userStopTyping = ({
      conversationId,
    }: any) => {
      if (
        conversationId === conversation._id
      ) {
        setTypingUser(null);
      }
    };

    socket.on(
      "receive-message",
      receiveMessage
    );

    socket.on(
      "user-typing",
      userTyping
    );

    socket.on(
      "user-stop-typing",
      userStopTyping
    );

    return () => {
      mounted = false;

      socket.emit(
        "leave-conversation",
        conversation._id
      );

      socket.off(
        "receive-message",
        receiveMessage
      );

      socket.off(
        "user-typing",
        userTyping
      );

      socket.off(
        "user-stop-typing",
        userStopTyping
      );
    };
  }, [
    conversation?._id,
    currentUserId,
  ]);

  const sendMessage = async (
    text: string
  ) => {
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
            text,
            messageType: "text",
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed to send message."
        );
        return;
      }

      const message = data.data;

      setMessages((prev) => {
        const exists = prev.some(
          (item) => item._id === message._id
        );

        if (exists) return prev;

        return [...prev, message];
      });

      socket.emit("send-message", {
        conversationId:
          conversation._id,
        message,
      });
    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    }
  };

  const conversationName =
    conversation.type === "group"
      ? conversation.name || "Group"
      : otherUser?.name ||
        "Conversation";

  const conversationAvatar =
    conversation.type === "group"
      ? conversation.image
      : otherUser?.avatar;

  return (
    <div className="flex flex-1 flex-col bg-[#f8f9fb]">
      <header className="flex h-[76px] items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-3">
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

          <div>
            <h2 className="font-semibold text-gray-900">
              {conversationName}
            </h2>

            <p className="text-xs text-green-600">
              {otherUser?.status === "online"
                ? "Online"
                : formatLastSeen(otherUser?.lastSeen)}
              
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100">
            <Phone size={18} />
          </button>

          <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100">
            <Video size={18} />
          </button>

          <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No messages yet.
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              own={
                String(
                  message.sender?._id ||
                    message.sender
                ) ===
                String(currentUserId)
              }
            />
          ))
        )}

        {typingUser && (
          <div className="text-sm text-gray-400">
            Typing...
          </div>
        )}
      </div>

      <MessageInput
        conversationId={conversation._id}
        currentUserId={currentUserId}
        onSend={sendMessage}
      />
    </div>
  );
}