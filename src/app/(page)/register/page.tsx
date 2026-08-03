
"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageCircle,
  User,
} from "lucide-react";

export default function RegisterPage() {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const res =
        await fetch(
          "/api/auth/register",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name,
              email,
              password,
            }),
          }
        );

      const data =
        await res.json();

      if (!data.success) {
        setError(
          data.message ||
            "Registration failed."
        );
        return;
      }

      window.location.href =
        "/login";
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#0E1320] text-white">
            <MessageCircle
              size={26}
            />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[#0E1320]">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create your account to start chatting.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Name
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-[#0E1320]">
              <User
                size={18}
                className="text-gray-400"
              />

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                placeholder="John Doe"
                required
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-[#0E1320]">
              <Mail
                size={18}
                className="text-gray-400"
              />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="you@example.com"
                required
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-[#0E1320]">
              <Lock
                size={18}
                className="text-gray-400"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                className="text-gray-400 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm Password
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-[#0E1320]">
              <Lock
                size={18}
                className="text-gray-400"
              />

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) =>
                      !value
                  )
                }
                className="text-gray-400 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0E1320] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1B2435] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-[#0E1320] hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
