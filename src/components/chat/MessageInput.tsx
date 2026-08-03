
"use client";

import { useState } from "react";
import {
  Paperclip,
  Send,
  Smile,
  X,
} from "lucide-react";
import EmojiPicker, {
  EmojiClickData,
} from "emoji-picker-react";

import { socket } from "@/lib/socket";

interface Props {
  conversationId: string;
  currentUserId: string;
  onSend: (text: string) => void;
}

export default function MessageInput({
  conversationId,
  currentUserId,
  onSend,
}: Props) {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const stopTyping = () => {
    socket.emit("stop-typing", {
      conversationId,
      userId: currentUserId,
    });
  };

  const submit = () => {
    const value = text.trim();

    if (!value) return;

    onSend(value);

    setText("");
    setShowEmojiPicker(false);

    stopTyping();
  };

  const handleChange = (value: string) => {
    setText(value);

    if (value.trim()) {
      socket.emit("typing", {
        conversationId,
        userId: currentUserId,
      });
    } else {
      stopTyping();
    }
  };

  const handleEmojiClick = (
    emojiData: EmojiClickData
  ) => {
    const emoji = emojiData.emoji;

    setText((prev) => prev + emoji);

    socket.emit("typing", {
      conversationId,
      userId: currentUserId,
    });
  };

  return (
    <div className="relative border-t border-gray-200 bg-white p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              className="absolute -right-2 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white text-gray-500 shadow-md hover:bg-gray-100"
            >
              <X size={15} />
            </button>

            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={320}
              height={400}
              searchDisabled={false}
              previewConfig={{
                showPreview: false,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">
        {/* Attachment */}
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-200"
        >
          <Paperclip size={19} />
        </button>

        {/* Emoji */}
        <button
          type="button"
          onClick={() =>
            setShowEmojiPicker((prev) => !prev)
          }
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
            showEmojiPicker
              ? "bg-gray-200 text-gray-900"
              : "text-gray-500 hover:bg-gray-200"
          }`}
        >
          <Smile size={19} />
        </button>

        {/* Message */}
        <textarea
          value={text}
          onChange={(e) =>
            handleChange(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Write a message..."
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none"
        />

        {/* Send */}
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E1320] text-white transition hover:bg-[#1b2435] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

