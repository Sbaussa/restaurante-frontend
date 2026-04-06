import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOrders } from "../hooks/useData";
import api from "../utils/api";
import { printReceipt } from "../utils/printReceipt";

const STATUS_LABELS = {
  PENDING:   { label: "Pendiente",  color: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
  PREPARING: { label: "Preparando", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  READY:     { label: "Listo",      color: "text-green-400 bg-green-900/30 border-green-800" },
  DELIVERED: { label: "Entregado",  color: "text-gray-400 bg-gray-800 border-gray-700" },
  CANCELLED: { label: "Cancelado",  color: "text-red-400 bg-red-900/30 border-red-800" },
};

const NEXT_STATUS = {
  PENDING:   "PREPARING",
  PREPARING: "READY",
  READY:     "DELIVERED",
};

const TODAY = new Date().toISOString().split("T")[0];

export default function OrdersPage() {
  const location = useLocation();
  const [refreshToken] = useState(() => location.state?.refresh ? Date.now() : null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(TODAY);
  const [updating, setUpdating] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const filter = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFilter   ? { date: dateFilter }     : {}),
    ...(refreshToken ? { _t: refreshToken }     : {}),
  };

  const { data: orders, loading, error, refetch } = useOrders(filter);

  const advanceStatus = async (orderId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: next });
      refetch();
    } catch {
      alert("Error al actualizar el estado");
    } finally {
      setUpdating(null);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm(`¿Cancelar el pedido #${orderId}?`)) return;
    setCancelling(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: "CANCELLED" });
      refetch();
    } catch {
      alert("Error al cancelar el pedido");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Pedidos</h2>
          <p className="text-gray-500 text-sm mt-1">{orders?.length || 0} pedidos encontrados</p>
        </div>
        <Link
          to="/orders/new"
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors text-sm"
        >
          + Nuevo
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        {/* Estados */}
        <div className="flex gap-1.5 flex-wrap">
          {[null, "PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-amber-500 text-gray-900"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s ? STATUS_LABELS[s].label : "Todos"}
            </button>
          ))}
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          {dateFilter !== TODAY && (
            <button onClick={() => setDateFilter(TODAY)} className="text-xs text-amber-500 hover:text-amber-400">
              Hoy
            </button>
          )}
          <button
            onClick={() => setDateFilter("")}
            className={`text-xs transition-colors ${!dateFilter ? "text-amber-400" : "text-gray-500 hover:text-white"}`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando pedidos...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="space-y-3">
          {orders?.map((order) => {
            const st = STATUS_LABELS[order.status];
            const canAdvance = !!NEXT_STATUS[order.status];
            const canCancel  = ["PENDING", "PREPARING"].includes(order.status);

            return (
              <div
                key={order.id}
                className={`bg-gray-900 border rounded-xl p-4 ${
                  order.status === "CANCELLED" ? "opacity-50 border-gray-800" : "border-gray-800"
                }`}
              >
                {/* Fila superior */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">Pedido #{order.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    {order.tableNumber && (
                      <span className="text-xs text-gray-500">Mesa {order.tableNumber}</span>
                    )}
                  </div>
                  <p className="text-amber-400 font-bold text-base flex-shrink-0">
                    ${order.total.toLocaleString()}
                  </p>
                </div>

                {/* Items */}
                <p className="text-gray-500 text-xs mb-1 line-clamp-2">
                  {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  {new Date(order.createdAt).toLocaleTimeString("es-CO")} · {order.user?.name}
                </p>

                {/* Botones */}
                <div className="flex gap-2 flex-wrap">
                  {canAdvance && (
                    <button
                      onClick={() => advanceStatus(order.id, order.status)}
                      disabled={updating === order.id}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {updating === order.id ? "..." : `→ ${STATUS_LABELS[NEXT_STATUS[order.status]].label}`}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      disabled={cancelling === order.id}
                      className="bg-red-900/20 hover:bg-red-900/40 border border-red-900 text-red-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {cancelling === order.id ? "..." : "Cancelar"}
                    </button>
                  )}
                  {order.status !== "CANCELLED" && (
                    <button
                      onClick={() => printReceipt(order)}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                      title="Imprimir factura"
                    >
                      🖨️
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {orders?.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">🧾</p>
              <p>No hay pedidos con este filtro</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}