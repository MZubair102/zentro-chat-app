"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { socket } from "@/lib/socket";

import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: "online" | "offline";
  lastSeen?: string | null;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);

  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.success) {
          window.location.href = "/login";
          return;
        }

        setUser(data.data);
      } catch (error) {
        console.error(error);
        window.location.href = "/login";
      } finally {
        setLoadingUser(false);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    const joinUser = () => {
      console.log("Socket connected:", socket.id);

      socket.emit("join-user", user._id);
    };

    if (!socket.connected) {
      socket.connect();
    }

    if (socket.connected) {
      socket.emit("join-user", user._id);
    } else {
      socket.once("connect", joinUser);
    }

    return () => {
      socket.off("connect", joinUser);
    };
  }, [user?._id]);

  if (loadingUser) {
    return (
      <main className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">Loading chat...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex h-screen bg-gray-100">
      <ChatSidebar
        currentUserId={user._id}
        selectedConversation={selectedConversation}
        onSelect={setSelectedConversation}
      />

      <section className="flex flex-1">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={user._id}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
            <MessageCircle size={64} strokeWidth={1} />

            <h2 className="mt-4 text-lg font-semibold">
              Select a conversation
            </h2>

            <p className="mt-1 text-sm">Choose a chat to start messaging.</p>
          </div>
        )}
      </section>
    </main>
  );
}
