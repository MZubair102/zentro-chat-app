
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// ==========================================
// AUTH PAYLOAD
// ==========================================

export interface AuthPayload {
  userId: string;
  email?: string;
  name?: string;
}

// ==========================================
// JWT SECRET
// ==========================================

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables."
    );
  }

  return secret;
}

// ==========================================
// CREATE JWT TOKEN
// ==========================================

export function createToken(
  payload: AuthPayload
): string {
  const secret = getJwtSecret();

  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
}

// ==========================================
// VERIFY JWT TOKEN
// ==========================================

export function verifyToken(
  token: string
): AuthPayload | null {
  try {
    const secret = getJwtSecret();

    const decoded = jwt.verify(
      token,
      secret
    );

    // jwt.verify() can return a string
    // or JwtPayload, so check it first.

    if (
      typeof decoded !== "object" ||
      decoded === null
    ) {
      return null;
    }

    // Check userId before returning
    if (
      typeof decoded.userId !== "string"
    ) {
      return null;
    }

    // email is optional
    if (
      decoded.email !== undefined &&
      typeof decoded.email !== "string"
    ) {
      return null;
    }

    // name is optional
    if (
      decoded.name !== undefined &&
      typeof decoded.name !== "string"
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      email:
        typeof decoded.email === "string"
          ? decoded.email
          : undefined,
      name:
        typeof decoded.name === "string"
          ? decoded.name
          : undefined,
    };
  } catch (error) {
    console.error(
      "JWT verification failed:",
      error
    );

    return null;
  }
}

// ==========================================
// GET CURRENT USER
// ==========================================

export async function getCurrentUser(): Promise<
  AuthPayload | null
> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "token"
      )?.value;

    if (!token) {
      return null;
    }

    return verifyToken(token);
  } catch (error) {
    console.error(
      "getCurrentUser error:",
      error
    );

    return null;
  }
}

// ==========================================
// GET CURRENT USER ID
// ==========================================

export async function getCurrentUserId(): Promise<
  string | null
> {
  const user =
    await getCurrentUser();

  if (!user) {
    return null;
  }

  return user.userId;
}

// ==========================================
// REQUIRE AUTHENTICATION
// ==========================================

export async function requireAuth(): Promise<AuthPayload> {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  return user;
}

