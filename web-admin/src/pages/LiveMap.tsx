import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { api } from "../services/api.js";
import { LiveDriver, Zone } from "../types/index.js";
import { io } from "socket.io-client";
import { RefreshCw, Radio, AlertCircle, Shield, CheckCircle } from "lucide-react";

// Custom Leaflet Icons using SVG Data URIs
const activeRickshawIcon = L.divIcon({
  className: "custom-rickshaw-icon",
  html: `<div style="background-color: #16a34a; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; font-size: 14px;">🛺</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const staleRickshawIcon = L.divIcon({
  className: "custom-rickshaw-stale",
  html: `<div style="background-color: #eab308; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; font-size: 14px;">⚠️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const LiveMap: React.FC = () => {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fleetRes, zonesRes] = await Promise.all([api.getLiveFleet(), api.getZones()]);
      setDrivers(fleetRes.drivers);
      setZones(zonesRes.zones);
    } catch (err) {
      console.error("Failed to load map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Connect to Socket.io for live coordinates
    const socketHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const socket = io(`http://${socketHost}:5000`);
    socket.emit("join:authority");

    socket.on("tracking:update", (update: any) => {
      setDrivers((prev) => {
        const index = prev.findIndex((d) => d.driverId === update.driverId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lat: update.lat,
            lng: update.lng,
            lastPingAt: update.updatedAt,
            isStale: false,
          };
          return updated;
        } else {
          // New on-duty driver ping
          return [
            ...prev,
            {
              driverId: update.driverId,
              name: update.driverName,
              phone: update.phone,
              lat: update.lat,
              lng: update.lng,
              lastPingAt: update.updatedAt,
              isStale: false,
              permits: [],
            },
          ];
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8.5rem)] gap-4 p-4">
      {/* Sidebar: Active Fleet */}
      <div className="w-full lg:w-80 bg-white rounded-xl border border-slate-200 p-4 flex flex-col shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Radio size={16} className="text-brand-600 animate-pulse" />
              Live Fleet Monitor
            </h2>
            <p className="text-xs text-slate-500">
              {drivers.filter((d) => !d.isStale).length} Active · {drivers.filter((d) => d.isStale).length} Stale
            </p>
          </div>
          <button
            onClick={fetchData}
            title="Refresh map"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Driver List */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {drivers.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No on-duty vehicles currently reporting GPS.
            </div>
          ) : (
            drivers.map((driver) => {
              const isSelected = selectedDriver?.driverId === driver.driverId;
              return (
                <div
                  key={driver.driverId}
                  onClick={() => setSelectedDriver(driver)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    isSelected
                      ? "border-brand-500 bg-brand-50/50"
                      : "border-slate-100 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-slate-800">{driver.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        driver.isStale
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {driver.isStale ? (
                        <>
                          <AlertCircle size={10} /> Stale
                        </>
                      ) : (
                        <>
                          <CheckCircle size={10} /> Active
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-1">
                    Phone: <span className="font-mono">{driver.phone}</span>
                  </div>

                  {driver.currentVehicle && (
                    <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                      Plate: {driver.currentVehicle.registrationNumber} ({driver.currentVehicle.model})
                    </div>
                  )}

                  {driver.permits && driver.permits[0] && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      <Shield size={10} /> {driver.permits[0].zoneName}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Zone Legend */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700">Designated Zones:</div>
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between">
              <span>{z.name}</span>
              <span className="font-mono text-slate-400">Ward {z.wardNumber}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative">
        <MapContainer
          center={[23.815, 90.365]}
          zoom={14}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Operating Zone Boundary Polygons */}
          {zones.map((zone) => {
            try {
              const coords = JSON.parse(zone.polygonGeoJson);
              // GeoJSON is [lng, lat], Leaflet expects [lat, lng]
              const leafletCoords = coords.map((c: [number, number]) => [c[1], c[0]]);

              return (
                <Polygon
                  key={zone.id}
                  positions={leafletCoords}
                  pathOptions={{
                    color: "#16a34a",
                    fillColor: "#22c55e",
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: "4, 4",
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{zone.name}</strong>
                      <br />
                      Ward {zone.wardNumber} · Max speed: {zone.speedLimitKmh} km/h
                    </div>
                  </Popup>
                </Polygon>
              );
            } catch (e) {
              return null;
            }
          })}

          {/* Driver Pings */}
          {drivers
            .filter((d) => d.lat !== null && d.lng !== null)
            .map((driver) => (
              <Marker
                key={driver.driverId}
                position={[driver.lat!, driver.lng!]}
                icon={driver.isStale ? staleRickshawIcon : activeRickshawIcon}
              >
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="text-slate-800">{driver.name}</strong>
                    <div className="text-slate-500 font-mono">{driver.phone}</div>
                    {driver.currentVehicle && (
                      <div className="mt-1 text-slate-600">
                        Vehicle: {driver.currentVehicle.registrationNumber}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-400">
                      Status: {driver.isStale ? "Stale (>2m)" : "Fresh GPS ping"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
};
