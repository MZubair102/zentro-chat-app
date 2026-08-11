
import { NextRequest, NextResponse } from "next/server";

import {connectDB} from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/auth";

import Conversation from "@/models/Conversation";
import Message from "@/models/Message";




import {
  uploadToCloudinary, deleteFromCloudinary,
} from "@/lib/cloudinary";



import { Readable } from "stream";

;
import cloudinary from "@/lib/cloudinary";
export interface DecodedToken {
  userId: string;
  email: string;
  name: string;
}

// ======================================================
// GET MESSAGES
// ======================================================

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      conversationId: string;
    }>;
  }
) {
  try {
    await connectDB();

    const currentuser =
       getCurrentUserId(request);

    if (!currentuser) {
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

    const { conversationId } =
      await params;

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // CHECK CONVERSATION
    // =====================================

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        participants: currentuser.userId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================
    // GET MESSAGES
    // =====================================

    const messages =
      await Message.find({
        conversationId,

        // Hide messages deleted only for me
        deletedFor: {
          $ne: currentuser.userId,
        },
      })
        .populate(
          "sender",
          "name email avatar status lastSeen"
        )
        .sort({
          createdAt: 1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error(
      "GET MESSAGES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to load messages.",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// SEND MESSAGE
// ======================================================


import mongoose from "mongoose";
import { request } from "http";



interface RouteContext {
  params: Promise<{
    conversationId: string;
  }>;
}

// export async function POST(
//   request: NextRequest,
//   { params }: RouteContext
// ) {
//   try {
//     // ==================================================
//     // CONNECT DATABASE
//     // ==================================================

//     await connectDB();

//     // ==================================================
//     // GET LOGGED-IN USER
//     // ==================================================

//     const currentuser =  getCurrentUserId(request);

//     if (!currentuser) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Unauthorized. Please login first.",
//         },
//         {
//           status: 401,
//         }
//       );
//     }

//     // ==================================================
//     // GET CONVERSATION ID FROM URL
//     // ==================================================

//     const { conversationId } = await params;


  

//     if (!conversationId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Conversation ID is required.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     // ==================================================
//     // VALIDATE MONGODB OBJECT ID
//     // ==================================================

//     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid conversation ID.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     if (!mongoose.Types.ObjectId.isValid(currentuser.userId)) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid user ID.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     // ==================================================
//     // READ REQUEST BODY
//     // ==================================================

//     let body: any;

//     try {
//       body = await request.json();
//     } catch {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid JSON body.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     const {
//       text = "",
//       messageType = "text",
//       attachments = [],
//     } = body;

//     // ==================================================
//     // VALIDATE MESSAGE TYPE
//     // ==================================================

//     const allowedTypes = [
//       "text",
//       "image",
//       "file",
//     ];

//     if (!allowedTypes.includes(messageType)) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid message type.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     // ==================================================
//     // CLEAN TEXT
//     // ==================================================

//     const cleanText =
//       typeof text === "string"
//         ? text.trim()
//         : "";

//     // ==================================================
//     // VALIDATE ATTACHMENTS
//     // ==================================================

//     const cleanAttachments = Array.isArray(attachments)
//       ? attachments
//       : [];

//     // ==================================================
//     // VALIDATE MESSAGE CONTENT
//     // ==================================================

//     if (
//       messageType === "text" &&
//       !cleanText
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Message cannot be empty.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     if (
//       messageType !== "text" &&
//       !cleanText &&
//       cleanAttachments.length === 0
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Message content is required.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     // ==================================================
//     // FIND CONVERSATION
//     // ==================================================

//     const conversation =
//       await Conversation.findOne({
//         _id: conversationId,
//         participants: currentuser.userId,
//       });

//     if (!conversation) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Conversation not found or you are not a participant.",
//         },
//         {
//           status: 404,
//         }
//       );
//     }

//     // ==================================================
//     // CREATE MESSAGE
//     // ==================================================

//     const message = await Message.create({
//       conversationId: conversation._id,

//       sender: currentuser.userId,

//       text: cleanText,

//       messageType,

//       attachments: cleanAttachments,

//       seenBy: [currentuser.userId],

//       deleted: false,
//     });

//     // ==================================================
//     // UPDATE CONVERSATION
//     // ==================================================

//     conversation.lastMessage = message._id;
//     conversation.lastMessageAt = new Date();

//     await conversation.save();

//     // ==================================================
//     // POPULATE SENDER
//     // ==================================================

//     await message.populate(
//       "sender",
//       "name email avatar status lastSeen"
//     );

//     // ==================================================
//     // RESPONSE
//     // ==================================================

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Message sent successfully.",
//         data: message,
//       },
//       {
//         status: 201,
//       }
//     );
//   } catch (error: any) {
//     console.error(
//       "SEND MESSAGE ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           error?.message ||
//           "Failed to send message.",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }


// ======================================================
// DELETE MESSAGE
// ======================================================

// app/api/messages/[conversationId]/delete/route.ts



// =====================================================
// DELETE MESSAGE
// =====================================================




// =====================================================
// DELETE MESSAGE
// =====================================================

export async function DELETE(
  request: NextRequest
) {
  try {
    // ==================================================
    // CONNECT DATABASE
    // ==================================================

    await connectDB();

    // ==================================================
    // GET CURRENT USER
    // ==================================================

    const currentUser =
      getCurrentUserId(request);

    if (!currentUser?.userId) {
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

    // ==================================================
    // READ BODY
    // ==================================================

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON body",
        },
        {
          status: 400,
        }
      );
    }

    const {
      conversationId,
      messageId,
      deleteForEveryone = false,
    } = body;

    // ==================================================
    // VALIDATE REQUIRED FIELDS
    // ==================================================

    if (
      !conversationId ||
      !messageId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "conversationId and messageId are required",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // VALIDATE IDS
    // ==================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        conversationId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        messageId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid IDs",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // VALIDATE USER ID
    // ==================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        currentUser.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // FIND CONVERSATION
    // ==================================================

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        participants:
          currentUser.userId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation not found",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // FIND MESSAGE
    // ==================================================

    const message =
      await Message.findOne({
        _id: messageId,
        conversationId,
      });

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Message not found",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // DELETE FOR EVERYONE
    // ==================================================

    if (
      deleteForEveryone === true
    ) {
      // -----------------------------------------------
      // ONLY SENDER CAN DELETE FOR EVERYONE
      // -----------------------------------------------

      if (
        String(message.sender) !==
        String(currentUser.userId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only sender can delete for everyone",
          },
          {
            status: 403,
          }
        );
      }

      // -----------------------------------------------
      // ALREADY DELETED
      // -----------------------------------------------

      if (
        message.deletedForEveryone
      ) {
        return NextResponse.json(
          {
            success: true,
            deleteType:
              "everyone",
            messageId,
            message:
              "Message already deleted",
          },
          {
            status: 200,
          }
        );
      }

      // ===============================================
      // DELETE FILES FROM CLOUDINARY
      // ===============================================

      if (
        Array.isArray(
          message.attachments
        ) &&
        message.attachments.length > 0
      ) {
        for (
          const attachment of
            message.attachments
        ) {
          try {
            // -----------------------------------------
            // NO PUBLIC ID
            // -----------------------------------------

            if (
              !attachment.publicId
            ) {
              console.warn(
                "Cloudinary publicId missing:",
                attachment.url
              );

              continue;
            }

            // -----------------------------------------
            // RESOURCE TYPE
            // -----------------------------------------

            let resourceType:
              | "image"
              | "video"
              | "raw" = "raw";

            if (
              attachment.resourceType ===
              "image"
            ) {
              resourceType =
                "image";
            } else if (
              attachment.resourceType ===
              "video"
            ) {
              resourceType =
                "video";
            } else {
              resourceType =
                "raw";
            }

            // -----------------------------------------
            // DELETE CLOUDINARY FILE
            // -----------------------------------------

            const result =
              await deleteFromCloudinary(
                attachment.publicId,
                resourceType
              );

            console.log(
              "Cloudinary file deleted:",
              {
                publicId:
                  attachment.publicId,

                resourceType,

                result,
              }
            );
          } catch (
            cloudinaryError
          ) {
            // -----------------------------------------
            // DON'T STOP MESSAGE DELETION
            // -----------------------------------------

            console.error(
              "Cloudinary delete error:",
              cloudinaryError
            );
          }
        }
      }

      // ===============================================
      // MARK MESSAGE DELETED
      // ===============================================

      message.deletedForEveryone =
        true;

      message.deletedAt =
        new Date();

      // ===============================================
      // REMOVE ATTACHMENTS
      // ===============================================

      message.attachments = [];

      // ===============================================
      // REMOVE TEXT
      // ===============================================

      message.text = "";

      // ===============================================
      // SAVE MESSAGE
      // ===============================================

      await message.save();

      // ===============================================
      // UPDATE LAST MESSAGE
      // ===============================================

      if (
        String(
          conversation.lastMessage
        ) === String(messageId)
      ) {
        conversation.lastMessage =
          null;

        conversation.lastMessageAt =
          null;

        await conversation.save();
      }

      // ===============================================
      // RESPONSE
      // ===============================================

      return NextResponse.json(
        {
          success: true,

          deleteType:
            "everyone",

          messageId,

          message:
            "Message deleted for everyone successfully.",
        },
        {
          status: 200,
        }
      );
    }

    // ==================================================
    // DELETE FOR ME
    // ==================================================

    await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: {
          deletedFor:
            currentUser.userId,
        },
      },
      {
        new: true,
      }
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        success: true,

        deleteType: "me",

        messageId,

        message:
          "Message deleted for you successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "DELETE MESSAGE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to delete message",
      },
      {
        status: 500,
      }
    );
  }
}




interface RouteContext {
  params: Promise<{
    conversationId: string;
  }>;
}


// ======================================================
// POST - SEND TEXT / IMAGE / VIDEO / FILE
// ======================================================


interface RouteContext {
  params: Promise<{
    conversationId: string;
  }>;
}

// =====================================================
// POST MESSAGE
// =====================================================




// =====================================================
// TYPES
// =====================================================

type MessageType =
  | "text"
  | "image"
  | "video"
  | "file";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: string;
  publicId: string;
  resourceType: string;
}

interface RouteContext {
  params: Promise<{
    conversationId: string;
  }>;
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // =================================================
    // CONNECT DATABASE
    // =================================================

    await connectDB();

    // =================================================
    // CURRENT USER
    // =================================================

    const currentUser =
      getCurrentUserId(request);

    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized. Please login first.",
        },
        {
          status: 401,
        }
      );
    }

    // =================================================
    // CONVERSATION ID
    // =================================================

    const { conversationId } =
      await params;

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VALIDATE CONVERSATION ID
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        conversationId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid conversation ID.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VALIDATE USER ID
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        currentUser.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VARIABLES
    // =================================================

    let text = "";

    let messageType: MessageType =
      "text";

    let attachments: Attachment[] =
      [];

    let uploadedFile: File | null =
      null;

    // =================================================
    // CONTENT TYPE
    // =================================================

    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    // =================================================
    // JSON REQUEST
    // =================================================

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      let body: any;

      try {
        body =
          await request.json();
      } catch {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid JSON body.",
          },
          {
            status: 400,
          }
        );
      }

      // -----------------------------------------------
      // TEXT
      // -----------------------------------------------

      text =
        typeof body.text ===
        "string"
          ? body.text.trim()
          : "";

      // -----------------------------------------------
      // MESSAGE TYPE
      // -----------------------------------------------

      if (
        body.messageType ===
          "text" ||
        body.messageType ===
          "image" ||
        body.messageType ===
          "video" ||
        body.messageType ===
          "file"
      ) {
        messageType =
          body.messageType;
      }

      // -----------------------------------------------
      // ATTACHMENTS
      // -----------------------------------------------

      if (
        Array.isArray(
          body.attachments
        )
      ) {
        attachments =
          body.attachments
            .filter(
              (attachment: any) =>
                attachment &&
                typeof attachment.url ===
                  "string" &&
                attachment.url.trim()
                  !== ""
            )
            .map(
              (
                attachment: any
              ) => ({
                url:
                  attachment.url,

                name:
                  typeof attachment.name ===
                  "string"
                    ? attachment.name
                    : "",

                type:
                  typeof attachment.type ===
                  "string"
                    ? attachment.type
                    : "",

                size:
                  typeof attachment.size ===
                  "string"
                    ? attachment.size
                    : "",

                publicId:
                  typeof attachment.publicId ===
                  "string"
                    ? attachment.publicId
                    : "",

                resourceType:
                  typeof attachment.resourceType ===
                  "string"
                    ? attachment.resourceType
                    : "",
              })
            );
      }
    }

    // =================================================
    // FORM DATA REQUEST
    // =================================================

    else if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      // -----------------------------------------------
      // TEXT
      // -----------------------------------------------

      const formText =
        formData.get("text");

      if (
        typeof formText ===
        "string"
      ) {
        text =
          formText.trim();
      }

      // -----------------------------------------------
      // MESSAGE TYPE
      // -----------------------------------------------

      const formMessageType =
        formData.get(
          "messageType"
        );

      if (
        formMessageType ===
          "text" ||
        formMessageType ===
          "image" ||
        formMessageType ===
          "video" ||
        formMessageType ===
          "file"
      ) {
        messageType =
          formMessageType;
      }

      // -----------------------------------------------
      // FILE
      // -----------------------------------------------

      const formFile =
        formData.get("file");

      if (
        formFile instanceof File
      ) {
        uploadedFile =
          formFile;
      }
    }

    // =================================================
    // FIND CONVERSATION
    // =================================================

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        participants:
          currentUser.userId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Conversation not found or you are not a participant.",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // UPLOAD FILE
    // =================================================

   if (uploadedFile) {
  const uploadResult =
    await uploadToCloudinary(
      uploadedFile,
      "chat-app/messages"
    );

  if (uploadResult.resourceType === "image") {
    messageType = "image";
  } else if (
    uploadResult.resourceType === "video"
  ) {
    messageType = "video";
  } else {
    messageType = "file";
  }

  attachments = [
    {
      url: uploadResult.url,

      name:
        uploadResult.originalFilename ||
        uploadedFile.name,

      type:
        uploadResult.type ||
        uploadedFile.type,

      size:
        uploadResult.size ||
        "",

      publicId:
        uploadResult.publicId,

      resourceType:
        uploadResult.resourceType,
    },
  ];
}

    // =================================================
    // VALIDATE TEXT MESSAGE
    // =================================================

    if (
      messageType === "text" &&
      !text
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Message cannot be empty.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VALIDATE ATTACHMENT MESSAGE
    // =================================================

    if (
      messageType !== "text" &&
      attachments.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Attachment is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // FINAL ATTACHMENT VALIDATION
    // =================================================

    for (
      const attachment of attachments
    ) {
      if (
        !attachment.url ||
        typeof attachment.url !==
          "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Attachment URL is missing.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // =================================================
    // CREATE MESSAGE
    // =================================================

    const message =
      await Message.create({
        conversationId:
          conversation._id,

        sender:
          currentUser.userId,

        text,

        messageType,

        attachments,

        seenBy: [
          currentUser.userId,
        ],

        deliveredBy: [],
      });

    // =================================================
    // UPDATE CONVERSATION
    // =================================================

    conversation.lastMessage =
      message._id;

    conversation.lastMessageAt =
      new Date();

    await conversation.save();

    // =================================================
    // POPULATE SENDER
    // =================================================

    await message.populate(
      "sender",
      "name email avatar status lastSeen"
    );

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Message sent successfully.",

        data: message,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to send message.",
      },
      {
        status: 500,
      }
    );
  }
}

