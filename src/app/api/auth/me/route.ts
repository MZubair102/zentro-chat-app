import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export interface DecodedToken {
  UserId: string;
  email: string;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get decoded token from middleware
    const currentuser = getCurrentUserId(request);

    if (!currentuser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // console.log("Decoded Token:", decoded);

    // Find logged-in user
    const user = await User.findById(currentuser.userId)
      .select("_id name email avatar status lastSeen")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // console.error("ME API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to get user",
      },
      { status: 500 }
    );
  }
}