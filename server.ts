
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
  // DELIVER PENDING MESSAGES
  // =====================================================
  //
  // Jab receiver offline tha aur baad mein login karta hai,
  // us waqt uske pending messages ko delivered karna hai.
  //
  // Iske liye conversation open hona zaroori nahi.
  //
  // =====================================================

  const deliverPendingMessages = async (
    receiverId: string,
  ) => {
    try {
      await connectDB();

      const normalizedReceiverId =
        String(receiverId);

      // -----------------------------------------------
      // Receiver ki conversations
      // -----------------------------------------------

      const conversations =
        await Conversation.find({
          participants: normalizedReceiverId,
        })
          .select("_id")
          .lean();

      if (!conversations.length) {
        return;
      }

      const conversationIds =
        conversations.map((conversation) =>
          conversation._id,
        );

      // -----------------------------------------------
      // Pending messages
      //
      // Receiver sender nahi hona chahiye
      // deliveredBy mein receiver nahi hona chahiye
      // -----------------------------------------------

      const pendingMessages =
        await Message.find({
          conversationId: {
            $in: conversationIds,
          },

          sender: {
            $ne: normalizedReceiverId,
          },

          deliveredBy: {
            $ne: normalizedReceiverId,
          },
        })
          .select(
            "_id conversationId sender",
          )
          .lean();

      if (!pendingMessages.length) {
        console.log(
          `NO PENDING MESSAGES FOR: ${normalizedReceiverId}`,
        );

        return;
      }

      // -----------------------------------------------
      // Har pending message ko delivered karo
      // -----------------------------------------------

      for (const message of pendingMessages) {
        const messageId =
          String(message._id);

        const conversationId =
          String(message.conversationId);

        const senderId =
          String(message.sender);

        // ---------------------------------------------
        // DB: deliveredBy add
        // ---------------------------------------------

        await Message.findByIdAndUpdate(
          message._id,
          {
            $addToSet: {
              deliveredBy:
                normalizedReceiverId,
            },
          },
        );

        // ---------------------------------------------
        // Sender ko live event
        // ---------------------------------------------

        io.to(`user:${senderId}`).emit(
          "message-delivered",
          {
            conversationId,
            messageId,
            userId:
              normalizedReceiverId,
          },
        );

        console.log(
          `PENDING MESSAGE DELIVERED: ${messageId} -> ${normalizedReceiverId}`,
        );
      }
    } catch (error) {
      console.error(
        "Deliver pending messages error:",
        error,
      );
    }
  };

  // =====================================================
  // CONNECTION
  // =====================================================

  io.on("connection", (socket) => {
    console.log(
      "Socket Connected:",
      socket.id,
    );

    // ===================================================
    // USER CONNECT
    // ===================================================

    socket.on(
      "join-user",
      async (userId: string) => {
        try {
          await connectDB();

          const normalizedUserId =
            String(userId);

          socket.data.userId =
            normalizedUserId;

          // ---------------------------------------------
          // USER ROOM
          // ---------------------------------------------

          socket.join(
            `user:${normalizedUserId}`,
          );

          // ---------------------------------------------
          // STORE SOCKET
          // ---------------------------------------------

          if (
            !onlineUsers.has(
              normalizedUserId,
            )
          ) {
            onlineUsers.set(
              normalizedUserId,
              new Set(),
            );
          }

          onlineUsers
            .get(normalizedUserId)!
            .add(socket.id);

          // ---------------------------------------------
          // UPDATE USER STATUS
          // ---------------------------------------------

          await User.findByIdAndUpdate(
            normalizedUserId,
            {
              status: "online",
              lastSeen: null,
            },
          );

          // ---------------------------------------------
          // TELL EVERYONE USER IS ONLINE
          // ---------------------------------------------

          io.emit("user-online", {
            userId:
              normalizedUserId,
          });

          console.log(
            "ONLINE:",
            normalizedUserId,
          );

          // ---------------------------------------------
          // IMPORTANT:
          //
          // Receiver offline tha to ab pending messages
          // ko DELIVERED mark karo.
          //
          // Conversation open karne ki zaroorat nahi.
          // ---------------------------------------------

          await deliverPendingMessages(
            normalizedUserId,
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
      async (conversationId: string) => {
        try {
          const normalizedConversationId =
            String(conversationId);

          socket.join(
            `conversation:${normalizedConversationId}`,
          );

          console.log(
            `JOIN CONVERSATION: ${socket.data.userId} -> ${normalizedConversationId}`,
          );
        } catch (error) {
          console.error(
            "Join conversation error:",
            error,
          );
        }
      },
    );

    // ===================================================
    // LEAVE CONVERSATION
    // ===================================================

    socket.on(
      "leave-conversation",
      (conversationId: string) => {
        const normalizedConversationId =
          String(conversationId);

        socket.leave(
          `conversation:${normalizedConversationId}`,
        );

        console.log(
          `LEAVE CONVERSATION: ${socket.data.userId} -> ${normalizedConversationId}`,
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
          .emit(
            "user-stop-typing",
            {
              conversationId,
              userId,
            },
          );
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

          const normalizedConversationId =
            String(conversationId);

          const conversation =
            await Conversation.findById(
              normalizedConversationId,
            )
              .select("participants")
              .lean();

          if (!conversation) {
            return;
          }

          const senderId = String(
            message.sender?._id ||
              message.sender,
          );

          const messageId =
            String(message._id);

          // ---------------------------------------------
          // SEND TO OPEN CONVERSATION
          // ---------------------------------------------

          io.to(
            `conversation:${normalizedConversationId}`,
          ).emit(
            "receive-message",
            message,
          );

          // ---------------------------------------------
          // PROCESS PARTICIPANTS
          // ---------------------------------------------

          for (const participantId of
            conversation.participants) {
            const participantUserId =
              String(participantId);

            // Sender ko delivered nahi karna
            if (
              participantUserId ===
              senderId
            ) {
              continue;
            }

            // -------------------------------------------
            // SIDEBAR LIVE UPDATE
            // -------------------------------------------

            io.to(
              `user:${participantUserId}`,
            ).emit(
              "conversation-message",
              {
                conversationId:
                  normalizedConversationId,

                message,
              },
            );

            // -------------------------------------------
            // CHECK ONLINE
            // -------------------------------------------

            const userSockets =
              onlineUsers.get(
                participantUserId,
              );

            const isOnline =
              !!userSockets &&
              userSockets.size > 0;

            // -------------------------------------------
            // ONLINE = DELIVERED
            // -------------------------------------------

            if (isOnline) {
              await Message.findByIdAndUpdate(
                messageId,
                {
                  $addToSet: {
                    deliveredBy:
                      participantUserId,
                  },
                },
              );

              // -----------------------------------------
              // SENDER KO DELIVERED EVENT
              // -----------------------------------------

              io.to(
                `user:${senderId}`,
              ).emit(
                "message-delivered",
                {
                  conversationId:
                    normalizedConversationId,

                  messageId,

                  userId:
                    participantUserId,
                },
              );

              console.log(
                `DELIVERED: ${messageId} -> ${participantUserId}`,
              );
            }
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
    // Optional fallback:
    // Agar client manually delivered emit kare,
    // server DB + sender UI update karega.
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
            await Message.findById(
              messageId,
            );

          if (!message) {
            return;
          }

          const senderId =
            String(message.sender);

          // Sender apna message delivered
          // nahi karega
          if (
            senderId ===
            String(userId)
          ) {
            return;
          }

          await Message.findByIdAndUpdate(
            messageId,
            {
              $addToSet: {
                deliveredBy:
                  String(userId),
              },
            },
          );

          // Sender ko update
          io.to(
            `user:${senderId}`,
          ).emit(
            "message-delivered",
            {
              conversationId:
                String(conversationId),

              messageId:
                String(messageId),

              userId:
                String(userId),
            },
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
    // Receiver conversation open karta hai
    // aur messages dekhta hai.
    //
    // Result:
    // deliveredBy = receiver
    // seenBy      = receiver
    //
    // Sender:
    // ✓✓ blue
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
            await Message.findById(
              messageId,
            );

          if (!message) {
            return;
          }

          const senderId =
            String(message.sender);

          // Sender apna message seen
          // nahi karega
          if (
            senderId ===
            String(userId)
          ) {
            return;
          }

          // ---------------------------------------------
          // SEEN = DELIVERED + SEEN
          // ---------------------------------------------

          await Message.findByIdAndUpdate(
            messageId,
            {
              $addToSet: {
                deliveredBy:
                  String(userId),

                seenBy:
                  String(userId),
              },
            },
          );

          // ---------------------------------------------
          // SENDER KO SEEN EVENT
          // ---------------------------------------------

          io.to(
            `user:${senderId}`,
          ).emit(
            "message-seen",
            {
              conversationId:
                String(conversationId),

              messageId:
                String(messageId),

              userId:
                String(userId),
            },
          );

          console.log(
            `SEEN: ${messageId} -> ${userId}`,
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
// MESSAGE DELETED
// ===================================================
//
// Delete for everyone ke baad sender client ye event
// emit karega.
//
// Server sirf conversation ke doosre users ko event
// forward karega.
//
// Database deletion API already kar chuki hoti hai.
// ===================================================

socket.on(
  "message-deleted",
  ({
    conversationId,
    messageId,
    deleteType,
  }: {
    conversationId: string;
    messageId: string;
    deleteType: "me" | "everyone";
  }) => {
    try {
      const normalizedConversationId =
        String(conversationId);

      const normalizedMessageId =
        String(messageId);

      // ================================================
      // DELETE FOR EVERYONE
      // ================================================

      if (deleteType === "everyone") {
        socket
          .to(
            `conversation:${normalizedConversationId}`,
          )
          .emit(
            "message-deleted",
            {
              conversationId:
                normalizedConversationId,

              messageId:
                normalizedMessageId,

              deleteType: "everyone",
            },
          );

        console.log(
          `MESSAGE DELETED FOR EVERYONE: ${normalizedMessageId}`,
        );

        return;
      }

      // ================================================
      // DELETE FOR ME
      // ================================================
      //
      // Isko broadcast nahi karna.
      // Sirf jis user ne delete kiya uski screen se
      // message remove hoga.
      // ================================================

      console.log(
        `MESSAGE DELETED FOR ME: ${normalizedMessageId}`,
      );
    } catch (error) {
      console.error(
        "Message deleted socket error:",
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
            onlineUsers.get(userId);

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

