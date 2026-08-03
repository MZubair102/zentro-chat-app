import mongoose from "mongoose";

const ConversationSchema =
  new mongoose.Schema(
    {
      type: {
        type: String,
        enum: [
          "private",
          "group",
        ],
        default: "private",
      },

      participants: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],

      name: {
        type: String,
        default: "",
      },

      image: {
        type: String,
        default: "",
      },

      lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
      lastMessageAt: {
      type: Date,
      default: null,
    },
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.Conversation ||
  mongoose.model(
    "Conversation",
    ConversationSchema
  );