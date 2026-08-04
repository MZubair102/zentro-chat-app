
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

    socket.on(
      "join-user",
      async (userId: string) => {
        try {
          await connectDB();

          socket.data.userId = userId;

          // User room
          socket.join(`user:${userId}`);

          // Store socket
          if (!onlineUsers.has(userId)) {
            onlineUsers.set(
              userId,
              new Set(),
            );
          }

          onlineUsers
            .get(userId)!
            .add(socket.id);

          // Update DB
          await User.findByIdAndUpdate(
            userId,
            {
              status: "online",
              lastSeen: null,
            },
          );

          // Tell everyone
          io.emit("user-online", {
            userId,
          });

          console.log(
            "ONLINE:",
            userId,
          );
        } catch (error) {
          console.error(
            "Join user error:",
            error,
          );
        }
      },
    );

    // ===================================================
    // JOIN CONVERSATION
    // ===================================================

    socket.on(
      "join-conversation",
      (conversationId: string) => {
        socket.join(
          `conversation:${conversationId}`,
        );
      },
    );

    // ===================================================
    // LEAVE CONVERSATION
    // ===================================================

    socket.on(
      "leave-conversation",
      (conversationId: string) => {
        socket.leave(
          `conversation:${conversationId}`,
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
      }) => {
        socket
          .to(
            `conversation:${conversationId}`,
          )
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
      }) => {
        socket
          .to(
            `conversation:${conversationId}`,
          )
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
      }) => {
        try {
          await connectDB();

          // ---------------------------------------------
          // SEND TO OPEN CHAT WINDOWS
          // ---------------------------------------------

          io.to(
            `conversation:${conversationId}`,
          ).emit(
            "receive-message",
            message,
          );

          // ---------------------------------------------
          // GET PARTICIPANTS
          // ---------------------------------------------

          const conversation =
            await Conversation.findById(
              conversationId,
            )
              .select("participants")
              .lean();

          if (!conversation) {
            return;
          }

          // ---------------------------------------------
          // UPDATE SIDEBAR LIVE
          // ---------------------------------------------

          for (const participantId of
            conversation.participants) {
            io.to(
              `user:${participantId.toString()}`,
            ).emit(
              "conversation-message",
              {
                conversationId:
                  conversationId.toString(),

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

   
// ============================================
// MESSAGE DELIVERED
// ============================================

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

      const message = await Message.findById(messageId);

      if (!message) {
        return;
      }

      // Sender ko delivered count nahi karna
      const senderId = String(message.sender);

      if (senderId === String(userId)) {
        return;
      }

      // DB mein deliveredBy add
      await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            deliveredBy: userId,
          },
        },
        {
          new: true,
        },
      );

      // Chat window ke andar live update
      io.to(`conversation:${conversationId}`).emit(
        "message-delivered",
        {
          conversationId,
          messageId,
          userId,
        },
      );

      console.log(
        `MESSAGE DELIVERED: ${messageId} -> ${userId}`,
      );
    } catch (error) {
      console.error(
        "Message delivered error:",
        error,
      );
    }
  },
);

// ============================================
// MESSAGE SEEN
// ============================================

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

      const message = await Message.findById(messageId);

      if (!message) {
        return;
      }

      // Sender apna message seen nahi karega
      const senderId = String(message.sender);

      if (senderId === String(userId)) {
        return;
      }

      // Seen hone ka matlab delivered bhi hai
      await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            deliveredBy: userId,
            seenBy: userId,
          },
        },
        {
          new: true,
        },
      );

      // Chat window mein instantly Seen update
      io.to(`conversation:${conversationId}`).emit(
        "message-seen",
        {
          conversationId,
          messageId,
          userId,
        },
      );

      // Delivered bhi emit kar do
      io.to(`conversation:${conversationId}`).emit(
        "message-delivered",
        {
          conversationId,
          messageId,
          userId,
        },
      );

      console.log(
        `MESSAGE SEEN: ${messageId} -> ${userId}`,
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

    socket.on(
      "disconnect",
      async () => {
        try {
          const userId =
            socket.data.userId;

          if (!userId) {
            console.log(
              "Socket Disconnected:",
              socket.id,
            );

            return;
          }

          await connectDB();

          const sockets =
            onlineUsers.get(
              userId,
            );

          if (sockets) {
            sockets.delete(
              socket.id,
            );

            // -------------------------------------------
            // USER COMPLETELY OFFLINE
            // -------------------------------------------

            if (sockets.size === 0) {
              onlineUsers.delete(
                userId,
              );

              const lastSeen =
                new Date();

              await User.findByIdAndUpdate(
                userId,
                {
                  status: "offline",
                  lastSeen,
                },
              );

              io.emit(
                "user-offline",
                {
                  userId,
                  lastSeen,
                },
              );

              console.log(
                "OFFLINE:",
                userId,
              );
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
      },
    );
  });

  // =====================================================
  // START SERVER
  // =====================================================

  httpServer.listen(
    port,
    () => {
      console.log(
        `> Ready on http://${hostname}:${port}`,
      );
    },
  );
});

