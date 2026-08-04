
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

  // =====================================================
  // ONLINE USERS
  // userId -> socketIds
  // =====================================================

  const onlineUsers = new Map<string, Set<string>>();

  // =====================================================
  // CONNECTION
  // =====================================================

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    // ===================================================
    // USER CONNECT
    // ===================================================

    socket.on("join-user", async (userId: string) => {
      try {
        await connectDB();

        const normalizedUserId = String(userId);

        socket.data.userId = normalizedUserId;

        // User room
        socket.join(`user:${normalizedUserId}`);

        // Store socket
        if (!onlineUsers.has(normalizedUserId)) {
          onlineUsers.set(normalizedUserId, new Set());
        }

        onlineUsers
          .get(normalizedUserId)!
          .add(socket.id);

        // Update user status
        await User.findByIdAndUpdate(normalizedUserId, {
          status: "online",
          lastSeen: null,
        });

        // Tell everyone user is online
        io.emit("user-online", {
          userId: normalizedUserId,
        });

        console.log("ONLINE:", normalizedUserId);
      } catch (error) {
        console.error("Join user error:", error);
      }
    });

    // ===================================================
    // JOIN CONVERSATION
    // ===================================================

    socket.on(
      "join-conversation",
      (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);

        console.log(
          `JOIN CONVERSATION: ${socket.data.userId} -> ${conversationId}`,
        );
      },
    );

    // ===================================================
    // LEAVE CONVERSATION
    // ===================================================

    socket.on(
      "leave-conversation",
      (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);

        console.log(
          `LEAVE CONVERSATION: ${socket.data.userId} -> ${conversationId}`,
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
      async ({
        conversationId,
        message,
      }: {
        conversationId: string;
        message: any;
      }) => {
        try {
          await connectDB();

          // ------------------------------------------------
          // OPEN CHAT WINDOW
          // ------------------------------------------------

          io.to(`conversation:${conversationId}`).emit(
            "receive-message",
            message,
          );

          // ------------------------------------------------
          // GET CONVERSATION PARTICIPANTS
          // ------------------------------------------------

          const conversation =
            await Conversation.findById(conversationId)
              .select("participants")
              .lean();

          if (!conversation) {
            return;
          }

          // ------------------------------------------------
          // UPDATE SIDEBAR FOR ALL PARTICIPANTS
          // ------------------------------------------------

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
          console.error(
            "Send message socket error:",
            error,
          );
        }
      },
    );

    // ===================================================
    // MESSAGE DELIVERED
    // ===================================================
    //
    // Receiver has received the message through socket,
    // but has NOT necessarily opened the conversation.
    //
    // Result:
    // ✓✓ gray
    //
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
          await connectDB();

          const message =
            await Message.findById(messageId)
              .select("sender deliveredBy")
              .lean();

          if (!message) {
            return;
          }

          const senderId = String(message.sender);
          const receiverId = String(userId);

          // Sender cannot deliver his own message
          if (senderId === receiverId) {
            return;
          }

          // Save delivered user
          await Message.findByIdAndUpdate(
            messageId,
            {
              $addToSet: {
                deliveredBy: receiverId,
              },
            },
            {
              new: true,
            },
          );

          // Send live update to everyone
          io.to(`conversation:${conversationId}`).emit(
            "message-delivered",
            {
              conversationId,
              messageId,
              userId: receiverId,
            },
          );

          // Also update sender directly.
          io.to(`user:${senderId}`).emit(
            "message-delivered",
            {
              conversationId,
              messageId,
              userId: receiverId,
            },
          );

          console.log(
            `MESSAGE DELIVERED: ${messageId} -> ${receiverId}`,
          );
        } catch (error) {
          console.error(
            "Message delivered error:",
            error,
          );
        }
      },
    );

    // ===================================================
    // MESSAGE SEEN
    // ===================================================
    //
    // Receiver has opened the conversation and seen it.
    //
    // Result:
    // ✓✓ blue
    //
    // Seen automatically means delivered as well.
    //
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
          await connectDB();

          const message =
            await Message.findById(messageId)
              .select("sender")
              .lean();

          if (!message) {
            return;
          }

          const senderId = String(message.sender);
          const receiverId = String(userId);

          // Sender cannot see his own message
          if (senderId === receiverId) {
            return;
          }

          // Seen = Delivered + Seen
          await Message.findByIdAndUpdate(
            messageId,
            {
              $addToSet: {
                deliveredBy: receiverId,
                seenBy: receiverId,
              },
            },
            {
              new: true,
            },
          );

          // Live update for open conversation
          io.to(`conversation:${conversationId}`).emit(
            "message-seen",
            {
              conversationId,
              messageId,
              userId: receiverId,
            },
          );

          // IMPORTANT:
          // Sender may not currently be inside the
          // conversation room, so notify sender directly.
          io.to(`user:${senderId}`).emit(
            "message-seen",
            {
              conversationId,
              messageId,
              userId: receiverId,
            },
          );

          console.log(
            `MESSAGE SEEN: ${messageId} -> ${receiverId}`,
          );
        } catch (error) {
          console.error(
            "Message seen error:",
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

        const sockets = onlineUsers.get(userId);

        if (sockets) {
          sockets.delete(socket.id);

          // User is completely offline
          if (sockets.size === 0) {
            onlineUsers.delete(userId);

            const lastSeen = new Date();

            await User.findByIdAndUpdate(userId, {
              status: "offline",
              lastSeen,
            });

            io.emit("user-offline", {
              userId,
              lastSeen,
            });

            console.log("OFFLINE:", userId);
          }
        }
      } catch (error) {
        console.error(
          "Disconnect error:",
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

