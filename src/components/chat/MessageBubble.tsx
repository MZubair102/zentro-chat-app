interface Props {
message: any;
own: boolean;
}

export default function MessageBubble({
message,
own,
}: Props) {
// =====================================================
// CHECK MESSAGE STATUS
// =====================================================

const seenBy = Array.isArray(message.seenBy)
? message.seenBy
: [];

const isSeen = seenBy.length > 1;

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
? new Date(
message.createdAt
).toLocaleTimeString("en-US", {
hour: "numeric",
minute: "2-digit",
hour12: true,
})
: "";

// =====================================================
// MESSAGE CONTENT
// =====================================================

const renderContent = () => {
// Image
if (
message.messageType === "image" &&
message.attachments?.length
) {
return ( <div className="space-y-2">
{message.attachments.map(
(file: any, index: number) => (
<img
key={index}
src={file.url}
alt={file.name || "Image"}
className="max-h-80 max-w-full rounded-xl object-cover"
/>
)
)}

```
      {text && (
        <p className="whitespace-pre-wrap text-sm leading-6">
          {text}
        </p>
      )}
    </div>
  );
}

// File
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
        )
      )}

      {text && (
        <p className="whitespace-pre-wrap text-sm leading-6">
          {text}
        </p>
      )}
    </div>
  );
}

// Emoji only
if (isEmojiOnly) {
  return (
    <span className="block text-[42px] leading-[1.1]">
      {text}
    </span>
  );
}

// Normal text
return (
  <p className="whitespace-pre-wrap text-sm leading-6">
    {text}
  </p>
);

};

return (
<div
className={`flex ${
        own
          ? "justify-end"
          : "justify-start"
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
{renderContent()}


    {/* Time + ticks */}
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
            ? "text-gray-400"
            : "text-gray-400"
        }`}
      >
        {time}
      </span>

      {/* Blue / gray ticks */}
      {own && (
        <span
          className={`text-[13px] font-semibold leading-none ${
            isSeen
              ? "text-blue-500"
              : "text-gray-400"
          }`}
          title={
            isSeen
              ? "Seen"
              : "Sent"
          }
        >
          {isSeen
            ? "✓✓"
            : "✓"}
        </span>
      )}
    </div>
  </div>
</div>
)}
