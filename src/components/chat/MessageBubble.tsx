"use client";

interface Props {
  message: any;
  own: boolean;
}

export default function MessageBubble({
  message,
  own,
}: Props) {
  // =====================================================
  // MESSAGE IDS
  // =====================================================

  const senderId = String(
    message.sender?._id || message.sender || "",
  );

  // =====================================================
  // DELIVERED BY
  // =====================================================

  const deliveredBy = Array.isArray(message.deliveredBy)
    ? message.deliveredBy
    : [];

  const isDelivered = deliveredBy.some((user: any) => {
    const userId = String(user?._id || user || "");

    // Sender ko delivered count nahi karna
    return userId !== senderId;
  });

  // =====================================================
  // SEEN BY
  // =====================================================

  const seenBy = Array.isArray(message.seenBy)
    ? message.seenBy
    : [];

  const isSeen = seenBy.some((user: any) => {
    const userId = String(user?._id || user || "");

    // Sender ko seen count nahi karna
    return userId !== senderId;
  });

  // =====================================================
  // CHECK EMOJI ONLY
  // =====================================================

  const text = message.text || "";

  const emojiOnlyRegex =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u;

  const isEmojiOnly =
    text.trim().length > 0 &&
    emojiOnlyRegex.test(text.trim());

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  // =====================================================
  // MESSAGE CONTENT
  // =====================================================

  const renderContent = () => {
    // ===================================================
    // IMAGE
    // ===================================================

    if (
      message.messageType === "image" &&
      message.attachments?.length
    ) {
      return (
        <div className="space-y-2">
          {message.attachments.map(
            (file: any, index: number) => (
              <img
                key={index}
                src={file.url}
                alt={file.name || "Image"}
                className="max-h-80 max-w-full rounded-xl object-cover"
              />
            ),
          )}

          {text && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {text}
            </p>
          )}
        </div>
      );
    }

    // ===================================================
    // FILE
    // ===================================================

    if (
      message.messageType === "file" &&
      message.attachments?.length
    ) {
      return (
        <div className="space-y-2">
          {message.attachments.map(
            (file: any, index: number) => (
              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-lg px-3 py-2 text-sm underline ${
                  own
                    ? "bg-white/10 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                📎 {file.name || "Download file"}
              </a>
            ),
          )}

          {text && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {text}
            </p>
          )}
        </div>
      );
    }

    // ===================================================
    // EMOJI ONLY
    // ===================================================

    if (isEmojiOnly) {
      return (
        <span className="block text-[42px] leading-[1.1]">
          {text}
        </span>
      );
    }

    // ===================================================
    // NORMAL TEXT
    // ===================================================

    return (
      <p className="whitespace-pre-wrap text-sm leading-6">
        {text}
      </p>
    );
  };

  // =====================================================
  // MESSAGE STATUS
  // =====================================================

  const renderStatus = () => {
    if (!own) {
      return null;
    }

    // ===================================================
    // SEEN
    // ===================================================

    if (isSeen) {
      return (
        <span
          className="text-[13px] font-semibold leading-none text-blue-500"
          title="Seen"
        >
          ✓✓
        </span>
      );
    }

    // ===================================================
    // DELIVERED
    // ===================================================

    if (isDelivered) {
      return (
        <span
          className="text-[13px] font-semibold leading-none text-gray-400"
          title="Delivered"
        >
          ✓✓
        </span>
      );
    }

    // ===================================================
    // SENT
    // ===================================================

    return (
      <span
        className="text-[13px] font-semibold leading-none text-gray-400"
        title="Sent"
      >
        ✓
      </span>
    );
  };

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <div
      className={`flex ${
        own ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[70%] ${
          isEmojiOnly
            ? "px-1 py-1"
            : `rounded-2xl px-4 py-3 ${
                own
                  ? "rounded-br-md bg-[#0E1320] text-white"
                  : "rounded-bl-md bg-white text-gray-800 shadow-sm"
              }`
        }`}
      >
        {/* MESSAGE */}

        {renderContent()}

        {/* TIME + STATUS */}

        <div
          className={`mt-1 flex items-center justify-end gap-1 ${
            isEmojiOnly ? "px-1" : ""
          }`}
        >
          {/* TIME */}

          <span className="text-[10px] text-gray-400">
            {time}
          </span>

          {/* STATUS */}

          {renderStatus()}
        </div>
      </div>
    </div>
  );
}