import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../hooks/useData";
import { socket } from "../utils/socket";

const STATUS_CONFIG = {
  free:     { label: "Libre",    bg: "bg-gray-900",      border: "border-gray-700",  text: "text-gray-500" },
  occupied: { label: "Ocupada",  bg: "bg-amber-900/20",  border: "border-amber-600", text: "text-amber-400" },
  ready:    { label: "Listo",    bg: "bg-green-900/20",  border: "border-green-600", text: "text-green-400" },
};

function TableCard({ table, onClick }) {
  const cfg = STATUS_CONFIG[table.status];
  const order = table.order;

  return (
    <button
      onClick={() => onClick(table)}
      className={`${cfg.bg} border-2 ${cfg.border} rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-bold text-xl">Mesa {table.number}</p>
          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
        </div>
        {table.status === "ready" && (
          <span className="text-xl animate-bounce">🔔</span>
        )}
        {table.status === "occupied" && (
          <span className="text-xl">🍽️</span>
        )}
        {table.status === "free" && (
          <span className="text-xl">✅</span>
        )}
      </div>

      {order && (
        <div>
          <p className="text-xs text-gray-500 mb-1 line-clamp-2">
            {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
          </p>
          <p className="text-amber-400 font-bold text-sm">${order.total.toLocaleString()}</p>
        </div>
      )}
    </button>
  );
}

function OrderModal({ table, onClose }) {
  const navigate = useNavigate();
  const order = table.order;

  const STATUS_LABELS = {
    PENDING:   { label: "Pendiente",  color: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
    PREPARING: { label: "Preparando", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
    READY:     { label: "Listo",      color: "text-green-400 bg-green-900/30 border-green-800" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold text-lg">Mesa {table.number}</h3>
            {order && (
              <p className="text-gray-500 text-xs mt-0.5">Pedido #{order.id}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6">
          {!order ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-4">Mesa libre</p>
              <button
                onClick={() => { onClose(); navigate("/orders/new"); }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-3 rounded-xl"
              >
                + Nuevo pedido
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_LABELS[order.status]?.color}`}>
                  {STATUS_LABELS[order.status]?.label}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(order.createdAt).toLocaleTimeString("es-CO")}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-white text-sm">{item.quantity}x {item.product.name}</span>
                    <span className="text-gray-400 text-sm">${(item.unitPrice * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-3 flex justify-between items-center mb-4">
                <span className="text-gray-400">Total</span>
                <span className="text-amber-400 font-bold text-lg">${order.total.toLocaleString()}</span>
              </div>

              <button
                onClick={() => { onClose(); navigate("/orders"); }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl text-sm"
              >
                Ver en pedidos →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TablesPage() {
  const { data: tables, loading, refetch } = useFetch("/tables");
  const [selected, setSelected] = useState(null);

  // Escucha eventos de socket para actualizar en tiempo real
  useEffect(() => {
    socket.connect();

    socket.on("order:new",     () => refetch());
    socket.on("order:updated", () => refetch());

    return () => {
      socket.off("order:new");
      socket.off("order:updated");
      socket.disconnect();
    };
  }, []);

  const free     = tables?.filter((t) => t.status === "free").length || 0;
  const occupied = tables?.filter((t) => t.status === "occupied").length || 0;
  const ready    = tables?.filter((t) => t.status === "ready").length || 0;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Mesas</h2>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-gray-500">✅ {free} libres</span>
            <span className="text-xs text-amber-400">🍽️ {occupied} ocupadas</span>
            <span className="text-xs text-green-400">🔔 {ready} listas</span>
          </div>
        </div>
        <button onClick={refetch}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm">
          ↻ Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando mesas...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tables?.map((table) => (
            <TableCard key={table.number} table={table} onClick={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <OrderModal table={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}