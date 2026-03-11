"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Camera } from "lucide-react";

type ScanResult =
  | { valid: true; participantName: string; jerseySize?: string; bibNumber?: string; checkedInAt: string }
  | { valid: false; reason: string; checkedInAt?: string };

export function QrScanner({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function startCamera() {
    setError(null);
    setResult(null);
    scanningRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      scanningRef.current = true;
      requestAnimationFrame(scanFrame);
    } catch {
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    setIsScanning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function scanFrame() {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    // Use BarcodeDetector if available
    if ("BarcodeDetector" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          await handleQrValue(barcodes[0].rawValue);
          return;
        }
      } catch {}
    }

    requestAnimationFrame(scanFrame);
  }

  async function handleQrValue(raw: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    scanningRef.current = false;
    stopCamera();

    try {
      const payload = JSON.parse(raw);
      const ticketId: string = payload.ticketId;
      if (!ticketId) throw new Error("QR tidak valid");

      const res = await fetch(`/api/tickets/${ticketId}/verify`, { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, reason: "QR Code tidak dikenali atau tidak valid." });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    startCamera();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/organizer/events/${eventId}`}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-bold">Scan QR Check-in</h1>
          <p className="text-xs text-muted-foreground truncate">{eventTitle}</p>
        </div>
      </div>

      {/* Camera */}
      {!result && (
        <div className="space-y-4">
          <div className="relative aspect-square bg-black rounded-2xl overflow-hidden border">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/70 rounded-xl" />
                <div className="absolute w-48 h-0.5 bg-primary/80 animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-white text-sm">Memproses...</div>
              </div>
            )}

            {!isScanning && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-3 text-white"
                >
                  <Camera className="h-12 w-12" />
                  <span className="text-sm font-medium">Mulai Kamera</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isScanning && (
            <p className="text-center text-sm text-muted-foreground">
              Arahkan kamera ke QR Code tiket peserta
            </p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl border p-6 text-center space-y-4 ${
            result.valid
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          }`}
        >
          {result.valid ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">Check-in Berhasil!</p>
                <p className="text-2xl font-bold mt-1">{result.participantName}</p>
              </div>
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                {result.jerseySize && (
                  <span className="bg-background rounded-lg px-3 py-1.5 border">
                    Jersey: <strong>{result.jerseySize}</strong>
                  </span>
                )}
                {result.bibNumber && (
                  <span className="bg-background rounded-lg px-3 py-1.5 border">
                    BIB: <strong>{result.bibNumber}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(result.checkedInAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">Check-in Gagal</p>
                <p className="text-sm text-muted-foreground mt-1">{result.reason}</p>
                {result.checkedInAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sudah scan:{" "}
                    {new Date(result.checkedInAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Scan Tiket Berikutnya
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-96px); }
          50% { transform: translateY(96px); }
        }
      `}</style>
    </div>
  );
}
