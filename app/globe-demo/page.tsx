"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { _GlobeView as GlobeView } from "@deck.gl/core";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer, GeoJsonLayer, ArcLayer, TextLayer } from "@deck.gl/layers";

/** =========================
 *  Types
 *  ========================= */
type BinLike = { lat: number; lng: number; count?: number };
type Arc = { source: [number, number]; target: [number, number]; age: number; intensity: number };
type Pulse = { position: [number, number]; age: number; maxRadius: number };

/** =========================
 *  Demo data generator
 *  ========================= */
function randNorm(mean = 0, stdev = 1) {
  let u = 1 - Math.random();
  let v = 1 - Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdev + mean;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function randomGlobalPoint(): { lat: number; lng: number } {
  return { lat: Math.random() * 180 - 90, lng: Math.random() * 360 - 180 };
}
function around(lat: number, lng: number, km = 500) {
  const dLat = randNorm(0, km / 111);
  const dLng = randNorm(0, (km / 111) * Math.cos((lat * Math.PI) / 180));
  return {
    lat: clamp(lat + dLat, -85, 85),
    lng: ((((lng + dLng + 180) % 360) + 360) % 360) - 180,
  };
}

type SurveySummary = { id: string; title: string; passed: boolean; score: number };
type IpPoint = BinLike & {
  ip: string;
  lastSeen: string;
  surveys: SurveySummary[];
};

function randomIp() {
  return `${(Math.random()*255|0)}.${(Math.random()*255|0)}.${(Math.random()*255|0)}.${(Math.random()*255|0)}`;
}

function makeRandomIpPoints(n = 120): IpPoint[] {
  const out: IpPoint[] = [];
  // sprinkle around some hubs so it looks nice
  const hubs = [
    { lat: 32.95, lng: -96.73 },   // Richardson
    { lat: 40.7128, lng: -74.006}, // NYC
    { lat: 37.7749, lng: -122.419},// SF
    { lat: 51.507, lng: -0.127 },  // London
    { lat: 12.9716, lng: 77.5946}, // Bangalore
  ];
  for (let i = 0; i < n; i++) {
    const h = hubs[(Math.random() * hubs.length) | 0];
    const p = around(h.lat, h.lng, 200 + Math.random() * 800);
    const attempts = 1 + (Math.random() * 4) | 0;
    const passed = Math.random() > 0.35;
    const score = Math.floor(60 + Math.random() * 40);
    out.push({
      ip: randomIp(),
      lat: Number(p.lat.toFixed(3)),
      lng: Number(p.lng.toFixed(3)),
      count: attempts,
      lastSeen: new Date(Date.now() - Math.random()*7*864e5).toISOString(),
      surveys: [
        { id: "svy_"+(Math.random()*1e6|0), title: "Screen A", passed, score },
        { id: "svy_"+(Math.random()*1e6|0), title: "Screen B", passed: !passed && Math.random()>.5, score: Math.floor(50+Math.random()*50) }
      ]
    });
  }
  return out;
}


function makeDemoData(total = 22000): BinLike[] {
  const points: BinLike[] = [];
  const clusters = [
    { lat: 32.95, lng: -96.73, size: 5500 }, // Richardson
    { lat: 37.78, lng: -122.42, size: 4200 }, // SF
    { lat: 51.507, lng: -0.127, size: 3600 }, // London
    { lat: 12.9716, lng: 77.5946, size: 3600 }, // Bangalore
    { lat: 1.3521, lng: 103.8198, size: 2500 }, // Singapore
    { lat: 35.6762, lng: 139.6503, size: 3000 }, // Tokyo
    { lat: -33.8688, lng: 151.2093, size: 2000 }, // Sydney
    { lat: 40.7128, lng: -74.0060, size: 3500 }, // NYC
  ];
  const clustered = clusters.reduce((a, c) => a + c.size, 0);
  const remainder = Math.max(0, total - clustered);

  clusters.forEach(({ lat, lng, size }) => {
    for (let i = 0; i < size; i++) points.push(around(lat, lng, 120));
  });
  for (let i = 0; i < remainder; i++) points.push(randomGlobalPoint());

  const key = (p: { lat: number; lng: number }) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
  const map = new Map<string, BinLike & { count: number }>();
  for (const p of points) {
    const k = key(p);
    const prev = map.get(k);
    if (prev) prev.count += 1;
    else map.set(k, { lat: Number(p.lat.toFixed(2)), lng: Number(p.lng.toFixed(2)), count: 1 });
  }
  return [...map.values()];
}

/** =========================
 *  UI Components
 *  ========================= */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-control">
      <div className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider"></span>
      </div>
      <span className="toggle-label">{label}</span>
    </label>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  label,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  step?: number;
}) {
  return (
    <div className="slider-control">
      <label>{label}: <b>{value}</b></label>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step}
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className="slider"
      />
    </div>
  );
}

