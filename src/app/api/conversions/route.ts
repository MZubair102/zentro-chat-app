
import { NextRequest, NextResponse } from "next/server";

import {connectDB} from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/auth";

import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";

// ======================================================
// GET CONVERSATIONS
// ======================================================



// IMPORTANT:
// This import registers the Message model
// before populate("lastMessage") runs.
import "@/models/Message";

import "@/models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Important:
    // Register models before populate()
    void Message;
    void User;

    const currentuser = getCurrentUserId(request);

    if (!currentuser) {
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
const conversations = await Conversation.find({
  participants: currentuser.userId,
})
  .populate(
    "participants",
    "name email avatar status lastSeen"
  )
  .populate({
    path: "lastMessage",
    select:
      "sender text messageType attachments seenBy createdAt",
    populate: {
      path: "sender",
      select: "name email avatar",
    },
  })
  .sort({
    updatedAt: -1,
  })
  .lean();

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error("GET CONVERSATIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to load conversations.",
      },
      {
        status: 500,
      }
    );
  }
}



// ======================================================
// POST /api/conversations
// Create private conversation using user's EMAIL
// ======================================================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // --------------------------------------------
    // Get logged-in user from JWT cookie
    // --------------------------------------------

    const currentUserId = getCurrentUserId(request);

    if (!currentUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------
    // Read request body
    // --------------------------------------------

    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "User email is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------
    // Find user by email
    // --------------------------------------------

    const otherUser = await User.findOne({
      email,
    }).select(
      "_id name email avatar status lastSeen"
    );

    if (!otherUser) {
      return NextResponse.json(
        {
          success: false,
          message: "No user with this email address is registered on Chat.",
        },
        { status: 404 }
      );
    }

    const otherUserId = otherUser._id.toString();

    // --------------------------------------------
    // Prevent creating conversation with yourself
    // --------------------------------------------

    if (currentUserId === otherUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot create a conversation with yourself.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------
    // Check if private conversation already exists
    // --------------------------------------------

    let conversation = await Conversation.findOne({
      type: "private",

      participants: {
        $all: [currentUserId, otherUserId],
      },

      // Make sure it is exactly a 2-person conversation
      $expr: {
        $eq: [
          {
            $size: "$participants",
          },
          2,
        ],
      },
    })
      .populate(
        "participants",
        "name email avatar status lastSeen"
      )
      .populate(
        "lastMessage",
        "sender text messageType attachments seenBy createdAt"
      );

    // --------------------------------------------
    // Return existing conversation
    // --------------------------------------------

    if (conversation) {
      return NextResponse.json({
        success: true,
        message: "Conversation already exists.",
        existing: true,
        data: conversation,
      });
    }

    // --------------------------------------------
    // Create new conversation
    // --------------------------------------------

    conversation = await Conversation.create({
      type: "private",

      participants: [
        currentUserId,
        otherUserId,
      ],

      name: "",
      image: "",
      lastMessage: null,
    });

    // --------------------------------------------
    // Populate participants
    // --------------------------------------------

    await conversation.populate(
      "participants",
      "name email avatar status lastSeen"
    );

    // --------------------------------------------
    // Response
    // --------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Conversation created successfully.",
        existing: false,
        data: conversation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "CREATE CONVERSATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create conversation.",
      },
      { status: 500 }
    );
  }
}



