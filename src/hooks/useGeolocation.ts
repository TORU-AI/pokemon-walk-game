import { useEffect, useState } from 'react';

const DEFAULT_POSITION: [number, number] = [35.6812, 139.7671]; // Tokyo Station

export function useGeolocation() {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { position, error };
}
