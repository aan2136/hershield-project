// components/Map.tsx
'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';

export interface MapHandle {
  flyTo: (coords: [number, number], zoom?: number) => void;
  recenter: () => void;
  fitRoute: () => void;
}

interface MapProps {
  source: [number, number] | null;
  destination: [number, number] | null;
  geometry: [number, number][];
  fullscreen?: boolean;
}

const DEFAULT_ZOOM = 17;
const DEFAULT_CENTER: [number, number] = [28.5706, 77.3272]; // fallback center only, never a fake marker

// source/destination/geometry all arrive as [lon, lat] — Leaflet wants [lat, lon]
const toLatLng = (pair: [number, number]): [number, number] => [
  pair[1],
  pair[0],
];

function RouteFitter({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!map || positions.length <= 1 || hasFitRef.current) return;
    const bounds = L.latLngBounds(positions as L.LatLngExpression[]);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [80, 80] });
      hasFitRef.current = true;
    }
  }, [map, positions]);

  return null;
}

const Map = forwardRef<MapHandle, MapProps>(
  ({ source, destination, geometry, fullscreen = false }, ref) => {
    const mapRef = useRef<L.Map | null>(null);
    const currentMarkerRef = useRef<L.Marker | null>(null);
    const destMarkerRef = useRef<L.Marker | null>(null);
    const routeLineRef = useRef<L.Polyline | null>(null);
    const hasCenteredRef = useRef(false);

    const convertedGeometry = useMemo<[number, number][]>(
      () => geometry.map(([lng, lat]) => [lat, lng]),
      [geometry]
    );

    // eslint-disable-next-line no-console
    console.log('geometry.length', geometry.length);
    // eslint-disable-next-line no-console
    console.log('convertedGeometry.length', convertedGeometry.length);

    useImperativeHandle(ref, () => ({
      flyTo: (coords: [number, number], zoom?: number) => {
        if (!mapRef.current) return;
        const [lat, lng] = toLatLng(coords);
        mapRef.current.flyTo([lat, lng], zoom ?? mapRef.current.getZoom(), {
          animate: true,
          duration: 1.2,
        });
      },
      recenter: () => {
        if (source && mapRef.current) {
          const [lat, lng] = toLatLng(source);
          mapRef.current.flyTo([lat, lng], DEFAULT_ZOOM, {
            animate: true,
            duration: 1,
          });
        }
      },
      fitRoute: () => {
        if (routeLineRef.current && mapRef.current) {
          const bounds = routeLineRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [60, 60] });
          }
        }
      },
    }));

    // Invalidate size once the map instance is available
    useEffect(() => {
      if (!mapRef.current) return;
      const t = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(t);
    }, [mapRef.current]);

    // Current location marker + smooth follow
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !source) return;

      const [lat, lng] = toLatLng(source);

      if (!currentMarkerRef.current) {
        const icon = L.divIcon({
          className: 'nav-current-location',
          html: `<div class="nav-pulse"></div><div class="nav-dot"></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        currentMarkerRef.current = L.marker([lat, lng], {
          icon,
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        currentMarkerRef.current.setLatLng([lat, lng]);
      }

      if (!hasCenteredRef.current) {
        // First fix: fly in from the fallback center instead of jumping
        map.flyTo([lat, lng], DEFAULT_ZOOM, { animate: true, duration: 1 });
        hasCenteredRef.current = true;
      } else {
        // Subsequent updates: glide, never jump
        map.flyTo([lat, lng], map.getZoom(), {
          animate: true,
          duration: 1,
        });
      }
    }, [source]);

    // Destination marker
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (destination) {
        const [lat, lng] = toLatLng(destination);
        const icon = L.divIcon({
          className: 'nav-destination',
          html: `<div class="nav-dest-pin"></div>`,
          iconSize: [22, 30],
          iconAnchor: [11, 30],
        });
        if (!destMarkerRef.current) {
          destMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        } else {
          destMarkerRef.current.setLatLng([lat, lng]);
        }
      } else if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    }, [destination]);

    // Keep the map sized correctly on resize and on fullscreen toggle
    useEffect(() => {
      const handleResize = () => mapRef.current?.invalidateSize();
      window.addEventListener('resize', handleResize);
      const t = setTimeout(handleResize, 200);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(t);
      };
    }, [fullscreen]);

    const initialCenter = source ? toLatLng(source) : DEFAULT_CENTER;
    const hasRoute = convertedGeometry.length > 1;

    return (
      <div
        className={
          fullscreen
            ? 'fixed inset-0 z-40 w-screen h-screen bg-[#0a0e14] overflow-hidden'
            : 'relative w-full h-[500px] rounded-3xl bg-[#0a0e14] overflow-hidden'
        }
      >
        <MapContainer
          ref={mapRef}
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          maxZoom={22}
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
          touchZoom={true}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
          preferCanvas={true}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
          whenReady={() => {
            setTimeout(() => mapRef.current?.invalidateSize(), 100);
          }}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={22}
          />
          {hasRoute && (
            <>
              <Polyline
                ref={routeLineRef}
                positions={convertedGeometry}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 7,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
                className="nav-route-line"
              />
              <RouteFitter positions={convertedGeometry} />
            </>
          )}
        </MapContainer>
        {!hasRoute && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-[500] rounded-full bg-black/60 px-4 py-1.5 text-sm text-white/80">
            No Route Geometry
          </div>
        )}
        <style jsx global>{`
          .leaflet-container {
            background: #0a0e14 !important;
            width: 100%;
            height: 100%;
            font-family: inherit;
          }
          .nav-current-location {
            position: relative;
          }
          .nav-pulse {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 26px;
            height: 26px;
            margin: -13px 0 0 -13px;
            background: rgba(59, 130, 246, 0.35);
            border-radius: 50%;
            animation: nav-pulse-anim 1.8s ease-out infinite;
          }
          .nav-dot {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 16px;
            height: 16px;
            margin: -8px 0 0 -8px;
            background: #3b82f6;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(59, 130, 246, 0.8);
            transition: transform 0.3s ease;
          }
          @keyframes nav-pulse-anim {
            0% {
              transform: scale(0.6);
              opacity: 0.9;
            }
            100% {
              transform: scale(2.6);
              opacity: 0;
            }
          }
          .nav-dest-pin {
            width: 22px;
            height: 22px;
            background: #f43f5e;
            border: 3px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
          }
          .nav-route-line {
            filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.6));
          }
          .leaflet-touch .leaflet-control-layers,
          .leaflet-touch .leaflet-bar {
            border: none;
          }
        `}</style>
      </div>
    );
  }
);

Map.displayName = 'Map';

export default Map;
