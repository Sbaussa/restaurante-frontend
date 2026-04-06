import { useState } from "react";
import { useDashboardStats, useSalesByHour } from "../hooks/useData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const TODAY = new Date().toISOString().split("T")[0];

function StatCard({ icon, label, value, sub, color = "text-amber-400", badge }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-medium ${color} bg-gray-800 px-2 py-1 rounded-full`}>
          {badge || "PERÍODO"}
        </span>
      </div>
      <p className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
        <p className="text-gray-400">{`${label}:00 hrs`}</p>
        <p className="text-amber-400 font-bold">${payload[0].value.toLocaleString()}</p>
        <p className="text-gray-500">{payload[1]?.value} pedidos</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(TODAY);
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);

  const filters = mode === "day" ? { date } : { from, to };
  const { data: stats, loading: loadingStats } = useDashboardStats(filters);
  const { data: salesByHour, loading: loadingSales } = useSalesByHour(filters);

  const isToday = mode === "day" && date === TODAY;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">
            {isToday
              ? new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : mode === "day"
              ? new Date(date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : `Del ${from} al ${to}`}
          </p>
        </div>

        {/* Controles fecha */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1 self-start">
            <button
              onClick={() => setMode("day")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === "day" ? "bg-amber-500 text-gray-900" : "text-gray-400 hover:text-white"
              }`}
            >
              Por día
            </button>
            <button
              onClick={() => setMode("range")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === "range" ? "bg-amber-500 text-gray-900" : "text-gray-400 hover:text-white"
              }`}
            >
              Rango
            </button>
          </div>

          {mode === "day" ? (
            <div className="flex items-center gap-2">
              <input
                type="date" value={date} max={TODAY}
                onChange={(e) => setDate(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              {date !== TODAY && (
                <button onClick={() => setDate(TODAY)} className="text-xs text-amber-500 hover:text-amber-400">
                  Hoy
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={from} max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-gray-600 text-sm">→</span>
              <input type="date" value={to} min={from} max={TODAY}
                onChange={(e) => setTo(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {loadingStats ? (
        <div className="text-gray-500 animate-pulse">Cargando estadísticas...</div>
      ) : (
        <>
          {/* Tarjetas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <StatCard icon="💰" label="Ingresos del período" color="text-amber-400"
              value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} />
            <StatCard icon="🧾" label="Pedidos completados" color="text-green-400"
              value={stats?.totalOrders || 0} />
            <StatCard icon="⏳" label="Pendientes ahora" color="text-orange-400"
              value={stats?.pendingOrders || 0} badge="AHORA" />
            <StatCard icon="⭐" label="Producto estrella" color="text-blue-400"
              value={stats?.topProducts?.[0]?.name || "—"}
              sub={stats?.topProducts?.[0] ? `${stats.topProducts[0].totalSold} vendidos` : ""} />
          </div>

          {/* Gráfica + top */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Ventas por hora</h3>
              {loadingSales ? (
                <div className="h-40 flex items-center justify-center text-gray-600">Cargando...</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salesByHour || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="hour" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(h) => `${h}h`} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="orders"  fill="#374151" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Top productos</h3>
              <div className="space-y-3">
                {stats?.topProducts?.length ? (
                  stats.topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{p.name}</p>
                        <div className="h-1.5 bg-gray-800 rounded-full mt-1">
                          <div
                            className="h-1.5 bg-amber-500 rounded-full"
                            style={{ width: `${(p.totalSold / stats.topProducts[0].totalSold) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{p.totalSold}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">Sin ventas en este período</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}