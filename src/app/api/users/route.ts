
import { NextRequest, NextResponse } from "next/server";

import {connectDB} from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/auth";

import User from "@/models/User";

// ======================================================
// GET USERS
// ======================================================

export async function GET(
  req: NextRequest
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

    const { searchParams } =
      new URL(req.url);

    const search =
      searchParams.get("search")?.trim() ||
      "";

    const query: any = {
      _id: {
        $ne: userId,
      },
    };

    // Search by name or email
    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const users =
      await User.find(query)
        .select(
          "name email avatar status lastSeen"
        )
        .sort({
          status: 1,
          name: 1,
        })
        .limit(50)
        .lean();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error: any) {
    console.error(
      "GET USERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to load users.",
      },
      {
        status: 500,
      }
    );
  }
}

