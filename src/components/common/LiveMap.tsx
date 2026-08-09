import React, { useEffect, useRef } from 'react';

interface LiveMapProps {
  riderLocation?: { lat: number; lng: number };
  restaurantLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  zoom?: number;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  riderLocation,
  restaurantLocation,
  customerLocation,
  zoom = 15
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const restaurantMarker = useRef<any>(null);
  const customerMarker = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const L = (window as any).L;
    if (!L) {
      console.warn('Leaflet not found on window');
      return;
    }

    if (leafletMap.current) return; // Already initialized

    // Center on Takoradi by default
    const center = riderLocation || restaurantLocation || customerLocation || { lat: 4.8917, lng: -1.7583 };

    leafletMap.current = L.map(mapRef.current).setView([center.lat, center.lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;

    if (restaurantLocation) {
      if (!restaurantMarker.current) {
        restaurantMarker.current = L.marker([restaurantLocation.lat, restaurantLocation.lng], {
          icon: L.divIcon({
            html: '<div class="bg-amber-500 p-2 rounded-full border-2 border-white shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(leafletMap.current).bindPopup('Restaurant');
      } else {
        restaurantMarker.current.setLatLng([restaurantLocation.lat, restaurantLocation.lng]);
      }
    }

    if (customerLocation) {
      if (!customerMarker.current) {
        customerMarker.current = L.marker([customerLocation.lat, customerLocation.lng], {
          icon: L.divIcon({
            html: '<div class="bg-rose-500 p-2 rounded-full border-2 border-white shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(leafletMap.current).bindPopup('Delivery Address');
      } else {
        customerMarker.current.setLatLng([customerLocation.lat, customerLocation.lng]);
      }
    }

    if (riderLocation) {
      if (!riderMarker.current) {
        riderMarker.current = L.marker([riderLocation.lat, riderLocation.lng], {
          icon: L.divIcon({
            html: '<div class="bg-emerald-500 p-2 rounded-full border-2 border-white shadow-lg animate-pulse"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg></div>',
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(leafletMap.current).bindPopup('Rider');
      } else {
        riderMarker.current.setLatLng([riderLocation.lat, riderLocation.lng]);
      }

      // Auto-pan to rider
      leafletMap.current.panTo([riderLocation.lat, riderLocation.lng]);
    }
  }, [riderLocation, restaurantLocation, customerLocation]);

  return <div ref={mapRef} className="w-full h-full rounded-2xl min-h-[300px] z-0" />;
};
