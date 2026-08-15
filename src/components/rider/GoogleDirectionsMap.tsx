interface MapDestination {
  latitude: number;
  longitude: number;
  name?: string;
}

interface GoogleDirectionsMapProps {
  origin?: { latitude: number; longitude: number } | null;
  destination?: MapDestination | null;
  className?: string;
}

const FALLBACK_CENTER = '4.9069,-1.7611'; // Sekondi-Takoradi

export function GoogleDirectionsMap({ origin, destination, className }: GoogleDirectionsMapProps) {
  const originStr = origin ? `${origin.latitude},${origin.longitude}` : null;
  const destStr = destination ? `${destination.latitude},${destination.longitude}` : null;

  // No API key needed: output=embed is Google's official embeddable view.
  // Destination uses exact coordinates so the map tracks the picked location.
  // With origin + destination it renders the driving route inside the app.
  const src = destStr
    ? originStr
      ? `https://maps.google.com/maps?saddr=${encodeURIComponent(originStr)}&daddr=${encodeURIComponent(destStr)}&z=14&output=embed&hl=en`
      : `https://maps.google.com/maps?q=${encodeURIComponent(destStr)}&z=16&output=embed&hl=en`
    : `https://maps.google.com/maps?q=${encodeURIComponent(originStr || FALLBACK_CENTER)}&z=13&output=embed&hl=en`;

  const openInGoogle = () => {
    const dest = destination ? `${destination.latitude},${destination.longitude}` : originStr;
    const url = destination && origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr!)}&destination=${encodeURIComponent(destStr!)}&travelmode=driving`
      : destination
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destStr!)}`
        : `https://www.google.com/maps?q=${encodeURIComponent(originStr || FALLBACK_CENTER)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className || ''}`}>
      <iframe
        title="Google Maps"
        src={src}
        className="h-[380px] w-full border-0 sm:h-[460px]"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute left-1/2 top-3 flex max-w-[90%] -translate-x-1/2 items-center gap-2">
        <div className="pointer-events-none max-w-[70%] truncate rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow">
          {destination?.name || 'Sekondi-Takoradi'}
        </div>
      </div>
      <button
        onClick={openInGoogle}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-black text-gray-800 shadow-lg hover:bg-white transition-colors"
      >
        Open in Google Maps
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </div>
  );
}