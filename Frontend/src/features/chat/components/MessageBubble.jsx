import { memo, useState } from "react";
import { FaBan, FaFilePdf, FaFileAlt, FaEdit, FaTrash, FaSpinner, FaTimes, FaCheck } from "react-icons/fa";
import { formatTime } from "../utils/chatHelpers";

const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  onDoubleClick,
  activeActionMessageId,
  onEdit,
  onDelete,
  messageMenu,
  onCloseMenu,
  isSelectionMode,
  isSelected,
  onToggleSelection
}) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const textValue = typeof msg.text === "string" ? msg.text : "";
  const messageType = String(msg.message_type || (textValue ? "TEXT" : "")).toUpperCase();
  const mediaUrl = msg.media_url || msg.file || null;
  const isPending = Boolean(msg.is_pending);
  const uploadProgress = Number.isFinite(Number(msg.upload_progress))
    ? Math.min(100, Math.max(0, Number(msg.upload_progress)))
    : null;
  const isDeleted = !mediaUrl && !textValue;
  const canDelete = isMe && !isDeleted && !isPending;
  const canEdit = canDelete && messageType === "TEXT";

  const renderContent = () => {
    if (isDeleted) {
      return (
        <div
          className={`flex items-center gap-2 italic text-white/60`}
        >
          <FaBan size={14} />
          <span>This message was deleted</span>
        </div>
      );
    }

    if (messageType === "TEXT" && textValue) {
      return <p className="whitespace-pre-wrap text-white">{textValue}</p>;
    }

    const url = mediaUrl || (textValue.startsWith("http") ? textValue : null);
    if (!url) {
      return <p className="whitespace-pre-wrap text-white">{textValue}</p>;
    }

    const cleanUrl = String(url).split("?")[0].split("#")[0];
    const extension = cleanUrl.includes(".")
      ? cleanUrl.split(".").pop().toLowerCase()
      : "";
    const isImage =
      messageType === "IMAGE" ||
      ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension);
    const isVideo =
      messageType === "VIDEO" ||
      ["mp4", "webm", "ogg", "mov", "mkv"].includes(extension);
    const isPdf = extension === "pdf";

    if (isImage) {
      return (
        <div className="max-w-xs sm:max-w-md rounded-xl overflow-hidden relative">
          <img
            src={url}
            alt="Attachment"
            loading="lazy"
            className={`w-full h-auto object-cover max-h-[360px] ${isPending ? "" : "cursor-pointer"}`}
            onClick={() => {
              if (!isPending) {
                setImagePreviewUrl(url);
              }
            }}
          />
          {isPending && (
            <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 text-xs font-semibold bg-white/95 text-slate-900 px-3 py-1.5 rounded-full">
                <FaSpinner className="animate-spin" />
                Sending image...
              </span>
            </div>
          )}
        </div>
      );
    } else if (isVideo) {
      return (
        <div className="max-w-xs sm:max-w-md rounded-xl overflow-hidden relative">
          <video controls={!isPending} className="w-full max-h-[360px]">
            <source src={url} />
            Your browser does not support the video tag.
          </video>
          {isPending && (
            <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 text-xs font-semibold bg-white/95 text-slate-900 px-3 py-1.5 rounded-full">
                <FaSpinner className="animate-spin" />
                Sending video...
              </span>
            </div>
          )}
        </div>
      );
    } else if (isPdf) {
      if (isPending) {
        return (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/10 text-white">
            <FaFilePdf size={24} className="text-white" />
            <span className="break-all">
              {textValue || "Uploading PDF"}
              {uploadProgress !== null ? ` (${uploadProgress}%)` : ""}
            </span>
            <FaSpinner className="animate-spin ml-1" />
          </div>
        );
      }
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-2 rounded-lg transition-colors bg-white/10 hover:bg-white/20 text-white`}
        >
          <FaFilePdf
            size={24}
            className="text-white"
          />
          <span className="underline break-all">View PDF</span>
        </a>
      );
    } else {
      if (isPending) {
        return (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 text-white">
            <FaFileAlt size={24} className="text-white" />
            <span className="break-all">
              {textValue || "Uploading file"}
              {uploadProgress !== null ? ` (${uploadProgress}%)` : ""}
            </span>
            <FaSpinner className="animate-spin ml-1" />
          </div>
        );
      }
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors bg-white/10 hover:bg-white/20 text-white`}
        >
          <FaFileAlt
            size={24}
            className="text-white"
          />
          <span className="underline break-all">{textValue || "Download File"}</span>
          {isPending && <FaSpinner className="animate-spin ml-1" />}
        </a>
      );
    }
  };

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} group animate-fade-in-up relative ${isSelectionMode ? 'cursor-pointer' : ''}`}
      onClick={() => isSelectionMode && !isDeleted && onToggleSelection()}
    >
      {isSelectionMode && !isDeleted && (
        <div className={`flex items-center ${isMe ? 'order-2 ml-4' : 'order-first mr-4'}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'}`}>
            {isSelected && <FaCheck size={12} />}
          </div>
        </div>
      )}

      <div
        className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%] ${isSelectionMode ? 'pointer-events-none' : ''}`}
        onDoubleClick={(e) => !isDeleted && !isSelectionMode && onDoubleClick(e, msg)}
      >
        <div
          className={` px-5 py-3.5 text-[15px] leading-relaxed relative cursor-pointer select-none group/bubble shadow-sm ${isMe ? "bg-slate-900 text-white rounded-2xl rounded-tr-sm" : "bg-slate-700 text-white rounded-2xl rounded-tl-sm"} `}
        >
          {renderContent()}

          {/* Direct Action Buttons */}
          {(canEdit || canDelete) && activeActionMessageId === msg.id && (
            <div
              className={`
                                absolute -top-4 ${isMe ? "-left-6" : "-right-6"} 
                                flex items-center gap-2
                                z-20 animate-fade-in
                            `}
            >
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(msg);
                  }}
                  className="bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-full p-2 hover:bg-slate-50 transition-all transform hover:scale-110 shadow-md"
                  title="Edit"
                >
                  <FaEdit size={11} />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(msg.id);
                  }}
                  className="bg-white border border-slate-200 text-slate-500 hover:text-red-500 rounded-full p-2 hover:bg-red-50 transition-all transform hover:scale-110 shadow-md"
                  title="Delete"
                >
                  <FaTrash size={11} />
                </button>
              )}
            </div>
          )}
        </div>
        <div
          className={`
                    text-[10px] mt-1.5 font-medium px-1 flex items-center gap-1.5
                    ${isMe ? "text-slate-500" : "text-slate-400"}
                `}
        >
          {formatTime(msg.created_at)}
          {isPending && (
            <span className="inline-flex items-center gap-1 italic">
              <FaSpinner size={8} className="animate-spin" />
              {uploadProgress !== null ? `sending ${uploadProgress}%` : "sending"}
            </span>
          )}
          {msg.is_updated && !isDeleted && (
            <span className="flex items-center gap-0.5 italic opacity-70">
              <FaEdit size={8} /> edited
            </span>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {messageMenu?.id === msg.id && (canEdit || canDelete) && (
        <div
          className="bg-white border border-slate-200 fixed z-[100] rounded-lg shadow-xl py-1 min-w-[120px] animate-fade-in"
          style={{ top: messageMenu.y, left: messageMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {canEdit && (
            <button
              onClick={() => {
                onEdit(msg);
                onCloseMenu();
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
            >
              <FaEdit size={12} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => {
                onDelete(msg.id);
                onCloseMenu();
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
            >
              <FaTrash size={12} /> Delete
            </button>
          )}
        </div>
      )}

      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImagePreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setImagePreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/40 text-white hover:bg-white/15 flex items-center justify-center"
          >
            <FaTimes />
          </button>
          <img
            src={imagePreviewUrl}
            alt="Attachment preview"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
