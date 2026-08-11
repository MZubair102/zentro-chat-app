import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==================================================
    // TEXT
    // ==================================================

    text: {
      type: String,
      default: "",
      trim: true,
    },

    // ==================================================
    // MESSAGE TYPE
    // ==================================================

    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },

    // ==================================================
    // ATTACHMENTS
    // ==================================================

    attachments: [
      {
        url: {
          type: String,
          required: true,
        },

        name: {
          type: String,
          default: "",
        },

        // MIME type
        // image/jpeg
        // video/mp4
        // application/pdf
        type: {
          type: String,
          default: "",
        },

        // Example:
        // "2.35 MB"
        // "450.50 KB"
        size: {
          type: String,
          default: "",
        },

        // Cloudinary public ID
        publicId: {
          type: String,
          default: "",
        },

        // image / video / raw
        resourceType: {
          type: String,
          enum: ["image", "video", "raw", ""],
          default: "",
        },
      },
    ],

    // ==================================================
    // SEEN
    // ==================================================

    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ==================================================
    // DELIVERED
    // ==================================================

    deliveredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ==================================================
    // DELETE FOR ME
    // ==================================================

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ==================================================
    // DELETE FOR EVERYONE
    // ==================================================

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);