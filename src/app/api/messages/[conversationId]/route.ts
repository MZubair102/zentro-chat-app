
import { NextRequest, NextResponse } from "next/server";

import {connectDB} from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/auth";

import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

// ======================================================
// GET MESSAGES
// ======================================================

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      conversationId: string;
    }>;
  }
) {
  try {
    await connectDB();

    const userId =
      await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { conversationId } =
      await params;

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // CHECK CONVERSATION
    // =====================================

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================
    // GET MESSAGES
    // =====================================

    const messages =
      await Message.find({
        conversationId,

        // Hide messages deleted only for me
        deletedFor: {
          $ne: userId,
        },
      })
        .populate(
          "sender",
          "name email avatar status lastSeen"
        )
        .sort({
          createdAt: 1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error(
      "GET MESSAGES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to load messages.",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// SEND MESSAGE
// ======================================================


import mongoose from "mongoose";



interface RouteContext {
  params: Promise<{
    conversationId: string;
  }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    // ==================================================
    // CONNECT DATABASE
    // ==================================================

    await connectDB();

    // ==================================================
    // GET LOGGED-IN USER
    // ==================================================

    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login first.",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // GET CONVERSATION ID FROM URL
    // ==================================================

    const { conversationId } = await params;


  

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // VALIDATE MONGODB OBJECT ID
    // ==================================================

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid conversation ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // READ REQUEST BODY
    // ==================================================

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON body.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      text = "",
      messageType = "text",
      attachments = [],
    } = body;

    // ==================================================
    // VALIDATE MESSAGE TYPE
    // ==================================================

    const allowedTypes = [
      "text",
      "image",
      "file",
    ];

    if (!allowedTypes.includes(messageType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid message type.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CLEAN TEXT
    // ==================================================

    const cleanText =
      typeof text === "string"
        ? text.trim()
        : "";

    // ==================================================
    // VALIDATE ATTACHMENTS
    // ==================================================

    const cleanAttachments = Array.isArray(attachments)
      ? attachments
      : [];

    // ==================================================
    // VALIDATE MESSAGE CONTENT
    // ==================================================

    if (
      messageType === "text" &&
      !cleanText
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Message cannot be empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      messageType !== "text" &&
      !cleanText &&
      cleanAttachments.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Message content is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // FIND CONVERSATION
    // ==================================================

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation not found or you are not a participant.",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // CREATE MESSAGE
    // ==================================================

    const message = await Message.create({
      conversationId: conversation._id,

      sender: userId,

      text: cleanText,

      messageType,

      attachments: cleanAttachments,

      seenBy: [userId],

      deleted: false,
    });

    // ==================================================
    // UPDATE CONVERSATION
    // ==================================================

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    await conversation.save();

    // ==================================================
    // POPULATE SENDER
    // ==================================================

    await message.populate(
      "sender",
      "name email avatar status lastSeen"
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully.",
        data: message,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to send message.",
      },
      {
        status: 500,
      }
    );
  }
}


// ======================================================
// DELETE MESSAGE
// ======================================================

// app/api/messages/[conversationId]/delete/route.ts

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      conversationId,
      messageId,
      deleteForEveryone,
    } = body;

    if (!conversationId || !messageId) {
      return NextResponse.json(
        {
          success: false,
          message: "conversationId and messageId are required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(messageId) ||
      !mongoose.Types.ObjectId.isValid(conversationId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid IDs",
        },
        {
          status: 400,
        }
      );
    }

    // Conversation check
    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversation not found",
        },
        {
          status: 404,
        }
      );
    }

    const message =
      await Message.findOne({
        _id: messageId,
        conversationId,
      });

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Message not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // DELETE FOR EVERYONE
    // =====================================================

    if (deleteForEveryone) {
      if (
        String(message.sender) !==
        String(userId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only sender can delete for everyone",
          },
          {
            status: 403,
          }
        );
      }

      message.deletedForEveryone = true;
      message.deletedAt = new Date();

      await message.save();

      return NextResponse.json({
        success: true,
        deleteType: "everyone",
        messageId,
      });
    }

    // =====================================================
    // DELETE FOR ME
    // =====================================================

    await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: {
          deletedFor: userId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      deleteType: "me",
      messageId,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
