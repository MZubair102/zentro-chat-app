"use client";

import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Play,
} from "lucide-react";

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
    message.sender?._id ||
      message.sender ||
      "",
  );

  // =====================================================
  // DELIVERED BY
  // =====================================================

  const deliveredBy = Array.isArray(
    message.deliveredBy,
  )
    ? message.deliveredBy
    : [];

  const isDelivered =
    own &&
    deliveredBy.some((user: any) => {
      const userId = String(
        user?._id || user || "",
      );

      return userId !== senderId;
    });

  // =====================================================
  // SEEN BY
  // =====================================================

  const seenBy = Array.isArray(
    message.seenBy,
  )
    ? message.seenBy
    : [];

  const isSeen =
    own &&
    seenBy.some((user: any) => {
      const userId = String(
        user?._id || user || "",
      );

      return userId !== senderId;
    });

  // =====================================================
  // TEXT
  // =====================================================

  const text =
    typeof message.text === "string"
      ? message.text
      : "";

  // =====================================================
  // ATTACHMENTS
  // =====================================================

  const attachments = Array.isArray(
    message.attachments,
  )
    ? message.attachments
    : [];

  // =====================================================
  // EMOJI ONLY
  // =====================================================

  const emojiOnlyRegex =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u;

  const isEmojiOnly =
    text.trim().length > 0 &&
    emojiOnlyRegex.test(text.trim());

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const time = message.createdAt
    ? new Date(
        message.createdAt,
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  // =====================================================
  // STATUS
  // =====================================================

  const renderStatus = () => {
    // Receiver ke message par status nahi
    if (!own) {
      return null;
    }

    // Seen
    if (isSeen) {
      return (
        <CheckCheck
          size={15}
          strokeWidth={2.5}
          className="text-blue-500"
        />
      );
    }

    // Delivered
    if (isDelivered) {
      return (
        <CheckCheck
          size={15}
          strokeWidth={2.5}
          className="text-gray-400"
        />
      );
    }

    // Sent
    return (
      <Check
        size={15}
        strokeWidth={2.5}
        className="text-gray-400"
      />
    );
  };

  // =====================================================
  // IMAGE
  // =====================================================

  const renderImages = () => {
    if (!attachments.length) {
      return null;
    }

    return (
      <div className="space-y-2">
        {attachments.map(
          (file: any, index: number) => (
            <a
              key={`${file.url}-${index}`}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl"
            >
              <img
                src={file.url}
                alt={
                  file.name ||
                  "Image"
                }
                className="max-h-[350px] max-w-full rounded-xl object-cover transition hover:opacity-95"
              />
            </a>
          ),
        )}
      </div>
    );
  };

  // =====================================================
  // VIDEO
  // =====================================================

  const renderVideos = () => {
    if (!attachments.length) {
      return null;
    }

    return (
      <div className="space-y-2">
        {attachments.map(
          (file: any, index: number) => (
            <div
              key={`${file.url}-${index}`}
              className="overflow-hidden rounded-xl"
            >
              <video
                src={file.url}
                controls
                preload="metadata"
                className="max-h-[350px] max-w-full rounded-xl"
              >
                Your browser does not
                support video playback.
              </video>
            </div>
          ),
        )}
      </div>
    );
  };

  // =====================================================
  // FILE
  // =====================================================

  const renderFiles = () => {
    if (!attachments.length) {
      return null;
    }

    return (
      <div className="space-y-2">
        {attachments.map(
          (file: any, index: number) => (
            <a
              key={`${file.url}-${index}`}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              download={file.name}
              className={`flex items-center gap-3 rounded-xl p-3 transition ${
                own
                  ? "bg-white/10 hover:bg-white/15"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {/* File Icon */}
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  own
                    ? "bg-white/10"
                    : "bg-white"
                }`}
              >
                <FileText
                  size={20}
                  className={
                    own
                      ? "text-white"
                      : "text-gray-600"
                  }
                />
              </div>

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    own
                      ? "text-white"
                      : "text-gray-800"
                  }`}
                >
                  {file.name ||
                    "Download file"}
                </p>

                {file.size ? (
                  <p
                    className={`text-xs ${
                      own
                        ? "text-white/60"
                        : "text-gray-500"
                    }`}
                  >
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                ) : null}
              </div>

              {/* Download */}
              <Download
                size={18}
                className={
                  own
                    ? "text-white/70"
                    : "text-gray-500"
                }
              />
            </a>
          ),
        )}
      </div>
    );
  };

  // =====================================================
  // MESSAGE CONTENT
  // =====================================================

  const renderContent = () => {
    // -----------------------------------------------
    // IMAGE
    // -----------------------------------------------

    if (
      message.messageType ===
      "image"
    ) {
      return (
        <div className="space-y-2">
          {renderImages()}

          {text && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {text}
            </p>
          )}
        </div>
      );
    }

    // -----------------------------------------------
    // VIDEO
    // -----------------------------------------------

    if (
      message.messageType ===
      "video"
    ) {
      return (
        <div className="space-y-2">
          {renderVideos()}

          {text && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {text}
            </p>
          )}
        </div>
      );
    }

    // -----------------------------------------------
    // FILE
    // -----------------------------------------------

    if (
      message.messageType ===
      "file"
    ) {
      return (
        <div className="space-y-2">
          {renderFiles()}

          {text && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {text}
            </p>
          )}
        </div>
      );
    }

    // -----------------------------------------------
    // EMOJI ONLY
    // -----------------------------------------------

    if (isEmojiOnly) {
      return (
        <span className="text-5xl leading-none">
          {text}
        </span>
      );
    }

    // -----------------------------------------------
    // NORMAL TEXT
    // -----------------------------------------------

    return (
      <p className="whitespace-pre-wrap text-sm leading-6">
        {text}
      </p>
    );
  };

  // =====================================================
  // DELETED MESSAGE
  // =====================================================

  if (
    message.deletedForEveryone
  ) {
    return (
      <div
        className={`max-w-[70%] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 ${
          own
            ? "rounded-br-md"
            : "rounded-bl-md"
        }`}
      >
        <p className="text-sm italic text-gray-400">
          This message was deleted
        </p>

        <div className="mt-1 flex items-center justify-end">
          <span className="text-[10px] text-gray-400">
            {time}
          </span>
        </div>
      </div>
    );
  }

  // =====================================================
  // BUBBLE
  // =====================================================

  return (
    <div
      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
        isEmojiOnly
          ? "bg-transparent shadow-none px-1 py-1"
          : own
            ? "rounded-br-md bg-[#0E1320] text-white"
            : "rounded-bl-md bg-white text-gray-800 border border-gray-100"
      }`}
    >
      {/* =================================================
          CONTENT
      ================================================= */}

      {renderContent()}

      {/* =================================================
          TIME + STATUS
      ================================================= */}

      <div
        className={`mt-1 flex items-center justify-end gap-1 ${
          isEmojiOnly
            ? "px-1"
            : ""
        }`}
      >
        <span
          className={`text-[10px] ${
            own
              ? "text-white/50"
              : "text-gray-400"
          }`}
        >
          {time}
        </span>

        {renderStatus()}
      </div>
    </div>
  );
}