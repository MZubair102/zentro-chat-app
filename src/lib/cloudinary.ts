
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// =====================================================
// CLOUDINARY CONFIG
// =====================================================

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,
});

// =====================================================
// TYPES
// =====================================================

export type CloudinaryResourceType =
  | "image"
  | "video"
  | "raw";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: CloudinaryResourceType;

  originalFilename?: string;
  format?: string;

  // Original size in bytes
  bytes?: number;

  // Formatted size
  size?: string;

  // MIME type
  type?: string;
}

// =====================================================
// FORMAT FILE SIZE
// =====================================================

export function formatFileSize(
  bytes: number
): string {
  if (!bytes || bytes <= 0) {
    return "0 KB";
  }

  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(2)} GB`;
  }

  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(2)} MB`;
  }

  return `${(bytes / KB).toFixed(2)} KB`;
}

// =====================================================
// GET RESOURCE TYPE
// =====================================================

export function getResourceType(
  mimeType: string
): CloudinaryResourceType {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "raw";
}

// =====================================================
// UPLOAD FILE TO CLOUDINARY
// =====================================================

export async function uploadToCloudinary(
  file: File,
  folder = "chat-app/messages"
): Promise<CloudinaryUploadResult> {
  // ---------------------------------------------------
  // Validate file
  // ---------------------------------------------------

  if (!file) {
    throw new Error(
      "File is required."
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "Selected file is empty."
    );
  }

  // ---------------------------------------------------
  // Maximum 50 MB
  // ---------------------------------------------------

  const MAX_FILE_SIZE =
    50 * 1024 * 1024;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "File size cannot exceed 50 MB."
    );
  }

  // ---------------------------------------------------
  // Determine resource type
  // ---------------------------------------------------

  const resourceType =
    getResourceType(file.type);

  // ---------------------------------------------------
  // File -> Buffer
  // ---------------------------------------------------

  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(bytes);

  // ---------------------------------------------------
  // Upload to Cloudinary
  // ---------------------------------------------------

  const result =
    await new Promise<any>(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder,

              resource_type:
                resourceType,

              use_filename: false,

              unique_filename: true,
            },

            (
              error,
              uploadResult
            ) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(
                uploadResult
              );
            }
          );

        Readable.from(buffer).pipe(
          uploadStream
        );
      }
    );

  // ---------------------------------------------------
  // Validate Cloudinary response
  // ---------------------------------------------------

  if (!result?.secure_url) {
    throw new Error(
      "Cloudinary upload failed."
    );
  }

  // ---------------------------------------------------
  // Formatted file size
  // ---------------------------------------------------

  const formattedSize =
    formatFileSize(file.size);

  // ---------------------------------------------------
  // Return clean result
  // ---------------------------------------------------

  return {
    url: result.secure_url,

    publicId:
      result.public_id,

    resourceType,

    originalFilename:
      file.name,

    format:
      result.format,

    bytes:
      file.size,

    size:
      formattedSize,

    type:
      file.type,
  };
}

// =====================================================
// DELETE FILE FROM CLOUDINARY
// =====================================================

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryResourceType = "image"
): Promise<any> {
  if (!publicId) {
    throw new Error(
      "Cloudinary public ID is required."
    );
  }

  return new Promise(
    (resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        {
          resource_type:
            resourceType,
        },
        (
          error,
          result
        ) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );
    }
  );
}

// =====================================================
// EXPORT CLOUDINARY INSTANCE
// =====================================================

export default cloudinary;

