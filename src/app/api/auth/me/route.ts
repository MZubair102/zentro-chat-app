import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

import {connectDB} from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
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

    const user = await User.findById(userId).select(
      "_id name email avatar status lastSeen"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("ME API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to get user",
      },
      { status: 500 }
    );
  }
}