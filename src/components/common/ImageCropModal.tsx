import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { X, Check, ZoomIn } from 'lucide-react';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  aspect?: number;
  maxOutputSize?: number;
  title?: string;
}

async function cropImageToDataUrl(imageSrc: string, pixelCrop: Area, maxSize: number) {
  const image = new Image();
  image.src = imageSrc;
  try {
    await image.decode();
  } catch {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
  }
  const scale = Math.min(1, maxSize / Math.max(pixelCrop.width, pixelCrop.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(pixelCrop.width * scale));
  canvas.height = Math.max(1, Math.round(pixelCrop.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, canvas.width, canvas.height
  );
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function ImageCropModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  aspect = 1,
  maxOutputSize = 500,
  title = 'Crop Photo',
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setPixels(null);
      setBusy(false);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, croppedAreaPixels: Area) => {
    setPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!pixels || busy) return;
    setBusy(true);
    try {
      const dataUrl = await cropImageToDataUrl(imageSrc, pixels, maxOutputSize);
      onConfirm(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-gray-500 font-bold mt-0.5">Drag to position, scroll or pinch to zoom.</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" aria-label="Close crop">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative h-80 bg-slate-900 overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={1}
            maxZoom={4}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-amber-500"
              aria-label="Zoom"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <Check className="w-4 h-4" /> {busy ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}