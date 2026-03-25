import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PhotoGalleryModalProps {
  photos: string[];
  initialIndex?: number;
  roomName: string;
  onClose: () => void;
}

export default function PhotoGalleryModal({
  photos,
  initialIndex = 0,
  roomName,
  onClose,
}: PhotoGalleryModalProps) {
  const [index, setIndex] = useState(initialIndex);

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  if (photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`${roomName} photo gallery`}
    >
      <div
        className="relative flex max-h-[90vh] max-w-4xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40"
          aria-label="Close gallery"
        >
          <X size={20} />
        </button>

        {/* Image */}
        <img
          src={photos[index]}
          alt={`${roomName} - photo ${index + 1} of ${photos.length}`}
          className="max-h-[80vh] rounded-lg object-contain"
        />

        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label="Previous photo"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label="Next photo"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="mt-3 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {index + 1} / {photos.length}
        </div>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto px-2">
            {photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  i === index ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
