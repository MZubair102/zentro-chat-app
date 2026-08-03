
import { NextResponse } from "next/server";

import {connectDB} from "@/lib/mongodb";
import User from "@/models/User";

import { getCurrentUserId } from "@/lib/auth";

export async function POST() {
  try {
    await connectDB();

    const userId =
      await getCurrentUserId();

    if (userId) {
      await User.findByIdAndUpdate(
        userId,
        {
          status: "offline",
          lastSeen: new Date(),
        }
      );
    }

    const response =
      NextResponse.json({
        success: true,
        message:
          "Logged out successfully.",
      });

    response.cookies.set({
      name: "token",
      value: "",
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error(
      "LOGOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Logout failed.",
      },
      { status: 500 }
    );
  }
}
