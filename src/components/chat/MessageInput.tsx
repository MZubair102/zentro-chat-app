"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Send,
  Smile,
  Video,
  X,
} from "lucide-react";
import EmojiPicker, {
  EmojiClickData,
} from "emoji-picker-react";

import { socket } from "@/lib/socket";

interface Props {
  conversationId: string;
  currentUserId: string;
  onSend: (text: string) => void;
  onFileSelect?: (file: File) => void;
}

type CameraMode = "photo" | "video";

export default function MessageInput({
  conversationId,
  currentUserId,
  onSend,
  onFileSelect,
}: Props) {
  const [text, setText] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [showAttachmentMenu, setShowAttachmentMenu] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [videoPreview, setVideoPreview] =
    useState<string | null>(null);

  // Camera
  const [showCamera, setShowCamera] =
    useState(false);

  const [cameraStream, setCameraStream] =
    useState<MediaStream | null>(null);

  const [cameraMode, setCameraMode] =
    useState<CameraMode>("photo");

  const [facingMode, setFacingMode] =
    useState<"user" | "environment">(
      "environment"
    );

  const [capturedImage, setCapturedImage] =
    useState<string | null>(null);

  const [recordedVideo, setRecordedVideo] =
    useState<string | null>(null);

  const [cameraError, setCameraError] =
    useState<string | null>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  // Refs
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const recordedChunksRef =
    useRef<Blob[]>([]);

  const recordingTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const documentInputRef =
    useRef<HTMLInputElement>(null);

  const mediaInputRef =
    useRef<HTMLInputElement>(null);

  // ==========================================
  // TYPING
  // ==========================================

  const stopTyping = () => {
    socket.emit("stop-typing", {
      conversationId,
      userId: currentUserId,
    });
  };

  // ==========================================
  // OPEN CAMERA
  // ==========================================

  const openCamera = async () => {
    setShowAttachmentMenu(false);
    setShowEmojiPicker(false);

    setCameraError(null);
    setCapturedImage(null);
    setRecordedVideo(null);
    setCameraMode("photo");

    setShowCamera(true);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: facingMode,
            },
          },
          audio: true,
        });

      setCameraStream(stream);
    } catch (error) {
      console.error("Camera error:", error);

      setCameraError(
        "Unable to access camera and microphone. Please allow permission."
      );
    }
  };

  // ==========================================
  // CONNECT STREAM TO VIDEO
  // ==========================================

  useEffect(() => {
    if (
      videoRef.current &&
      cameraStream
    ) {
      videoRef.current.srcObject =
        cameraStream;

      videoRef.current
        .play()
        .catch(() => {});
    }
  }, [cameraStream]);

  // ==========================================
  // CLEAN CAMERA
  // ==========================================

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => {
        track.stop();
      });

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [cameraStream]);

  // ==========================================
  // CLOSE CAMERA
  // ==========================================

  const closeCamera = () => {
    if (isRecording) {
      stopRecording();
    }

    cameraStream?.getTracks().forEach((track) => {
      track.stop();
    });

    setCameraStream(null);
    setCapturedImage(null);
    setRecordedVideo(null);
    setCameraError(null);
    setRecordingTime(0);
    setShowCamera(false);
  };

  // ==========================================
  // SWITCH CAMERA
  // ==========================================

  const switchCamera = async () => {
    const newFacingMode =
      facingMode === "environment"
        ? "user"
        : "environment";

    cameraStream?.getTracks().forEach((track) => {
      track.stop();
    });

    setCameraStream(null);
    setFacingMode(newFacingMode);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: newFacingMode,
            },
          },
          audio: true,
        });

      setCameraStream(stream);
    } catch (error) {
      console.error(
        "Switch camera error:",
        error
      );

      setCameraError(
        "Unable to switch camera."
      );
    }
  };

  // ==========================================
  // PHOTO CAPTURE
  // ==========================================

  const capturePhoto = () => {
    if (
      !videoRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) return;

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData =
      canvas.toDataURL(
        "image/jpeg",
        0.9
      );

    setCapturedImage(imageData);
  };

  // ==========================================
  // VIDEO RECORDING
  // ==========================================

  const startRecording = () => {
    if (!cameraStream) return;

    recordedChunksRef.current = [];

    let mimeType = "";

    if (
      MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9"
      )
    ) {
      mimeType =
        "video/webm;codecs=vp9";
    } else if (
      MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp8"
      )
    ) {
      mimeType =
        "video/webm;codecs=vp8";
    } else {
      mimeType = "video/webm";
    }

    try {
      const recorder =
        new MediaRecorder(
          cameraStream,
          {
            mimeType,
          }
        );

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(
          recordedChunksRef.current,
          {
            type:
              recorder.mimeType ||
              "video/webm",
          }
        );

        const videoUrl =
          URL.createObjectURL(blob);

        setRecordedVideo(videoUrl);

        recordedChunksRef.current = [];
      };

      recorder.start();

      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current =
        setInterval(() => {
          setRecordingTime(
            (prev) => prev + 1
          );
        }, 1000);
    } catch (error) {
      console.error(
        "Recording error:",
        error
      );

      setCameraError(
        "Unable to start video recording."
      );
    }
  };

  // ==========================================
  // STOP RECORDING
  // ==========================================

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current = null;
    }
  };

  // ==========================================
  // FORMAT RECORDING TIME
  // ==========================================

  const formatTime = (
    seconds: number
  ) => {
    const minutes = Math.floor(
      seconds / 60
    );

    const remainingSeconds =
      seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ==========================================
  // RETAKE PHOTO
  // ==========================================

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // ==========================================
  // RETAKE VIDEO
  // ==========================================

  const retakeVideo = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }

    setRecordedVideo(null);
  };

  // ==========================================
  // USE CAPTURED PHOTO
  // ==========================================

  const useCapturedPhoto = () => {
    if (!capturedImage) return;

    const byteString = atob(
      capturedImage.split(",")[1]
    );

    const mimeString =
      capturedImage
        .split(",")[0]
        .split(":")[1]
        .split(";")[0];

    const arrayBuffer =
      new ArrayBuffer(
        byteString.length
      );

    const uint8Array =
      new Uint8Array(arrayBuffer);

    for (
      let i = 0;
      i < byteString.length;
      i++
    ) {
      uint8Array[i] =
        byteString.charCodeAt(i);
    }

    const file = new File(
      [arrayBuffer],
      `camera-${Date.now()}.jpg`,
      {
        type: mimeString,
      }
    );

    setSelectedFile(file);
    setImagePreview(capturedImage);
    setVideoPreview(null);

    closeCamera();
  };

  // ==========================================
  // USE RECORDED VIDEO
  // ==========================================

  const useRecordedVideo = async () => {
    if (!recordedVideo) return;

    try {
      const response =
        await fetch(recordedVideo);

      const blob =
        await response.blob();

      const file = new File(
        [blob],
        `video-${Date.now()}.webm`,
        {
          type:
            blob.type ||
            "video/webm",
        }
      );

      setSelectedFile(file);
      setVideoPreview(recordedVideo);
      setImagePreview(null);

      closeCamera();
    } catch (error) {
      console.error(
        "Video conversion error:",
        error
      );
    }
  };

  // ==========================================
  // FILE SELECT
  // ==========================================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);

    setShowAttachmentMenu(false);

    if (
      file.type.startsWith(
        "image/"
      )
    ) {
      const previewUrl =
        URL.createObjectURL(file);

      setImagePreview(previewUrl);
      setVideoPreview(null);
    } else if (
      file.type.startsWith(
        "video/"
      )
    ) {
      const previewUrl =
        URL.createObjectURL(file);

      setVideoPreview(previewUrl);
      setImagePreview(null);
    } else {
      setImagePreview(null);
      setVideoPreview(null);
    }

    e.target.value = "";
  };

  // ==========================================
  // REMOVE FILE
  // ==========================================

  const removeFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setVideoPreview(null);
  };

  // ==========================================
  // TEXT CHANGE
  // ==========================================

  const handleChange = (
    value: string
  ) => {
    setText(value);

    if (value.trim()) {
      socket.emit("typing", {
        conversationId,
        userId: currentUserId,
      });
    } else {
      stopTyping();
    }
  };

  // ==========================================
  // EMOJI
  // ==========================================

  const handleEmojiClick = (
    emojiData: EmojiClickData
  ) => {
    const emoji =
      emojiData.emoji;

    setText(
      (prev) => prev + emoji
    );

    socket.emit("typing", {
      conversationId,
      userId: currentUserId,
    });
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const submit = () => {
    const value =
      text.trim();

    if (
      !value &&
      !selectedFile
    ) {
      return;
    }

    if (value) {
      onSend(value);
    }

    if (selectedFile) {
      onFileSelect?.(
        selectedFile
      );
    }

    setText("");
    setSelectedFile(null);
    setImagePreview(null);
    setVideoPreview(null);

    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);

    stopTyping();
  };

  return (
    <div className="relative">

      {/* =====================================
          CAMERA MODAL
      ===================================== */}

      {showCamera && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-black shadow-2xl">

            {/* Header */}
            <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">

              <div className="flex items-center gap-2 text-white">
                {cameraMode ===
                "photo" ? (
                  <Camera
                    size={18}
                  />
                ) : (
                  <Video
                    size={18}
                  />
                )}

                <span className="text-sm font-medium">
                  {cameraMode ===
                  "photo"
                    ? "Camera"
                    : "Video"}
                </span>
              </div>

              <button
                type="button"
                onClick={
                  closeCamera
                }
                className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switch */}
            {!capturedImage &&
              !recordedVideo &&
              !isRecording && (
                <div className="absolute left-1/2 top-16 z-20 flex -translate-x-1/2 rounded-full bg-black/50 p-1 backdrop-blur">

                  <button
                    type="button"
                    onClick={() =>
                      setCameraMode(
                        "photo"
                      )
                    }
                    className={`rounded-full px-4 py-2 text-xs font-medium ${
                      cameraMode ===
                      "photo"
                        ? "bg-white text-black"
                        : "text-white"
                    }`}
                  >
                    Photo
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCameraMode(
                        "video"
                      )
                    }
                    className={`rounded-full px-4 py-2 text-xs font-medium ${
                      cameraMode ===
                      "video"
                        ? "bg-white text-black"
                        : "text-white"
                    }`}
                  >
                    Video
                  </button>
                </div>
              )}

            {/* Live Camera */}
            {!capturedImage &&
              !recordedVideo && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-[3/4] w-full object-cover sm:aspect-video"
                  />

                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />

                      REC{" "}
                      {formatTime(
                        recordingTime
                      )}
                    </div>
                  )}

                  {/* Controls */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 bg-gradient-to-t from-black/90 to-transparent p-6">

                    {/* Switch */}
                    {!isRecording && (
                      <button
                        type="button"
                        onClick={
                          switchCamera
                        }
                        className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                      >
                        <RotateCcw
                          size={22}
                        />
                      </button>
                    )}

                    {/* Photo Button */}
                    {cameraMode ===
                      "photo" &&
                      !isRecording && (
                        <button
                          type="button"
                          onClick={
                            capturePhoto
                          }
                          className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/20"
                        >
                          <span className="h-14 w-14 rounded-full bg-white" />
                        </button>
                      )}

                    {/* Video Button */}
                    {cameraMode ===
                      "video" && (
                        <button
                          type="button"
                          onClick={
                            isRecording
                              ? stopRecording
                              : startRecording
                          }
                          className={`grid h-20 w-20 place-items-center rounded-full border-4 border-white ${
                            isRecording
                              ? "bg-red-600"
                              : "bg-red-500"
                          }`}
                        >
                          {isRecording ? (
                            <span className="h-7 w-7 rounded-md bg-white" />
                          ) : (
                            <span className="h-14 w-14 rounded-full bg-white" />
                          )}
                        </button>
                      )}

                    {/* Close */}
                    {!isRecording && (
                      <button
                        type="button"
                        onClick={
                          closeCamera
                        }
                        className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                      >
                        <X size={22} />
                      </button>
                    )}
                  </div>
                </>
              )}

            {/* =================================
                PHOTO PREVIEW
            ================================= */}

            {capturedImage && (
              <>
                <img
                  src={
                    capturedImage
                  }
                  alt="Captured"
                  className="aspect-[3/4] w-full object-cover sm:aspect-video"
                />

                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/90 to-transparent p-6">

                  <button
                    type="button"
                    onClick={
                      retakePhoto
                    }
                    className="rounded-xl bg-white/20 px-5 py-3 text-sm font-medium text-white backdrop-blur hover:bg-white/30"
                  >
                    Retake
                  </button>

                  <button
                    type="button"
                    onClick={
                      useCapturedPhoto
                    }
                    className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-gray-100"
                  >
                    Use Photo
                  </button>
                </div>
              </>
            )}

            {/* =================================
                VIDEO PREVIEW
            ================================= */}

            {recordedVideo && (
              <>
                <video
                  src={
                    recordedVideo
                  }
                  controls
                  autoPlay
                  className="aspect-[3/4] w-full object-contain bg-black sm:aspect-video"
                />

                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/90 to-transparent p-6">

                  <button
                    type="button"
                    onClick={
                      retakeVideo
                    }
                    className="rounded-xl bg-white/20 px-5 py-3 text-sm font-medium text-white backdrop-blur hover:bg-white/30"
                  >
                    Retake
                  </button>

                  <button
                    type="button"
                    onClick={
                      useRecordedVideo
                    }
                    className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-gray-100"
                  >
                    Use Video
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 text-center">

                <div>
                  <Camera
                    size={40}
                    className="mx-auto mb-4 text-gray-400"
                  />

                  <p className="text-sm text-white">
                    {cameraError}
                  </p>

                  <button
                    type="button"
                    onClick={
                      closeCamera
                    }
                    className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-gray-900"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>
      )}

      {/* =====================================
          EMOJI PICKER
      ===================================== */}

      {showEmojiPicker && (
        <div className="absolute bottom-16 left-0 z-30">

          <button
            type="button"
            onClick={() =>
              setShowEmojiPicker(
                false
              )
            }
            className="absolute -right-2 -top-2 z-40 grid h-7 w-7 place-items-center rounded-full bg-white text-gray-500 shadow-md hover:bg-gray-100"
          >
            <X size={16} />
          </button>

          <EmojiPicker
            onEmojiClick={
              handleEmojiClick
            }
            width={320}
            height={400}
            searchDisabled={false}
            previewConfig={{
              showPreview: false,
            }}
          />
        </div>
      )}

      {/* =====================================
          ATTACHMENT MENU
      ===================================== */}

      {showAttachmentMenu && (
        <div className="absolute bottom-16 left-0 z-30 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">

          {/* Documents */}
          <button
            type="button"
            onClick={() =>
              documentInputRef.current?.click()
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-100"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-600">
              <FileText size={20} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800">
                Documents
              </p>

              <p className="text-xs text-gray-500">
                PDF, Word, Excel, ZIP
              </p>
            </div>
          </button>

          {/* Photos / Videos */}
          <button
            type="button"
            onClick={() =>
              mediaInputRef.current?.click()
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-100"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-600">
              <ImageIcon size={20} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800">
                Photos & Videos
              </p>

              <p className="text-xs text-gray-500">
                Select from device
              </p>
            </div>
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={
              openCamera
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-100"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-purple-100 text-purple-600">
              <Camera size={20} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800">
                Camera
              </p>

              <p className="text-xs text-gray-500">
                Photo or video
              </p>
            </div>
          </button>
        </div>
      )}

      {/* =====================================
          SELECTED FILE PREVIEW
      ===================================== */}

      {selectedFile && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2">

          {/* Image */}
          {imagePreview && (
            <img
              src={
                imagePreview
              }
              alt="Selected"
              className="h-16 w-16 rounded-lg object-cover"
            />
          )}

          {/* Video */}
          {videoPreview && (
            <video
              src={
                videoPreview
              }
              controls
              className="h-16 w-16 rounded-lg object-cover"
            />
          )}

          {/* Other File */}
          {!imagePreview &&
            !videoPreview && (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-600">
                FILE
              </div>
            )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {
                selectedFile.name
              }
            </p>

            <p className="text-xs text-gray-500">
              {(
                selectedFile.size /
                1024 /
                1024
              ).toFixed(2)}{" "}
              MB
            </p>
          </div>

          <button
            type="button"
            onClick={
              removeFile
            }
            className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =====================================
          HIDDEN INPUTS
      ===================================== */}

      <input
        ref={
          documentInputRef
        }
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
        onChange={
          handleFileChange
        }
      />

      <input
  ref={mediaInputRef}
  type="file"
  hidden
  accept="image/*,video/*"
  capture="environment"
  onChange={handleFileChange}
/>

      {/* =====================================
          MESSAGE INPUT
      ===================================== */}

      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">

        {/* Plus */}
        <button
          type="button"
          onClick={() => {
            setShowAttachmentMenu(
              (prev) => !prev
            );

            setShowEmojiPicker(
              false
            );
          }}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
            showAttachmentMenu
              ? "bg-gray-200 text-gray-900"
              : "text-gray-500 hover:bg-gray-200"
          }`}
          title="Attach"
        >
          <Plus
            size={21}
            className={`transition-transform ${
              showAttachmentMenu
                ? "rotate-45"
                : ""
            }`}
          />
        </button>

        {/* Emoji */}
        <button
          type="button"
          onClick={() => {
            setShowEmojiPicker(
              (prev) => !prev
            );

            setShowAttachmentMenu(
              false
            );
          }}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
            showEmojiPicker
              ? "bg-gray-200 text-gray-900"
              : "text-gray-500 hover:bg-gray-200"
          }`}
          title="Emoji"
        >
          <Smile size={19} />
        </button>

        {/* Text */}
        <textarea
          value={text}
          onChange={(e) =>
            handleChange(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key ===
                "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Write a message..."
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none"
        />

        {/* Send */}
        <button
          type="button"
          onClick={
            submit
          }
          disabled={
            !text.trim() &&
            !selectedFile
          }
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E1320] text-white transition hover:bg-[#1b2435] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}