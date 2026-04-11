import { useEffect, useState } from "react";
import { FaCropAlt, FaRedo, FaTimes } from "react-icons/fa";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toCroppedFile = async (file, { zoom, offsetX, offsetY }) => {
  const previewUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = previewUrl;
    });

    const { naturalWidth, naturalHeight } = image;
    const cropWidth = naturalWidth / zoom;
    const cropHeight = naturalHeight / zoom;

    const maxOffsetX = Math.max(0, (naturalWidth - cropWidth) / 2);
    const maxOffsetY = Math.max(0, (naturalHeight - cropHeight) / 2);

    const centerX = naturalWidth / 2;
    const centerY = naturalHeight / 2;

    const sourceX = clamp(
      centerX - cropWidth / 2 + (offsetX / 100) * maxOffsetX,
      0,
      naturalWidth - cropWidth,
    );
    const sourceY = clamp(
      centerY - cropHeight / 2 + (offsetY / 100) * maxOffsetY,
      0,
      naturalHeight - cropHeight,
    );

    const outputWidth = 1200;
    const outputHeight = Math.max(
      1,
      Math.round(outputWidth * (cropHeight / cropWidth)),
    );

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context not available");
    }

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const croppedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create cropped image"));
        },
        outputType,
        0.92,
      );
    });

    const originalName = file.name || "image";
    const dotIndex = originalName.lastIndexOf(".");
    const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const extension = outputType === "image/png" ? "png" : "jpg";
    const croppedFile = new File([croppedBlob], `${baseName}-cropped.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });

    return croppedFile;
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
};

const ImageCropModal = ({ isOpen, file, onClose, onApply }) => {
  const [zoom, setZoom] = useState(1.2);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [applying, setApplying] = useState(false);
  const [sourcePreview, setSourcePreview] = useState(null);

  useEffect(() => {
    if (!file) {
      setSourcePreview(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setSourcePreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      setZoom(1.2);
      setOffsetX(0);
      setOffsetY(0);
    }
  }, [isOpen]);

  if (!isOpen || !file || !sourcePreview) return null;

  const resetCrop = () => {
    setZoom(1.2);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      const croppedFile = await toCroppedFile(file, { zoom, offsetX, offsetY });
      onApply(croppedFile);
    } catch {
      onApply(file);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <FaCropAlt className="text-slate-700" />
            Crop Image
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="relative mx-auto w-full max-w-xl aspect-[4/3] rounded-lg overflow-hidden bg-slate-900">
              <img
                src={sourcePreview}
                alt="Crop source"
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${zoom}) translate(${offsetX}%, ${offsetY}%)`,
                  transformOrigin: "center center",
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Zoom
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-slate-800"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Horizontal
              </span>
              <input
                type="range"
                min="-40"
                max="40"
                step="1"
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="w-full accent-slate-800"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Vertical
              </span>
              <input
                type="range"
                min="-40"
                max="40"
                step="1"
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full accent-slate-800"
              />
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={resetCrop}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <FaRedo size={12} />
            Reset
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={handleApply}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {applying ? "Applying..." : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
