// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db, ref, onValue } from "./firebase";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

const TDS_SAFE_MAX = 500; // mg/L
const TEMP_SAFE_MIN = 15; // °C
const TEMP_SAFE_MAX = 30; // °C

type HistoryPoint = {
  time: Date;
  tds: number;
  temperature: number;
};

export default function App(): React.JSX.Element {
  const [tds, setTds] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online, setOnline] = useState<boolean>(false);

  // local 1-minute history (not stored in Firebase)
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    const latestRef = ref(db, "waterMonitoring/mainTank/latest");

    const unsubscribe = onValue(
      latestRef,
      (snapshot) => {
  // value is expected to be an object with tds, temperature, timestamp
  const value = snapshot.val() as { tds?: number|string; temperature?: number|string; timestamp?: string } | null;
        if (!value) {
          setOnline(false);
          return;
        }

        const tdsVal = Number(value.tds ?? 0);
        const tempVal = Number(value.temperature ?? 0);
        const ts = value.timestamp ? new Date(value.timestamp) : new Date();

        setTds(tdsVal);
        setTemperature(tempVal);
        setLastUpdated(ts);
        setOnline(true);

        // update 1-minute local history
        setHistory((prev) => {
          const now = Date.now();
          const next = [
            ...prev,
            {
              time: ts,
              tds: tdsVal,
              temperature: tempVal,
            },
          ].filter((point) => now - point.time.getTime() <= 60_000); // keep last 60s only
          return next;
        });
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error("Firebase error:", error);
        setOnline(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formattedTime = useMemo(() => {
    if (!lastUpdated) return "—";
    return lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  const tdsStatus = useMemo(() => {
    if (tds == null) return { label: "—", color: "bg-gray-300", text: "text-gray-700" };
    if (tds <= TDS_SAFE_MAX) return { label: "Safe", color: "bg-green-100", text: "text-green-700" };
    return { label: "High", color: "bg-red-100", text: "text-red-700" };
  }, [tds]);

  const tempStatus = useMemo(() => {
    if (temperature == null) return { label: "—", color: "bg-gray-300", text: "text-gray-700" };
    if (temperature >= TEMP_SAFE_MIN && temperature <= TEMP_SAFE_MAX)
      return { label: "Safe", color: "bg-green-100", text: "text-green-700" };
    return { label: "Out of range", color: "bg-amber-100", text: "text-amber-700" };
  }, [temperature]);

  const chartData = useMemo(() => {
    const labels = history.map((p) => p.time.toLocaleTimeString());
    return {
      labels,
      datasets: [
        {
          label: "TDS (mg/L)",
          data: history.map((p) => p.tds),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.12)",
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: "Temperature (°C)",
          data: history.map((p) => p.temperature),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.12)",
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }, [history]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#6b7280" },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#6b7280" },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#374151",
          },
        },
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Top navigation-like header */}
      <header className="px-6 sm:px-10 pt-4 pb-3 flex items-center justify-between text-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-white/15 flex items-center justify-center">
            <span className="text-xl">💧</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Water Quality Dashboard</h1>
            <p className="text-xs sm:text-sm text-slate-500">Real-time IoT monitoring system</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`} />
            <span>{online ? "Online" : "Offline"}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
            <span>Live Data</span>
          </div>
          <div className="hidden md:flex flex-col items-end text-xs">
            <span className="opacity-70">Last updated</span>
            <span className="font-medium">{formattedTime}</span>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="mx-4 sm:mx-10 -mt-2">
        <div className="bg-brandBg/95 rounded-3xl shadow-xl shadow-blue-900/20 p-5 sm:p-7">
          {/* Monitoring location row */}
          <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Monitoring Location</h2>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-100 text-blue-600">📍</span>
                <div>
                  <p className="font-semibold text-slate-900">Main Tank – Lecture Theatre Complex</p>
                  <p className="text-xs text-slate-500">Real-time monitoring node</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active
              </span>
              <select className="border border-slate-200 text-sm rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50">
                <option>Main Tank (LTC)</option>
                <option disabled>Distribution Point A (coming soon)</option>
                <option disabled>Backup Tank (coming soon)</option>
              </select>
            </div>
          </section>

          {/* Live sensor readings */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Live Sensor Readings</h3>
                <p className="text-xs text-slate-500">Real-time water quality parameters from IoT sensors</p>
              </div>
              <button className="hidden sm:inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">Live Data</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TDS card */}
              <div className="bg-cardBg rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌊</span>
                      <h4 className="font-semibold text-slate-800">TDS Sensor</h4>
                    </div>
                    <p className="text-xs text-slate-500">Total Dissolved Solids</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${tdsStatus.color} ${tdsStatus.text}`}>{tdsStatus.label}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-slate-900">{tds != null ? tds.toFixed(1) : "--"}</span>
                  <span className="text-sm text-slate-500">mg/L</span>
                </div>

                <div className="text-xs text-slate-500">
                  Safe range:&nbsp;
                  <span className="font-medium text-slate-700">0 – {TDS_SAFE_MAX} mg/L</span>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Trend (last 1 min)</span>
                    <span>
                      {history.length > 1 && tds != null
                        ? tdsStatus.label === "Safe"
                          ? "Stable"
                          : "Needs attention"
                        : "Waiting for data"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tds != null && tds <= TDS_SAFE_MAX ? "bg-emerald-400" : "bg-red-400"
                      }`}
                      style={{
                        width:
                          tds == null ? "10%" : `${Math.min((tds / TDS_SAFE_MAX) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Temperature card */}
              <div className="bg-cardBg rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌡️</span>
                      <h4 className="font-semibold text-slate-800">Temperature</h4>
                    </div>
                    <p className="text-xs text-slate-500">Water temperature sensor</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${tempStatus.color} ${tempStatus.text}`}>{tempStatus.label}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-slate-900">{temperature != null ? temperature.toFixed(1) : "--"}</span>
                  <span className="text-sm text-slate-500">°C</span>
                </div>

                <div className="text-xs text-slate-500">
                  Safe range:&nbsp;
                  <span className="font-medium text-slate-700">{TEMP_SAFE_MIN} – {TEMP_SAFE_MAX} °C</span>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Trend (last 1 min)</span>
                    <span>{history.length > 1 && temperature != null ? tempStatus.label : "Waiting for data"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{
                        width:
                          temperature == null
                            ? "10%"
                            : `${Math.min(((temperature - TEMP_SAFE_MIN) / (TEMP_SAFE_MAX - TEMP_SAFE_MIN)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Historical data chart (1 minute, local only) */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Historical Data (Last 1 Minute)</h3>
                <p className="text-xs text-slate-500">This chart uses only in-browser memory – no extra history is stored in Firebase.</p>
              </div>
            </div>
            <div className="bg-cardBg rounded-2xl border border-slate-100 p-4 sm:p-5 h-72 sm:h-80">
              {history.length < 2 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">Waiting for enough data points…</div>
              ) : (
                <Line data={chartData} options={chartOptions as unknown as import('chart.js').ChartOptions<'line'>} />
              )}
            </div>
          </section>

          {/* Device status & system info simplified */}
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-cardBg rounded-2xl border border-slate-100 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Device Status</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">Main Tank Sensor</p>
                    <p className="text-xs text-slate-500">Primary Water Tank – ESP32 Node</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {online ? "Online" : "Offline"}
                  </span>
                </li>

                <li className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="font-medium text-slate-800">Distribution Sensor</p>
                    <p className="text-xs text-slate-500">Planned expansion</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Offline
                  </span>
                </li>

                <li className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="font-medium text-slate-800">Backup Tank Sensor</p>
                    <p className="text-xs text-slate-500">Planned expansion</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Offline
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-cardBg rounded-2xl border border-slate-100 p-4 sm:p-5 grid grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="rounded-xl bg-emerald-50 px-3 py-3 flex flex-col justify-between">
                <span className="text-xs text-emerald-700">System Status</span>
                <span className="mt-1 font-semibold text-emerald-800">{online ? "Operational" : "Offline"}</span>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-3 flex flex-col justify-between">
                <span className="text-xs text-blue-700">Active Parameters</span>
                <span className="mt-1 font-semibold text-blue-800">2</span>
              </div>
              <div className="rounded-xl bg-violet-50 px-3 py-3 flex flex-col justify-between">
                <span className="text-xs text-violet-700">Active Sensors</span>
                <span className="mt-1 font-semibold text-violet-800">1 / 3</span>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-3 flex flex-col justify-between">
                <span className="text-xs text-amber-700">History Window</span>
                <span className="mt-1 font-semibold text-amber-800">Last 1 minute</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
