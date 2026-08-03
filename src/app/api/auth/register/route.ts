
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import {connectDB} from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(
  req: NextRequest
) {
  try {
    await connectDB();

    const body = await req.json();

    const name =
      String(body.name || "").trim();

    const email =
      String(body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(body.password || "");

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is required.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    const existingUser =
      await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    const user =
      await User.create({
        name,
        email,
        password: hashedPassword,
        avatar: "",
        status: "offline",
        lastSeen: new Date(),
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully.",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          status: user.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Registration failed.",
      },
      { status: 500 }
    );
  }
}
