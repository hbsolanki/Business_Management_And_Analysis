import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  FaCropAlt,
  FaEdit,
  FaFile,
  FaImage,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaSpinner,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import ImageCropModal from "./ImageCropModal";

const MAX_CHAT_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / 1024 ** idx;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${sizes[idx]}`;
};

const getAttachmentKind = (file) => {
  if (!file) return "file";
  if (file.type?.startsWith("image/")) return "image";
  if (file.type?.startsWith("video/")) return "video";
  return "file";
};

const ChatInput = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendTyping,
  uploading,
  uploadProgress,
  editingMessage,
  setEditingMessage,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSourceFile, setCropSourceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attachError, setAttachError] = useState("");

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const emojiContainerRef = useRef(null);
  const attachMenuRef = useRef(null);
  const emojiToggleRef = useRef(null);
  const attachToggleRef = useRef(null);

  const isSending = submitting || uploading;
  const hasText = Boolean(newMessage.trim());
  const canSend = editingMessage
    ? hasText && !isSending
    : (hasText || Boolean(pendingAttachment)) && !isSending;

  const setAttachment = (file, { openCrop = false } = {}) => {
    if (!file) return;

    if (file.size > MAX_CHAT_UPLOAD_SIZE_BYTES) {
      setAttachError(`File is too large (${formatBytes(file.size)}). Maximum allowed size is 20 MB.`);
      return;
    }

    setAttachError("");
    const kind = getAttachmentKind(file);
    const previewUrl = kind === "image" || kind === "video" ? URL.createObjectURL(file) : null;

    setPendingAttachment((prev) => {
      if (prev?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return { file, kind, previewUrl };
    });

    if (openCrop && kind === "image") {
      setCropSourceFile(file);
      setShowCropModal(true);
    }
  };

  const clearAttachment = () => {
    setAttachError("");
    setPendingAttachment((prev) => {
      if (prev?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  useEffect(
    () => () => {
      if (pendingAttachment?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    },
    [pendingAttachment?.previewUrl],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(event.target) &&
        !emojiToggleRef.current?.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target) &&
        !attachToggleRef.current?.contains(event.target)
      ) {
        setShowAttachMenu(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, showAttachMenu]);

  const onFilePicked = (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setShowAttachMenu(false);
    setAttachment(file, { openCrop: type === "image" });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    const container = e.currentTarget;
    const nextTarget = e.relatedTarget;
    if (!nextTarget || !container.contains(nextTarget)) {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    setAttachment(droppedFile, { openCrop: droppedFile.type?.startsWith("image/") });
  };

  const submitComposer = async () => {
    if (!canSend) return;

    try {
      setSubmitting(true);
      const result = await handleSendMessage({
        text: newMessage,
        attachment: pendingAttachment
          ? {
            file: pendingAttachment.file,
            previewUrl: pendingAttachment.previewUrl,
          }
          : null,
      });

      if (result?.textSent) {
        setNewMessage("");
      }
      if (pendingAttachment && result?.attachmentSent) {
        clearAttachment();
      }
      if (editingMessage && result?.textSent) {
        setEditingMessage(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await submitComposer();
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  return (
    <div
      className="p-4 sm:p-6 bg-white/50 backdrop-blur-sm border-t border-slate-100 shrink-0 z-20 relative shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.03)]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto space-y-3">
        {dragActive && (
          <div className="rounded-xl border-2 border-dashed border-slate-400 bg-slate-100/70 px-4 py-3 text-center text-sm font-semibold text-slate-700">
            Drop file here to attach
          </div>
        )}
        {pendingAttachment && (
          <div className="relative rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0 flex items-center justify-center shadow-inner">
                {pendingAttachment.kind === "image" && pendingAttachment.previewUrl && (
                  <img
                    src={pendingAttachment.previewUrl}
                    alt="Selected attachment"
                    className="w-full h-full object-cover"
                  />
                )}
                {pendingAttachment.kind === "video" && pendingAttachment.previewUrl && (
                  <video src={pendingAttachment.previewUrl} className="w-full h-full object-cover" />
                )}
                {pendingAttachment.kind === "file" && <FaFile className="text-slate-400 text-2xl" />}
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[15px] font-bold text-slate-900 truncate">
                  {pendingAttachment.file.name}
                </p>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  {pendingAttachment.kind} • {formatBytes(pendingAttachment.file.size)}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  {pendingAttachment.kind === "image" && (
                    <button
                      type="button"
                      onClick={() => {
                        setCropSourceFile(pendingAttachment.file);
                        setShowCropModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                    >
                      <FaCropAlt size={12} />
                      Crop
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-100 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 hover:text-red-700 transition-all active:scale-95 shadow-sm"
                  >
                    <FaTimes size={12} />
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {isSending && (
              <div className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center gap-3 text-white text-sm font-bold px-6 backdrop-blur-[2px]">
                <div className="inline-flex items-center gap-3">
                  <FaSpinner className="animate-spin" />
                  Sending {pendingAttachment.kind}{uploadProgress > 0 ? ` ${uploadProgress}%` : "..."}
                </div>
                <div className="w-full max-w-xs h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, uploadProgress || 0))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex items-end gap-3.5 relative">
          <div className="flex-1 bg-slate-100/50 border border-slate-200/60 focus-within:bg-white focus-within:border-brand-200 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 ease-out rounded-[24px] flex items-end p-1.5">
            <button
              ref={emojiToggleRef}
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2.5 rounded-full transition-all active:scale-90 shrink-0 ${showEmojiPicker ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
            >
              <FaSmile size={20} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-20 left-0 z-50 animate-fade-in-up" ref={emojiContainerRef}>
                <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
                  <EmojiPicker onEmojiClick={handleEmojiClick} width={320} height={400} />
                </div>
              </div>
            )}

            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitComposer();
                } else {
                  sendTyping();
                }
              }}
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-slate-800 text-[15px] py-3 px-2 min-h-[44px] max-h-32 resize-none leading-relaxed placeholder-slate-400 font-medium"
              rows={1}
              style={{ height: "auto" }}
            />

            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*"
              onChange={(event) => onFilePicked(event, "image")}
            />
            <input
              type="file"
              ref={videoInputRef}
              className="hidden"
              accept="video/*"
              onChange={(event) => onFilePicked(event, "video")}
            />
            <input
              type="file"
              ref={docInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
              onChange={(event) => onFilePicked(event, "file")}
            />

            {showAttachMenu && (
              <div className="absolute bottom-16 right-0 z-50 animate-fade-in-up" ref={attachMenuRef}>
                <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[150px]">
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                      <FaFile size={14} />
                    </div>
                    Document
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                      <FaImage size={14} />
                    </div>
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                      <FaVideo size={14} />
                    </div>
                    Video
                  </button>
                </div>
              </div>
            )}

            <button
              ref={attachToggleRef}
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              disabled={isSending || Boolean(editingMessage)}
              className={`p-2.5 rounded-full transition-all active:scale-90 shrink-0 ${showAttachMenu
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                } ${editingMessage ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperclip size={18} />}
            </button>
          </div>

          {editingMessage && (
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setNewMessage("");
              }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-full shadow-lg hover:bg-slate-900 transition-all active:scale-95 z-50"
            >
              Cancel Editing
            </button>
          )}

          <button
            type="submit"
            disabled={!canSend}
            className={`p-4 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-90 flex items-center justify-center shrink-0
                ${editingMessage ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-900 shadow-slate-900/20"}
                disabled:opacity-40 disabled:shadow-none disabled:scale-100 disabled:bg-slate-300`}
          >
            {isSending ? (
              <FaSpinner size={18} className="animate-spin" />
            ) : editingMessage ? (
              <FaEdit size={18} />
            ) : (
              <FaPaperPlane size={18} className={`${canSend ? "translate-x-0.5 -translate-y-0.5" : ""} transition-transform`} />
            )}
          </button>
        </form>

        {!editingMessage && attachError && (
          <p className="text-[11px] text-rose-600 px-1 font-medium">{attachError}</p>
        )}
      </div>

      <ImageCropModal
        isOpen={showCropModal}
        file={cropSourceFile}
        onClose={() => {
          setShowCropModal(false);
          setCropSourceFile(null);
        }}
        onApply={(croppedFile) => {
          setShowCropModal(false);
          setCropSourceFile(null);
          setAttachment(croppedFile);
        }}
      />
    </div>
  );
};

export default ChatInput;
