import { useState } from "react";
import { useDashboardStats, useSalesByHour } from "../hooks/useData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .split("T")[0];

const STATUS_COLORS = {
  PENDING:   "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  PREPARING: "text-blue-400 bg-blue-900/30 border-blue-800",
  READY:     "text-green-400 bg-green-900/30 border-green-800",
  DELIVERED: "text-gray-400 bg-gray-800 border-gray-700",
  CANCELLED: "text-red-400 bg-red-900/30 border-red-800",
};
const STATUS_LABELS = {
  PENDING: "Pendiente", PREPARING: "Preparando",
  READY: "Listo", DELIVERED: "Entregado", CANCELLED: "Cancelado",
};

const PAYMENT_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#a855f7"];

const PAYMENT_LABELS = {
  EFECTIVO:      "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA:       "Tarjeta",
  MIXTO:         "Mixto",
};

const PAYMENT_ICONS = {
  EFECTIVO:      "💵",
  TRANSFERENCIA: "📲",
  TARJETA:       "💳",
  MIXTO:         "🔀",
};

function StatCard({ icon, label, value, sub, color = "text-amber-400", badge, trend }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <div className="flex items-center gap-2">
          {trend !== null && trend !== undefined && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend >= 0
                ? "text-green-400 bg-green-900/30"
                : "text-red-400 bg-red-900/30"
            }`}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          <span className={`text-xs font-medium ${color} bg-gray-800 px-2 py-0.5 rounded-full`}>
            {badge || "PERÍODO"}
          </span>
        </div>
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
  const [to, setTo]     = useState(TODAY);

  const filters = mode === "day" ? { date } : { from, to };
  const { data: stats, loading: loadingStats } = useDashboardStats(filters);
  const { data: salesByHour, loading: loadingSales } = useSalesByHour(filters);

  const isToday = mode === "day" && date === TODAY;

  const paymentData = stats?.paymentMethods?.map((p, i) => ({
    name:  PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod || "Sin método",
    icon:  PAYMENT_ICONS[p.paymentMethod] || "💰",
    value: p._sum.total || 0,
    count: p._count,
    color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
  })) || [];

  // Método más usado (incluyendo MIXTO)
  const topPayment = stats?.paymentMethods?.length
    ? stats.paymentMethods.sort((a, b) => b._count - a._count)[0]
    : null;

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

        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1 self-start">
            <button onClick={() => setMode("day")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === "day" ? "bg-amber-500 text-gray-900" : "text-gray-400 hover:text-white"
              }`}>
              Por día
            </button>
            <button onClick={() => setMode("range")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === "range" ? "bg-amber-500 text-gray-900" : "text-gray-400 hover:text-white"
              }`}>
              Rango
            </button>
          </div>

          {mode === "day" ? (
            <div className="flex items-center gap-2">
              <input type="date" value={date} max={TODAY}
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
          {/* Tarjetas principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatCard icon="💰" label="Ingresos" color="text-amber-400"
              value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
              trend={stats?.revenueChange}
            />
            <StatCard icon="🧾" label="Pedidos" color="text-green-400"
              value={stats?.totalOrders || 0}
            />
            <StatCard icon="🎯" label="Ticket promedio" color="text-blue-400"
              value={`$${Math.round(stats?.avgTicket || 0).toLocaleString()}`}
            />
            <StatCard icon="⏳" label="Pendientes ahora" color="text-orange-400"
              value={stats?.pendingOrders || 0} badge="AHORA"
            />
          </div>

          {/* Fila secundaria */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatCard icon="❌" label="Cancelados" color="text-red-400"
              value={stats?.cancelledOrders || 0}
            />
            <StatCard icon="⭐" label="Producto estrella" color="text-purple-400"
              value={stats?.topProducts?.[0]?.name || "—"}
              sub={stats?.topProducts?.[0] ? `${stats.topProducts[0].totalSold} vendidos` : ""}
            />
            <StatCard icon="🏆" label="Categoría top" color="text-cyan-400"
              value={stats?.categoryRanking?.[0]?.name || "—"}
              sub={stats?.categoryRanking?.[0] ? `${stats.categoryRanking[0].total} uds` : ""}
            />
            <StatCard icon="💳" label="Método más usado" color="text-pink-400"
              value={topPayment ? (PAYMENT_LABELS[topPayment.paymentMethod] || topPayment.paymentMethod) : "—"}
              sub={topPayment ? `${topPayment._count} pedidos` : ""}
            />
          </div>

          {/* Gráfica ventas por hora + Métodos de pago */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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

            {/* Métodos de pago */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Métodos de pago</h3>
              {paymentData.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin pagos registrados</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        dataKey="value" paddingAngle={3}>
                        {paymentData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {paymentData.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-gray-400">{p.icon} {p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-white font-medium">${p.value.toLocaleString()}</span>
                          <span className="text-xs text-gray-600 ml-1">({p.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top productos + Categorías + Últimos pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top productos */}
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
                          <div className="h-1.5 bg-amber-500 rounded-full"
                            style={{ width: `${(p.totalSold / stats.topProducts[0].totalSold) * 100}%` }} />
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

            {/* Top categorías */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Categorías más vendidas</h3>
              <div className="space-y-3">
                {stats?.categoryRanking?.length ? (
                  stats.categoryRanking.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{cat.name}</p>
                        <div className="h-1.5 bg-gray-800 rounded-full mt-1">
                          <div className="h-1.5 bg-blue-500 rounded-full"
                            style={{ width: `${(cat.total / stats.categoryRanking[0].total) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{cat.total} uds</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">Sin ventas en este período</p>
                )}
              </div>
            </div>

            {/* Últimos pedidos */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Últimos pedidos</h3>
              <div className="space-y-3">
                {stats?.recentOrders?.length ? (
                  stats.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-xs font-medium">#{order.id}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                          </span>
                          {order.paymentMethod && (
                            <span className="text-xs text-gray-500">
                              {PAYMENT_ICONS[order.paymentMethod] || "💰"}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate">
                          {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
                        </p>
                      </div>
                      <span className="text-amber-400 font-bold text-xs flex-shrink-0">
                        ${order.total.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">Sin pedidos en este período</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}