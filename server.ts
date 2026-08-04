import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

import Conversation from "@/models/Conversation";
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
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },

    transports: ["websocket"],

    pingInterval: 5000,

    pingTimeout: 10000,
  });

  // userId -> socketIds
  const onlineUsers = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);
    // console.log("Saved User:", socket.data.userId);

    // ============================================
    // USER CONNECT
    // ============================================

    socket.on("join-user", async (userId: string) => {
      try {
        await connectDB();

        socket.data.userId = userId;

        socket.join(`user:${userId}`);

        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }

        onlineUsers.get(userId)!.add(socket.id);

        await User.findByIdAndUpdate(userId, {
          status: "online",
          lastSeen: null,
        });

        io.emit("user-online", {
          userId,
        });

        console.log("ONLINE:", userId);
      } catch (error) {
        console.error(error);
      }
    });

    // ============================================
    // JOIN CONVERSATION
    // ============================================

    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ============================================
    // TYPING
    // ============================================

    socket.on("typing", ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        conversationId,
        userId,
      });
    });

    socket.on("stop-typing", ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit("user-stop-typing", {
        conversationId,
        userId,
      });
    });

    // ============================================
    // SEND MESSAGE
    // ============================================

    // ============================================
    // SEND MESSAGE
    // ============================================

    socket.on("send-message", async ({ conversationId, message }) => {
      try {
        await connectDB();

        // ------------------------------------------
        // SEND TO OPEN CHAT WINDOW
        // ------------------------------------------

        io.to(`conversation:${conversationId}`).emit(
          "receive-message",
          message,
        );

        // ------------------------------------------
        // FIND CONVERSATION PARTICIPANTS
        // ------------------------------------------

        const conversation = await Conversation.findById(conversationId)
          .select("participants")
          .lean();

        if (!conversation) {
          return;
        }

        // ------------------------------------------
        // UPDATE SIDEBAR FOR ALL PARTICIPANTS
        // ------------------------------------------

        for (const participantId of conversation.participants) {
          io.to(`user:${participantId.toString()}`).emit(
            "conversation-message",
            {
              conversationId: conversationId.toString(),
              message,
            },
          );
        }
      } catch (error) {
        console.error("Send message socket error:", error);
      }
    });

    // ============================================
    // MESSAGE SEEN
    // ============================================

    socket.on("message-seen", ({ conversationId, messageId, userId }) => {
      io.to(`conversation:${conversationId}`).emit("message-seen", {
        messageId,
        userId,
      });
    });

    socket.on(
      "message-delivered",
      async ({ conversationId, messageId, userId }) => {
        try {
          await connectDB();

          const message = await Message.findById(messageId);

          if (!message) return;

          const alreadyDelivered = message.deliveredBy.some(
            (id: any) => String(id) === String(userId),
          );

          if (!alreadyDelivered) {
            message.deliveredBy.push(userId);

            await message.save();
          }

          io.to(`conversation:${conversationId}`).emit("message-delivered", {
            messageId,
            userId,
          });
        } catch (error) {
          console.error("Message delivered error:", error);
        }
      },
    );

    // ============================================
    // DISCONNECT
    // ============================================

    socket.on("disconnect", async () => {
      try {
        const userId = socket.data.userId;

        if (!userId) {
          return;
        }

        await connectDB();

        const sockets = onlineUsers.get(userId);

        if (sockets) {
          sockets.delete(socket.id);

          if (sockets.size === 0) {
            onlineUsers.delete(userId);

            await User.findByIdAndUpdate(userId, {
              status: "offline",
              lastSeen: new Date(),
            });

            io.emit("user-offline", {
              userId,
              lastSeen: new Date(),
            });
            console.log("OFFLINE:", userId);
          }
        }
      } catch (error) {
        console.error(error);
      }

      console.log("Socket Disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
