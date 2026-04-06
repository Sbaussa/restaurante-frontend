import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../hooks/useData";
import { socket } from "../utils/socket";
import api from "../utils/api";

const STATUS_LABELS = {
  PENDING:   { label: "Pendiente",  color: "border-yellow-600 bg-yellow-900/10" },
  PREPARING: { label: "Preparando", color: "border-blue-600 bg-blue-900/10" },
};

export default function KitchenPage() {
  const navigate = useNavigate();
  const { data: orders,    loading, refetch }          = useOrders({ status: "PENDING" });
  const { data: preparing, refetch: refetchPreparing } = useOrders({ status: "PREPARING" });

  const audioCtxRef    = useRef(null);
  const audioUnlocked  = useRef(false);
  const [soundReady, setSoundReady] = useState(false);

  // Desbloquea audio en primer toque
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      audioCtxRef.current.resume().then(() => {
        audioUnlocked.current = true;
        setSoundReady(true);
      });
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click",      unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click",      unlock);
    };
  }, []);

  // Socket + auto-refresh
  useEffect(() => {
    const id = setInterval(() => {
      refetch();
      refetchPreparing();
    }, 20000);

    socket.connect();
    socket.on("order:new", () => {
      refetch();
      refetchPreparing();
      playAlert();
    });
    socket.on("order:updated", () => {
      refetch();
      refetchPreparing();
    });

    return () => {
      clearInterval(id);
      socket.off("order:new");
      socket.off("order:updated");
      socket.disconnect();
    };
  }, []);

  const playAlert = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      ctx.resume().then(() => {
        // Tono 1
        const osc1  = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.value = 880;
        gain1.gain.setValueAtTime(0.4, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);

        // Tono 2
        const osc2  = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
        osc2.start(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.65);
      });
    } catch {}
  };

  const activateSound = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioCtxRef.current.resume().then(() => {
      audioUnlocked.current = true;
      setSoundReady(true);
      playAlert();
    });
  };

  const advance = async (orderId, nextStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      refetch();
      refetchPreparing();
    } catch {
      alert("Error al actualizar");
    }
  };

  const allOrders = [
    ...(orders    || []).map((o) => ({ ...o, status: "PENDING" })),
    ...(preparing || []).map((o) => ({ ...o, status: "PREPARING" })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">🍳 Vista Cocina</h1>
            <p className="text-gray-500 text-sm mt-1">
              {allOrders.length} pedido{allOrders.length !== 1 ? "s" : ""} activo{allOrders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetch(); refetchPreparing(); }}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm"
          >
            <span>↻</span> Actualizar
          </button>
        </div>
      </div>

      {/* Pedidos */}
      {loading ? (
        <p className="text-gray-500 animate-pulse text-center py-20">Cargando pedidos...</p>
      ) : allOrders.length === 0 ? (
        <div className="text-center py-32 text-gray-600">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-xl font-medium text-gray-500">Sin pedidos pendientes</p>
          <p className="text-sm mt-1">Todo al día</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allOrders.map((order) => {
            const st = STATUS_LABELS[order.status];
            const isPending = order.status === "PENDING";
            const minutesAgo = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);

            return (
              <div key={order.id} className={`border-2 rounded-2xl p-5 flex flex-col gap-4 ${st.color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold text-xl">#{order.id}</p>
                    {order.tableNumber ? (
                      <p className="text-gray-400 text-sm">Mesa {order.tableNumber}</p>
                    ) : (
                      <p className="text-gray-500 text-sm">Para llevar</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isPending
                        ? "bg-yellow-900/50 text-yellow-400"
                        : "bg-blue-900/50 text-blue-400"
                    }`}>
                      {st.label}
                    </span>
                    <p className={`text-xs mt-1 ${minutesAgo >= 15 ? "text-red-400 font-bold" : "text-gray-600"}`}>
                      {minutesAgo === 0 ? "Ahora" : `hace ${minutesAgo} min`}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1.5 flex-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <span className="bg-gray-800 text-amber-400 font-bold text-xs w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-white text-sm">{item.product.name}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => advance(order.id, isPending ? "PREPARING" : "READY")}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    isPending
                      ? "bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                      : "bg-green-600 hover:bg-green-500 text-white"
                  }`}
                >
                  {isPending ? "▶ Empezar a preparar" : "✓ Marcar como listo"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón activar sonido — solo aparece si no está activado */}
      {!soundReady && (
        <button
          onClick={activateSound}
          className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 animate-pulse"
        >
          🔔 Activar sonido
        </button>
      )}
    </div>
  );
}