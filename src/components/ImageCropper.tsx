"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface Props {
  imageSrc: string;
  aspect?: number;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageSrc, aspect = 1, onCrop, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    await new Promise((resolve) => { img.onload = resolve; });

    const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height);
    canvas.width = Math.min(size, 512);
    canvas.height = Math.min(size, 512);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0, canvas.width, canvas.height,
    );

    onCrop(canvas.toDataURL("image/webp", 0.85));
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", width: "100%", height: 280, borderRadius: 12, overflow: "hidden", background: "#111" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape="rect"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { borderRadius: 12 },
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <ZoomOut size={14} style={{ color: "#6B7D8F", flexShrink: 0 }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, maxWidth: 160, accentColor: "#006D77" }}
          />
          <ZoomIn size={14} style={{ color: "#6B7D8F", flexShrink: 0 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px",
              borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.12)", background: "white",
              cursor: "pointer", fontSize: 12, color: "#6B7D8F",
            }}
          >
            <X size={13} /> Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px",
              borderRadius: 8, border: "none", background: "#006D77", color: "white",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            <Check size={13} /> Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
