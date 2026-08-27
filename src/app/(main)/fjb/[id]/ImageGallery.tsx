"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  // Touch state for main gallery swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchDelta = useRef(0);
  const didSwipe = useRef(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch state for lightbox pan & swipe
  const lbTouchStart = useRef<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const openLightbox = (i: number) => setLightbox(i);
  const closeLightbox = () => { setLightbox(null); setZoomed(false); setPanOffset({ x: 0, y: 0 }); };

  const prevLightbox = useCallback(() => {
    setZoomed(false);
    setPanOffset({ x: 0, y: 0 });
    setLightbox((p) => (p !== null ? (p - 1 + images.length) % images.length : null));
  }, [images.length]);

  const nextLightbox = useCallback(() => {
    setZoomed(false);
    setPanOffset({ x: 0, y: 0 });
    setLightbox((p) => (p !== null ? (p + 1) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
      if (e.key === "ArrowRight") nextLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prevLightbox, nextLightbox]);

  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  // ── Main gallery touch handlers ──
  const containerRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (images.length <= 1 || isAnimating) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchDelta.current = 0;
    didSwipe.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current || images.length <= 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    // Lock to horizontal once past threshold
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      touchDelta.current = dx;
      didSwipe.current = true;
      setSwipeX(dx);
    }
  }

  function handleTouchEnd() {
    if (!touchStart.current) return;
    const threshold = 50;
    const delta = touchDelta.current;
    const containerWidth = containerRef.current?.offsetWidth ?? 300;

    if (Math.abs(delta) > threshold) {
      // Animate the image off-screen in the swipe direction, then change slide
      const direction = delta < 0 ? -1 : 1;
      setSwipeX(direction * containerWidth);
      setIsAnimating(true);

      setTimeout(() => {
        if (delta < 0) {
          setActive((p) => (p + 1) % images.length);
        } else {
          setActive((p) => (p - 1 + images.length) % images.length);
        }
        // Instantly reset position (no transition) then re-enable
        setSwipeX(0);
        setIsAnimating(false);
      }, 200);
    } else {
      // Snap back
      setSwipeX(0);
    }

    touchStart.current = null;
    touchDelta.current = 0;
  }

  function handleMainClick() {
    // Don't open lightbox if user just swiped
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    openLightbox(active);
  }

  // ── Lightbox touch handlers ──
  function handleLbTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    lbTouchStart.current = { x: t.clientX, y: t.clientY };
    if (zoomed) {
      panStart.current = { x: panOffset.x, y: panOffset.y };
    }
  }

  function handleLbTouchMove(e: React.TouchEvent) {
    if (!lbTouchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - lbTouchStart.current.x;
    const dy = t.clientY - lbTouchStart.current.y;

    if (zoomed) {
      // Pan when zoomed
      e.preventDefault();
      setPanOffset({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    }
  }

  function handleLbTouchEnd(e: React.TouchEvent) {
    if (!lbTouchStart.current) return;
    const endTouch = e.changedTouches[0];
    const dx = endTouch.clientX - lbTouchStart.current.x;
    const dy = endTouch.clientY - lbTouchStart.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!zoomed) {
      // Swipe to navigate or tap to toggle zoom
      if (dist < 10) {
        // Tap → toggle zoom at tap position
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((endTouch.clientX - rect.left) / rect.width) * 100;
        const y = ((endTouch.clientY - rect.top) / rect.height) * 100;
        setOrigin(`${x}% ${y}%`);
        setZoomed(true);
        setPanOffset({ x: 0, y: 0 });
      } else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) nextLightbox();
        else prevLightbox();
      }
    } else {
      // When zoomed, tap to unzoom
      if (dist < 10) {
        setZoomed(false);
        setPanOffset({ x: 0, y: 0 });
      }
    }
    lbTouchStart.current = null;
  }

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
        <span className="text-6xl">📦</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Main photo */}
        <div
          ref={containerRef}
          className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-zoom-in"
          style={{ touchAction: images.length > 1 ? "pan-y" : "auto" }}
          onClick={handleMainClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={title}
            className="w-full h-full object-cover select-none"
            draggable={false}
            style={{
              transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
              transition: isAnimating ? "transform 0.2s ease-out" : (swipeX !== 0 ? "none" : undefined),
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <ZoomIn className="h-3.5 w-3.5" />
              Klik untuk memperbesar
            </div>
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActive((p) => (p - 1 + images.length) % images.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActive((p) => (p + 1) % images.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === active ? "border-primary" : "border-transparent hover:border-muted-foreground/40"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-10"
          onClick={closeLightbox}
        >
          {/* Modal container */}
          <div
            className="relative bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-white/60 text-sm">
                {images.length > 1 ? `${lightbox + 1} / ${images.length}` : title}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs hidden sm:inline">
                  {zoomed ? "Geser untuk pan · Tap untuk zoom out" : "Tap gambar untuk zoom"}
                </span>
                <button
                  onClick={closeLightbox}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div
              className="relative flex items-center justify-center bg-black min-h-0 flex-1 overflow-hidden select-none"
              style={{ cursor: zoomed ? "grab" : "zoom-in", touchAction: "none" }}
              // Desktop: mouse hover zoom
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => { setZoomed(false); setOrigin("50% 50%"); setPanOffset({ x: 0, y: 0 }); }}
              onMouseMove={(e) => {
                if (!zoomed) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setOrigin(`${x}% ${y}%`);
              }}
              // Mobile: touch
              onTouchStart={handleLbTouchStart}
              onTouchMove={handleLbTouchMove}
              onTouchEnd={handleLbTouchEnd}
            >
              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
                  className="absolute left-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors hidden sm:flex"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightbox]}
                alt={`${title} — foto ${lightbox + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
                draggable={false}
                style={{
                  transform: zoomed
                    ? `scale(2) translate(${panOffset.x / 2}px, ${panOffset.y / 2}px)`
                    : "scale(1)",
                  transformOrigin: origin,
                  transition: zoomed && (panOffset.x !== 0 || panOffset.y !== 0)
                    ? "none"
                    : "transform 0.3s ease",
                }}
              />

              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
                  className="absolute right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors hidden sm:flex"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Mobile hint */}
              {!zoomed && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:hidden">
                  <span className="text-white/50 text-xs bg-black/50 px-3 py-1 rounded-full">
                    {images.length > 1 ? "Geser ← → · Tap untuk zoom" : "Tap untuk zoom"}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3 border-t border-white/10">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => { setLightbox(i); setZoomed(false); setPanOffset({ x: 0, y: 0 }); }}
                    className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${i === lightbox ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
