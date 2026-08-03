import mongoose from "mongoose";

const MessageSchema =
  new mongoose.Schema(
    {
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
      },

      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      text: {
        type: String,
        default: "",
      },

      messageType: {
        type: String,
        enum: [
          "text",
          "image",
          "file",
        ],
        default: "text",
      },

      attachments: [
        {
          url: String,
          name: String,
          type: String,
          size: Number,
        },
      ],

      seenBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],

      deleted: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.Message ||
  mongoose.model(
    "Message",
    MessageSchema
  );