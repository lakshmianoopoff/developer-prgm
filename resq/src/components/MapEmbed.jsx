import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const createAuraIcon = (color, isPulse, locationName) => {
  return L.divIcon({
    className: 'custom-aura-icon',
    html: `
      <div class="aura-marker">
        <div class="aura-ring" style="
          background-color: ${color};
          opacity: 0.4;
          box-shadow: 0 0 30px ${color}, 0 0 60px ${color};
          ${isPulse ? `animation: aura-pulse-${color.replace('#', '')} 2s ease-out infinite;` : ''}
        "></div>
        <div class="aura-core" style="box-shadow: 0 0 10px #fff, 0 0 20px ${color};"></div>
        ${locationName ? `<div class="aura-label">${locationName.toUpperCase()}</div>` : ''}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -15]
  });
};

// Component to dynamically update center
function ChangeView({ center, zoom, isReportMode }) {
  const map = useMap();
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (center && !hasEntered) {
      map.setView([0, 0], 2, { animate: false });
      setTimeout(() => {
        map.flyTo(center, zoom, { duration: 3, easeLinearity: 0.1 });
        setHasEntered(true);
      }, 500);
    } else if (center && hasEntered) {
      // If we are shrinking into the window, adjust center slightly to keep it framed
      map.flyTo(center, isReportMode ? zoom - 1 : zoom, { duration: 1.5 });
    }
  }, [center, zoom, map, hasEntered, isReportMode]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [map]);
  return null;
}

export default function MapEmbed({ center, markers = [], userLocation = null, zoom = 15, isReportMode = false, onMarkerClick }) {
  const defaultCenter = center || userLocation || (markers.length > 0 ? markers[0].position : [10.3546, 76.2133]);
  
  return (
    <>
      <style>{`
        @keyframes aura-pulse-ff3366 {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @keyframes aura-pulse-0ea5e9 {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 15, 15, 0.8) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5) !important;
          border-radius: 12px !important;
          color: white !important;
        }
        .leaflet-popup-tip {
          background: rgba(15, 15, 15, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-popup-content {
          margin: 14px 16px !important;
        }
      `}</style>

      <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%', background: '#0A0A0A' }} scrollWheelZoom={true}>
        <ChangeView center={defaultCenter} zoom={zoom} isReportMode={isReportMode} />
        <MapResizer />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        
        {markers.map((marker, idx) => {
          let color = '#f59e0b';
          let pulse = false;
          
          if (marker.severity === 'critical') {
            color = '#ff3366'; // neon red
            pulse = true;
          } else if (marker.status === 'in_progress' || marker.status === 'assigned') {
            color = '#0ea5e9'; // electric blue
            pulse = true;
          }

          const icon = createAuraIcon(color, pulse, marker.locationName || marker.title);

          return (
            <Marker 
              key={idx} 
              position={marker.position} 
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(marker)
              }}
            >
              <Popup>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <h4 className="font-bold text-white text-base m-0 leading-tight">{marker.title}</h4>
                  <span className="text-slate-300 text-xs uppercase tracking-wider">{marker.type} — {marker.severity}</span>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    <button onClick={(e) => { e.stopPropagation(); onMarkerClick && onMarkerClick(marker); }} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition text-white">Action</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {userLocation && (
          <Marker position={userLocation} icon={createAuraIcon('#10b981', false, 'You Are Here')}></Marker>
        )}
      </MapContainer>
    </>
  );
}

