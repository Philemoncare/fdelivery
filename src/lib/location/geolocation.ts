export type GeolocationState =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'timeout'
  | 'position-unavailable'
  | 'unavailable'
  | 'unknown';

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeoResult {
  ok: boolean;
  state: GeolocationState;
  fix?: GeoFix;
  message?: string;
  rawMessage?: string;
  raw?: unknown;
}

export interface WatchGeoHandlers {
  onFix: (fix: GeoFix) => void;
  onError: (result: GeoResult) => void;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined';
}

export function geolocationEnvironment(): { supported: boolean; secureContext: boolean; inIframe: boolean } {
  return {
    supported: isGeolocationSupported(),
    secureContext:
      typeof window !== 'undefined' && typeof window.isSecureContext !== 'undefined'
        ? window.isSecureContext
        : true,
    inIframe: isEmbeddedInIframe(),
  };
}

// Human message for a GeoResult, including the browser's own error text when it
// adds context (skipped inside embedded frames, where that text is misleading).
export function describeGeoResult(result: GeoResult): string {
  const env = geolocationEnvironment();
  if (!env.inIframe && result.rawMessage && result.message) {
    return `${result.message} (Browser says: "${result.rawMessage}")`;
  }
  return result.message || 'Location access is required for live tracking.';
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function queryGeoPermissionState(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'prompt') return 'prompt';
      return 'denied';
    }
  } catch {
    // fall through
  }
  return 'unknown';
}

function toGeoFix(position: GeolocationPosition): GeoFix {
  const c = position.coords;
  return {
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy: c.accuracy,
    heading: c.heading ?? undefined,
    speed: c.speed ?? undefined,
    timestamp: position.timestamp,
  };
}

export function classifyGeoError(
  err: unknown,
  opts?: { permissionState?: 'granted' | 'prompt' | 'denied' | 'unknown' }
): GeoResult {
  const posErr = err as GeolocationPositionError | null;
  const message = posErr?.message || '';
  const deniedForever = opts?.permissionState === 'denied';
  const inIframe = isEmbeddedInIframe();

  if (posErr?.code === 1 || /permission|denied|policy/i.test(message)) {
    const state = deniedForever ? 'blocked' : 'denied';
    let reason: string;
    if (inIframe) {
      reason =
        'This app is running inside an embedded preview, where browsers always block GPS. Open the app in its own browser tab, then allow location when asked.';
    } else if (message.includes('Permissions Policy') || message.includes('permissions policy')) {
      reason = 'Location is disabled by a Permissions-Policy header on this site. Remove or relax "geolocation=(self)".';
    } else if (deniedForever) {
      reason =
        'Location is blocked for this site in your browser settings. Click the padlock icon in the address bar \u2192 Site settings \u2192 Location \u2192 Allow, then reload.';
    } else {
      reason = 'Location access was denied for this session. Reload and click Allow when the browser asks.';
    }
    return { ok: false, state, message: reason, rawMessage: message || undefined, raw: err };
  }
  if (posErr?.code === 2) {
    return {
      ok: false,
      state: 'position-unavailable',
      message: 'The browser could not determine your position. Move to an open area with clear sky and try again.',
      raw: err,
    };
  }
  if (posErr?.code === 3) {
    return {
      ok: false,
      state: 'timeout',
      message: 'Timed out waiting for GPS. Move to an open area and try again.',
      raw: err,
    };
  }
  return { ok: false, state: 'unknown', message: message || 'Unknown geolocation error.', raw: err };
}

export function requestGeoFix(timeoutMs = 12000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve({
        ok: false,
        state: 'unavailable',
        message: 'Geolocation is unavailable in this browser. It requires a secure context (HTTPS or localhost).',
      });
      return;
    }

    let settled = false;
    const done = (result: GeoResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      done({ ok: false, state: 'timeout', message: 'Timed out waiting for GPS. Move to an open area and try again.' });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        done({ ok: true, state: 'granted', fix: toGeoFix(position) });
      },
      (err) => {
        clearTimeout(timer);
        void queryGeoPermissionState().then((permissionState) => done(classifyGeoError(err, { permissionState })));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export function watchGeo(handlers: WatchGeoHandlers): () => void {
  if (!isGeolocationSupported()) {
    handlers.onError({
      ok: false,
      state: 'unavailable',
      message: 'Geolocation is unavailable in this browser. It requires a secure context (HTTPS or localhost).',
    });
    return () => {};
  }

  let watchId: number | null = null;
  let cleared = false;

  watchId = navigator.geolocation.watchPosition(
    (position) => handlers.onFix(toGeoFix(position)),
    (err) => {
      void queryGeoPermissionState().then((permissionState) => {
        if (!cleared) handlers.onError(classifyGeoError(err, { permissionState }));
      });
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );

  return () => {
    cleared = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  };
}