/** =========================
 *  Main Component
 *  ========================= */
export default function GlobeDemoPage() {
  const [data, setData] = useState<IpPoint[]>([]);
  const [zoom, setZoom] = useState(0.35);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showHex, setShowHex] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const [showPulses, setShowPulses] = useState(true);
  const [pointSize, setPointSize] = useState(8);
  const [elevScale, setElevScale] = useState(50);
  const [binKm, setBinKm] = useState(70);
  const [arcIntensity, setArcIntensity] = useState(0.3);
  const [rotationSpeed, setRotationSpeed] = useState(0.08);
  
const [selected, setSelected] = useState<IpPoint | null>(null);
const [manualControl, setManualControl] = useState(false);
  // Globe rotation state
  const [viewState, setViewState] = useState({
    longitude: -20,
    latitude: 20,
    zoom: 0.35,
  });

  // World boundaries
  const [countries, setCountries] = useState<any>(null);
  const [land110m, setLand110m] = useState<any>(null);

  // Animated elements
  const [arcs, setArcs] = useState<Arc[]>([]);
  const arcRef = useRef<Arc[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const pulseRef = useRef<Pulse[]>([]);

  // Generate demo points
// Proof-of-concept: random IP respondents
useEffect(() => {
  setData(makeRandomIpPoints(160)); // tweak the count if you want
}, []);


  // Fetch boundaries
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
    )
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => {});
    
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"
    )
      .then((r) => r.json())
      .then(setLand110m)
      .catch(() => {});
  }, []);

  // Animated arcs with reduced quantity and better performance
  useEffect(() => {
    if (!data.length || !showArcs) {
      setArcs([]);
      return;
    }
    
    // Start with fewer arcs
    const seed: Arc[] = [];
    for (let i = 0; i < 25; i++) {
      const a = data[(Math.random() * data.length) | 0];
      const b = data[(Math.random() * data.length) | 0];
      seed.push({ 
        source: [a.lng, a.lat], 
        target: [b.lng, b.lat], 
        age: Math.random() * 1,
        intensity: 0.3 + Math.random() * 0.7
      });
    }
    arcRef.current = seed;
    setArcs(seed);

    let raf = 0;
    const tick = () => {
      const arr = arcRef.current.map((x) => ({ ...x, age: x.age + 0.008 }));
      const alive = arr.filter((x) => x.age < 1.0);

      // Add fewer new arcs
      if (Math.random() < 0.15 && alive.length < 40) {
        const a = data[(Math.random() * data.length) | 0];
        const b = data[(Math.random() * data.length) | 0];
        alive.push({ 
          source: [a.lng, a.lat], 
          target: [b.lng, b.lat], 
          age: 0,
          intensity: 0.3 + Math.random() * 0.7
        });
      }
      arcRef.current = alive;
      setArcs(alive);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, showArcs]);

  // Pulse effects for major nodes
  useEffect(() => {
    if (!data.length || !showPulses) {
      setPulses([]);
      return;
    }

    let raf = 0;
    const tick = () => {
      const arr = pulseRef.current.map((x) => ({ ...x, age: x.age + 0.015 }));
      const alive = arr.filter((x) => x.age < 1.0);

      // Occasionally add a new pulse
      if (Math.random() < 0.05 && alive.length < 8) {
        const point = data[(Math.random() * Math.min(100, data.length)) | 0];
        alive.push({
          position: [point.lng, point.lat],
          age: 0,
          maxRadius: 80000 + Math.random() * 40000,
        });
      }
      pulseRef.current = alive;
      setPulses(alive);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, showPulses]);

  /** ===== Layers ===== */

  // Land silhouettes - subtle monochrome fill
  const landLayer = useMemo(
    () =>
      land110m &&
      new GeoJsonLayer({
        id: "land",
        data: land110m,
        stroked: false,
        filled: true,
        getFillColor: [255, 255, 255, 8],
        opacity: 0.5,
        pickable: false,
      }),
    [land110m]
  );

  // Country borders - crisp white lines
  const bordersLayer = useMemo(
    () =>
      countries &&
      new GeoJsonLayer({
        id: "borders",
        data: countries,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 0.5,
        getLineColor: [255, 255, 255, 60],
        getLineWidth: 0.8,
        pickable: false,
      }),
    [countries]
  );

  // Hexagon density layer
  const hex = useMemo(
    () =>
      new HexagonLayer({
        id: "hex",
        data,
        getPosition: (d: BinLike) => [d.lng, d.lat],
        radius: binKm * 1000,
        extruded: true,
        elevationScale: elevScale,
        coverage: 0.85,
        pickable: true,
        colorRange: [
          [20, 20, 20],
          [40, 40, 40],
          [80, 80, 80],
          [120, 120, 120],
          [180, 180, 180],
          [255, 255, 255],
        ],
      }),
    [data, binKm, elevScale]
  );

const points = useMemo(
  () =>
    new ScatterplotLayer({
      id: "scatter",
      data,
      getPosition: (d: IpPoint) => [d.lng, d.lat],
      getRadius: (d: IpPoint) =>
        Math.min(70000, 9000 + Math.log((d.count ?? 1) + 1) * 18000),
      radiusMinPixels: 1,
      radiusMaxPixels: pointSize,
      getFillColor: (d: IpPoint) => {
        // gold with brightness based on attempts
        const bump = Math.min(80, Math.floor(Math.log((d.count ?? 1) + 1) * 40));
        return [255, 200 + bump, Math.max(0, 40 - bump), 220];
      },
      stroked: true,
      getLineColor: [255, 220, 120, 255],
      lineWidthMinPixels: 0.6,
      pickable: true,
    }),
  [data, pointSize]
);

  // Pulse rings
  const pulseLayer = useMemo(
    () =>
      new ScatterplotLayer({
        id: "pulses",
        data: pulses,
        getPosition: (d: Pulse) => d.position,
        getRadius: (d: Pulse) => d.maxRadius * d.age,
        radiusMinPixels: 0,
        radiusMaxPixels: 100,
        getFillColor: [255, 255, 255, 0],
        getLineColor: (d: Pulse) => [255, 255, 255, Math.floor((1 - d.age) * 100)],
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 2,
        stroked: true,
        filled: false,
        pickable: false,
      }),
    [pulses]
  );

  // Techno arc connections
  const arcLayer = useMemo(
    () =>
      new ArcLayer({
        id: "arcs",
        data: arcs,
        getSourcePosition: (d: Arc) => d.source,
        getTargetPosition: (d: Arc) => d.target,
        greatCircle: true,
        getSourceColor: (d: Arc) => {
          const alpha = Math.floor((1 - d.age) * d.intensity * arcIntensity * 255);
          return [255, 255, 255, alpha];
        },
        getTargetColor: (d: Arc) => {
          const alpha = Math.floor((1 - d.age) * d.intensity * arcIntensity * 127);
          return [255, 255, 255, alpha];
        },
        getWidth: (d: Arc) => Math.max(0.1, (1.5 - d.age) * d.intensity),
        widthMinPixels: 0.3,
        widthMaxPixels: 2,
        pickable: false,
      }),
    [arcs, arcIntensity]
  );

  // Layer composition
  const dataLayers = useMemo(() => {
    const density = showHex && zoom < 0.65 ? [hex] : [points];
    return [
      landLayer, 
      bordersLayer, 
      ...density, 
      pulseLayer,
      arcLayer
    ].filter(Boolean) as any[];
  }, [showHex, zoom, landLayer, bordersLayer, hex, points, pulseLayer, arcLayer]);

  /** ===== Auto-rotation with better control ===== */
  useEffect(() => {
    if (!autoRotate) return;
    
    let raf = 0;
    const spin = () => {
      setViewState(prev => ({
        ...prev,
        longitude: prev.longitude + rotationSpeed,
      }));
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, rotationSpeed]);

  // Handle view state changes with rotation lock
  const handleViewStateChange = useCallback(({ viewState: newViewState }: any) => {
    setZoom(newViewState.zoom ?? 0);
    
    // If auto-rotating, only allow zoom changes
    if (autoRotate) {
      setViewState(prev => ({
        ...prev,
        zoom: newViewState.zoom,
      }));
    } else {
      setViewState(newViewState);
    }
  }, [autoRotate]);

  /** ===== Render ===== */
  return (
    <div className="globe-container">
      <style jsx>{`
        .globe-container {
          width: 100%;
          height: 100vh;
          position: relative;
          background: #000;
          overflow: hidden;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          mask-image: radial-gradient(ellipse at center, transparent 30%, black 70%);
          pointer-events: none;
          opacity: 0.3;
        }

        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: scan 8s linear infinite;
          pointer-events: none;
        }

        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }

        .controls-panel {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 0 40px rgba(255, 255, 255, 0.05),
            inset 0 0 20px rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 20px;
          color: #fff;
          min-width: 280px;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }

        .controls-title {
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .controls-title::before {
          content: '';
          width: 8px;
          height: 8px;
          background: #fff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .toggle-control {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          cursor: pointer;
          font-size: 12px;
        }

        .toggle-switch {
          position: relative;
          width: 40px;
          height: 20px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          transition: all 0.3s;
        }

        .toggle-slider::before {
          position: absolute;
          content: "";
          height: 12px;
          width: 12px;
          left: 3px;
          bottom: 3px;
          background: #fff;
          border-radius: 50%;
          transition: all 0.3s;
          box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
        }

        .toggle-switch input:checked + .toggle-slider {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .toggle-switch input:checked + .toggle-slider::before {
          transform: translateX(a20px);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }

        .toggle-label {
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .toggle-control:hover .toggle-label {
          opacity: 1;
        }

        .slider-control {
          margin-bottom: 16px;
        }

        .slider-control label {
          display: block;
          font-size: 11px;
          margin-bottom: 6px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .slider-control b {
          color: #fff;
          font-weight: 600;
        }

        .slider {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          transition: all 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
          transform: scale(1.1);
        }

        .stats-display {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 10px;
          opacity: 0.6;
          display: grid;
          gap: 4px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
        }
      `}</style>

      <div className="grid-overlay" />
      <div className="scanline" />
      
      <DeckGL
  views={new GlobeView()}
  viewState={viewState}
  onViewStateChange={handleViewStateChange}
  controller={{
    // only allow pan/rotate when manualControl is true
    dragPan: manualControl,
    dragRotate: manualControl,
    // allow zoom via scroll always
    scrollZoom: true,
    touchZoom: true,
    touchRotate: manualControl,
    doubleClickZoom: true,
  }}
  layers={dataLayers}
  // click to select an IP
  onClick={(info) => {
    if (info?.layer?.id === "scatter" && info.object) {
      setSelected(info.object as IpPoint);
    } else {
      setSelected(null);
    }
  }}
  getTooltip={({ object, layer }) => {
    if (!object || !layer) return null;
    if (layer.id === "scatter") {
      const pt = object as IpPoint;
      const c = pt.count ?? 1;
      return {
        html: `<div style="background: rgba(0,0,0,0.9); color: white; padding: 6px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; border: 1px solid rgba(255,215,0,0.5)">
                 <div><b style="color:#FFD700">${pt.ip}</b></div>
                 RESPONDENTS: <b style="color:#FFD700">${c}</b>
               </div>`,
      };
    }
    if (layer.id === "hex") {
      const n = (object as any).points?.length ?? 1;
      return {
        html: `<div style="background: rgba(0,0,0,0.9); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; border: 1px solid rgba(255,255,255,0.2)">DENSITY: ${n}</div>`,
      };
    }
    return null;
  }}
/>
{/* IP details side panel */}
{selected && (
  <div
    className="ip-panel"
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      right: 20,
      top: 20,
      width: 320,
      background: "rgba(0,0,0,0.85)",
      color: "#fff",
      borderRadius: 12,
      padding: 16,
      border: "1px solid rgba(255,215,0,0.3)",
      boxShadow: "0 0 24px rgba(255,215,0,0.08)",
      fontFamily: "SF Mono, Monaco, Inconsolata, monospace",
    }}
  >
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{letterSpacing:1.5,fontSize:12,opacity:.9}}>IP PROFILE</div>
      <button
        onClick={() => setSelected(null)}
        style={{background:"transparent",border:"none",color:"#fff",cursor:"pointer",fontSize:16}}
        aria-label="Close"
      >
        ×
      </button>
    </div>

    <div style={{fontSize:14, marginBottom:8}}>
      <b style={{color:"#FFD700"}}>{selected.ip}</b>
    </div>
    <div style={{fontSize:12, opacity:.8, marginBottom:12}}>
      Lat/Lng: {selected.lat}, {selected.lng}
      <br/>Attempts: {selected.count ?? 1}
      <br/>Last seen: {new Date(selected.lastSeen).toLocaleString()}
    </div>

    <div style={{fontSize:12, letterSpacing:.5, marginBottom:6, opacity:.9}}>Surveys</div>
    <div style={{display:"grid", gap:8}}>
      {selected.surveys.map((s, i) => (
        <div key={i} style={{
          border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:8, padding:8,
          background:"rgba(255,255,255,0.03)"
        }}>
          <div style={{fontSize:12}}><b>{s.title}</b> <span style={{opacity:.7}}>({s.id})</span></div>
          <div style={{fontSize:11, marginTop:4}}>
            Result: <b style={{color: s.passed ? "#7CFC00" : "#FF6B6B"}}>{s.passed ? "PASS" : "FAIL"}</b>
            &nbsp;•&nbsp; Score: <b>{s.score}</b>
          </div>
        </div>
      ))}
    </div>
  </div>
)}



      <div className="controls-panel">
        <div className="controls-title">GLOBAL NETWORK</div>
        
        <Toggle checked={autoRotate} onChange={setAutoRotate} label="Auto-rotate" />
        <Toggle checked={showHex} onChange={setShowHex} label="Density hexagons" />
        <Toggle checked={showArcs} onChange={setShowArcs} label="Data streams" />
        <Toggle checked={showPulses} onChange={setShowPulses} label="Node pulses" />
        <Toggle checked={manualControl} onChange={setManualControl} label="Manual control (drag/pan/rotate)" />


        {autoRotate && (
          <Slider
            value={rotationSpeed}
            onChange={setRotationSpeed}
            min={0.02}
            max={0.2}
            step={0.01}
            label="Rotation speed"
          />
        )}

        <Slider
          value={pointSize}
          onChange={setPointSize}
          min={2}
          max={12}
          label="Node size"
        />

        <Slider
          value={arcIntensity}
          onChange={setArcIntensity}
          min={0.1}
          max={1}
          step={0.1}
          label="Stream intensity"
        />

        {showHex && (
          <>
            <Slider
              value={binKm}
              onChange={setBinKm}
              min={40}
              max={150}
              label="Hex radius (km)"
            />
            <Slider
              value={elevScale}
              onChange={setElevScale}
              min={10}
              max={100}
              label="Elevation scale"
            />
          </>
        )}

        <div className="stats-display">
          <div className="stat-row">
            <span>ZOOM LEVEL</span>
            <span>{zoom.toFixed(2)}</span>
          </div>
          <div className="stat-row">
            <span>ACTIVE NODES</span>
            <span>{data.length}</span>
          </div>
          <div className="stat-row">
            <span>DATA STREAMS</span>
            <span>{arcs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}