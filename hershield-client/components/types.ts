// Shared handle type for the Map component's imperative ref.
// Your components/Map.tsx should implement this using
// React.forwardRef + useImperativeHandle, e.g.:
//
//   const Map = forwardRef<MapHandle, MapProps>((props, ref) => {
//     const mapInstance = useRef<mapboxgl.Map | maplibregl.Map | L.Map>(null);
//     useImperativeHandle(ref, () => ({
//       flyTo: (coords, zoom = 16) => {
//         mapInstance.current?.flyTo({ center: coords, zoom });
//       },
//     }));
//     ...
//   });

export interface MapHandle {
  flyTo: (coords: [number, number], zoom?: number) => void;
}
