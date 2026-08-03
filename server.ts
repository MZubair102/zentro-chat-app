
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Message from "@/models/Message";

const dev = process.env.NODE_ENV !== "production";

const hostname = "localhost";

const port = Number(process.env.PORT) || 3000;

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  // =====================================================
  // HTTP SERVER
  // =====================================================

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // =====================================================
  // SOCKET.IO
  // =====================================================

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },

    transports: ["websocket"],

    pingInterval: 5000,

    pingTimeout: 10000,
  });

  // =====================================================
  // ONLINE USERS
  // userId -> multiple socket IDs
  // =====================================================

  const onlineUsers = new Map<string, Set<string>>();

  // =====================================================
  // SOCKET CONNECTION
  // =====================================================

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    // ===================================================
    // USER CONNECT / ONLINE
    // ===================================================

    socket.on("join-user", async (userId: string) => {
      try {
        if (!userId) {
          return;
        }

        await connectDB();

        const normalizedUserId = String(userId);

        // Save user ID inside socket
        socket.data.userId = normalizedUserId;

        // Join personal room
        socket.join(`user:${normalizedUserId}`);

        // Create socket set if not exists
        if (!onlineUsers.has(normalizedUserId)) {
          onlineUsers.set(normalizedUserId, new Set());
        }

        const userSockets = onlineUsers.get(normalizedUserId)!;

        const wasOffline = userSockets.size === 0;

        // Add current socket
        userSockets.add(socket.id);

        // Update database
        await User.findByIdAndUpdate(normalizedUserId, {
          status: "online",
          lastSeen: null,
        });

        // =================================================
        // ONLY BROADCAST ONLINE WHEN USER WAS ACTUALLY
        // OFFLINE BEFORE THIS SOCKET CONNECTED
        // =================================================

        if (wasOffline) {
          io.emit("user-online", {
            userId: normalizedUserId,
          });
        }

        console.log("ONLINE:", normalizedUserId);
      } catch (error) {
        console.error("join-user error:", error);
      }
    });

    // ===================================================
    // JOIN CONVERSATION
    // ===================================================

    socket.on(
      "join-conversation",
      (conversationId: string) => {
        if (!conversationId) {
          return;
        }

        socket.join(`conversation:${conversationId}`);

        console.log(
          `Socket ${socket.id} joined conversation ${conversationId}`,
        );
      },
    );

    // ===================================================
    // LEAVE CONVERSATION
    // ===================================================

    socket.on(
      "leave-conversation",
      (conversationId: string) => {
        if (!conversationId) {
          return;
        }

        socket.leave(`conversation:${conversationId}`);

        console.log(
          `Socket ${socket.id} left conversation ${conversationId}`,
        );
      },
    );

    // ===================================================
    // TYPING
    // ===================================================

    socket.on(
      "typing",
      ({
        conversationId,
        userId,
      }: {
        conversationId: string;
        userId: string;
      }) => {
        if (!conversationId || !userId) {
          return;
        }

        socket
          .to(`conversation:${conversationId}`)
          .emit("user-typing", {
            conversationId,
            userId,
          });
      },
    );

    // ===================================================
    // STOP TYPING
    // ===================================================

    socket.on(
      "stop-typing",
      ({
        conversationId,
        userId,
      }: {
        conversationId: string;
        userId: string;
      }) => {
        if (!conversationId || !userId) {
          return;
        }

        socket
          .to(`conversation:${conversationId}`)
          .emit("user-stop-typing", {
            conversationId,
            userId,
          });
      },
    );

    // ===================================================
    // SEND MESSAGE
    // ===================================================

    socket.on(
      "send-message",
      ({
        conversationId,
        message,
      }: {
        conversationId: string;
        message: any;
      }) => {
        if (!conversationId || !message) {
          return;
        }

        // Send message to everyone inside conversation
        io.to(`conversation:${conversationId}`).emit(
          "receive-message",
          message,
        );
      },
    );

    // ===================================================
    // MESSAGE DELIVERED
    // ===================================================

    socket.on(
      "message-delivered",
      async ({
        conversationId,
        messageId,
        userId,
      }: {
        conversationId: string;
        messageId: string;
        userId: string;
      }) => {
        try {
          if (!conversationId || !messageId || !userId) {
            return;
          }

          await connectDB();

          // Notify sender / conversation
          io.to(`conversation:${conversationId}`).emit(
            "message-delivered",
            {
              messageId,
              userId,
            },
          );
        } catch (error) {
          console.error(
            "message-delivered error:",
            error,
          );
        }
      },
    );

    // ===================================================
    // MESSAGE SEEN / READ
    // ===================================================

    socket.on(
      "message-seen",
      async ({
        conversationId,
        messageId,
        userId,
      }: {
        conversationId: string;
        messageId: string;
        userId: string;
      }) => {
        try {
          if (!conversationId || !messageId || !userId) {
            return;
          }

          await connectDB();

          // Add user to seenBy
          await Message.findByIdAndUpdate(
            messageId,
            {
              $addToSet: {
                seenBy: userId,
              },
            },
            {
              new: true,
            },
          );

          // Tell all clients in conversation
          io.to(`conversation:${conversationId}`).emit(
            "message-seen",
            {
              messageId,
              userId,
            },
          );

          console.log(
            "MESSAGE SEEN:",
            messageId,
            "by",
            userId,
          );
        } catch (error) {
          console.error(
            "message-seen error:",
            error,
          );
        }
      },
    );

    // ===================================================
    // DISCONNECT
    // ===================================================

    socket.on("disconnect", async () => {
      try {
        const userId = socket.data.userId;

        if (!userId) {
          console.log(
            "Socket Disconnected:",
            socket.id,
          );

          return;
        }

        await connectDB();

        const normalizedUserId = String(userId);

        const userSockets =
          onlineUsers.get(normalizedUserId);

        if (userSockets) {
          // Remove this socket
          userSockets.delete(socket.id);

          // =================================================
          // USER IS STILL ONLINE IN ANOTHER TAB / DEVICE
          // =================================================

          if (userSockets.size > 0) {
            console.log(
              "Socket disconnected but user still online:",
              normalizedUserId,
            );

            return;
          }

          // =================================================
          // USER COMPLETELY OFFLINE
          // =================================================

          onlineUsers.delete(normalizedUserId);

          const lastSeen = new Date();

          await User.findByIdAndUpdate(
            normalizedUserId,
            {
              status: "offline",
              lastSeen,
            },
          );

          // Broadcast offline + lastSeen
          io.emit("user-offline", {
            userId: normalizedUserId,
            lastSeen: lastSeen.toISOString(),
          });

          console.log(
            "OFFLINE:",
            normalizedUserId,
            lastSeen.toISOString(),
          );
        }
      } catch (error) {
        console.error(
          "disconnect error:",
          error,
        );
      }

      console.log(
        "Socket Disconnected:",
        socket.id,
      );
    });
  });

  // =====================================================
  // START SERVER
  // =====================================================

  httpServer.listen(port, () => {
    console.log(
      `> Ready on http://${hostname}:${port}`,
    );
  });
});

