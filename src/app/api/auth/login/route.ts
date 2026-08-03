
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import {connectDB} from "@/lib/mongodb";
import User from "@/models/User";
import { createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // ==========================
    // Validation
    // ==========================

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================
    // Find User
    // ==========================

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // ==========================
    // Check Password
    // ==========================

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // ==========================
    // Update Online Status
    // ==========================

    user.status = "online";
    user.lastSeen = null;

    await user.save();

    // ==========================
    // Create JWT
    // ==========================

    const token = createToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // ==========================
    // Response
    // ==========================

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
    });

    // ==========================
    // HTTP Only Cookie
    // ==========================

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}

