import { useState, useEffect, useMemo, useRef } from "react";
import {
  Pencil, X, Printer, ChefHat, DollarSign,
  Search, User, FileText, SlidersHorizontal,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useOrders, useProducts } from "../hooks/useData";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { printReceipt, printKitchenTicket } from "../utils/printReceipt";
import qrTransferencia from "/public/nequibaraton.png";
import { socket } from "../utils/socket";

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

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString().split("T")[0];

const ORDER_TYPE_LABELS = {
  MESA:      { label: "Mesa",      icon: "🍽️",  color: "text-purple-400 bg-purple-900/30 border-purple-800" },
  DOMICILIO: { label: "Domicilio", icon: "🛵",   color: "text-orange-400 bg-orange-900/30 border-orange-800" },
  LLEVAR:    { label: "Llevar",    icon: "📦",   color: "text-cyan-400 bg-cyan-900/30 border-cyan-800" },
};

const TRANSFER_INFO = {
  qrImage: qrTransferencia,
  banco:   "Nequi",
  tipo:    "Ahorros",
  numero:  "311 2397748",
  nombre:  "Claudia Márquez Jiménez",
};

// ── Highlight matching text ───────────────────────────────
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {String(text).slice(0, idx)}
      <mark className="bg-amber-400/30 text-amber-300 rounded px-0.5">
        {String(text).slice(idx, idx + query.length)}
      </mark>
      {String(text).slice(idx + query.length)}
    </>
  );
}

function EditOrderModal({ order, onClose, onSaved }) {
  const { data: products, loading } = useProducts({ available: true });
  const [cart, setCart] = useState(() => {
    const c = {};
    order.items.forEach((i) => { c[i.product.id] = i.quantity; });
    return c;
  });
  const [notes, setNotes]   = useState(order.notes || "");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const product = products?.find((p) => p.id === Number(id));
    return { product, quantity: qty };
  }).filter((i) => i.product);

  const total = cartItems.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);

  const add    = (id) => setCart((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const remove = (id) => setCart((p) => {
    const n = { ...p };
    if (n[id] > 1) n[id]--;
    else delete n[id];
    return n;
  });

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleSave = async () => {
    if (!cartItems.length) return alert("Agrega al menos un producto");
    setSaving(true);
    try {
      await api.patch(`/orders/${order.id}`, {
        notes: notes || null,
        items: cartItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold">Editar Pedido #{order.id}</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              {order.tableNumber ? `Mesa ${order.tableNumber}` : "Para llevar"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas para cocina</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Sin cebolla, bien cocido..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {cartItems.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Productos en el pedido</label>
              <div className="space-y-2">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-white text-sm truncate flex-1">{product.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => remove(product.id)}
                        className="w-6 h-6 rounded bg-gray-700 text-white text-xs hover:bg-gray-600">−</button>
                      <span className="text-white text-sm w-4 text-center">{quantity}</span>
                      <button onClick={() => add(product.id)}
                        className="w-6 h-6 rounded bg-gray-700 text-white text-xs hover:bg-gray-600">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-2">Agregar productos</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 mb-2"
            />
            {loading ? (
              <p className="text-gray-600 text-sm">Cargando...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {filtered.map((product) => (
                  <button key={product.id} onClick={() => add(product.id)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      cart[product.id]
                        ? "bg-amber-900/20 border-amber-600"
                        : "bg-gray-800 border-gray-700 hover:border-gray-600"
                    }`}>
                    <p className="text-white font-medium truncate">{product.name}</p>
                    <p className="text-amber-400">${product.price.toLocaleString()}</p>
                    {cart[product.id] && (
                      <p className="text-amber-300 text-xs">En carrito: {cart[product.id]}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400 text-sm">Total</span>
            <span className="text-amber-400 font-bold text-lg">${total.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !cartItems.length}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-900 font-bold py-2.5 rounded-xl text-sm">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button onClick={onClose}
              className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ order, onConfirm, onClose }) {
  const [method, setMethod]       = useState(null);
  const [cashGiven, setCashGiven] = useState("");
  // Pago mixto
  const [mixCash, setMixCash]     = useState("");
  const [mixTransfer, setMixTransfer] = useState("");

  const mixCashNum     = Number(mixCash) || 0;
  const mixTransferNum = Number(mixTransfer) || 0;
  const mixTotal       = mixCashNum + mixTransferNum;
  const mixOk          = method === "MIXTO" && mixCashNum > 0 && mixTransferNum > 0 && mixTotal === order.total;
  const mixChange      = mixCashNum > 0 && mixTotal > order.total ? mixTotal - order.total : 0;

  const canConfirm = method && (
    method === "TRANSFERENCIA" ||
    method === "TARJETA" ||
    (method === "EFECTIVO" && cashGiven && Number(cashGiven) >= order.total) ||
    mixOk ||
    (method === "MIXTO" && mixCashNum > 0 && mixTransferNum > 0 && mixTotal >= order.total)
  );

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (method === "MIXTO") {
      onConfirm({
        method:      "MIXTO",
        cashGiven:   mixCashNum,
        transfer:    mixTransferNum,
        change:      mixTotal > order.total ? mixTotal - order.total : 0,
      });
    } else {
      onConfirm({
        method,
        cashGiven: method === "EFECTIVO" ? Number(cashGiven) : null,
        change:    method === "EFECTIVO" ? Number(cashGiven) - order.total : null,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold">Método de pago</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              Pedido #{order.id} · ${order.total.toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Métodos de pago */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "EFECTIVO",      icon: "💵", label: "Efectivo" },
              { key: "TRANSFERENCIA", icon: "📲", label: "Transferencia" },
              { key: "TARJETA",       icon: "💳", label: "Tarjeta" },
              { key: "MIXTO",         icon: "🔀", label: "Mixto" },
            ].map(({ key, icon, label }) => (
              <button key={key}
                onClick={() => { setMethod(key); setCashGiven(""); setMixCash(""); setMixTransfer(""); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  method === key
                    ? "bg-amber-500/20 border-amber-500 text-amber-400"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}>
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* EFECTIVO */}
          {method === "EFECTIVO" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">¿Cuánto entregó el cliente?</label>
                <input type="number" value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder={`Mínimo $${order.total.toLocaleString()}`}
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              {cashGiven && Number(cashGiven) >= order.total && (
                <div className="bg-green-900/20 border border-green-800 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">Cambio</span>
                  <span className="text-green-400 font-bold text-lg">
                    ${(Number(cashGiven) - order.total).toLocaleString()}
                  </span>
                </div>
              )}
              {cashGiven && Number(cashGiven) < order.total && (
                <div className="bg-red-900/20 border border-red-900 rounded-lg px-4 py-3">
                  <span className="text-red-400 text-sm">Monto insuficiente</span>
                </div>
              )}
            </div>
          )}

          {/* TRANSFERENCIA */}
          {method === "TRANSFERENCIA" && (
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-800 px-4 py-2.5 border-b border-gray-700">
                <p className="text-xs text-gray-400 font-medium">Datos para transferir</p>
              </div>
              <div className="p-4 flex flex-col items-center gap-3">
                {TRANSFER_INFO.qrImage && (
                  <div className="bg-white rounded-lg p-2">
                    <img src={TRANSFER_INFO.qrImage} alt="QR de transferencia"
                      className="w-48 h-48 object-contain"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="w-full text-xs text-gray-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Banco</span>
                    <span className="text-white font-medium">{TRANSFER_INFO.banco}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo de cuenta</span>
                    <span className="text-white font-medium">{TRANSFER_INFO.tipo}</span>
                  </div>
                  {TRANSFER_INFO.numero && (
                    <div className="flex justify-between">
                      <span>Número</span>
                      <span className="text-white font-medium">{TRANSFER_INFO.numero}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>A nombre de</span>
                    <span className="text-white font-medium">{TRANSFER_INFO.nombre}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MIXTO */}
          {method === "MIXTO" && (
            <div className="space-y-3">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-400 font-medium">
                  Total a pagar: <span className="text-amber-400 font-bold">${order.total.toLocaleString()}</span>
                </p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">💵 Parte en efectivo</label>
                  <input type="number" value={mixCash}
                    onChange={(e) => {
                      setMixCash(e.target.value);
                      const cash = Number(e.target.value) || 0;
                      const remaining = order.total - cash;
                      if (remaining >= 0) setMixTransfer(String(remaining));
                    }}
                    placeholder="$0"
                    autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">📲 Parte por transferencia</label>
                  <input type="number" value={mixTransfer}
                    onChange={(e) => setMixTransfer(e.target.value)}
                    placeholder="$0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Resumen */}
                {(mixCashNum > 0 || mixTransferNum > 0) && (
                  <div className="border-t border-gray-700 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Efectivo</span>
                      <span className="text-white">${mixCashNum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Transferencia</span>
                      <span className="text-white">${mixTransferNum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400">Total recibido</span>
                      <span className={mixTotal >= order.total ? "text-green-400" : "text-red-400"}>
                        ${mixTotal.toLocaleString()}
                      </span>
                    </div>
                    {mixTotal > order.total && (
                      <div className="bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 flex justify-between">
                        <span className="text-green-400 text-xs font-medium">Cambio</span>
                        <span className="text-green-400 font-bold text-sm">
                          ${(mixTotal - order.total).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {mixTotal > 0 && mixTotal < order.total && (
                      <div className="bg-red-900/20 border border-red-900 rounded-lg px-3 py-2">
                        <span className="text-red-400 text-xs">
                          Faltan ${(order.total - mixTotal).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* QR transferencia en mixto */}
              {TRANSFER_INFO.qrImage && (
                <div className="border border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-500">QR para la parte de transferencia</p>
                  <div className="bg-white rounded-lg p-1.5">
                    <img src={TRANSFER_INFO.qrImage} alt="QR"
                      className="w-32 h-32 object-contain"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{TRANSFER_INFO.numero} · {TRANSFER_INFO.banco}</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-900 font-bold py-3 rounded-xl transition-colors">
            Confirmar y entregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────
export default function OrdersPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [refreshToken] = useState(() => location.state?.refresh ? Date.now() : null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateFilter, setDateFilter]     = useState(TODAY);
  const [searchQuery, setSearchQuery]   = useState("");
  const [updating, setUpdating]         = useState(null);
  const [cancelling, setCancelling]     = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [editOrder, setEditOrder]       = useState(null);

  const pendingRefresh = useRef(false);

  useEffect(() => {
    const handleOrderEvent = () => {
      if (paymentOrder || editOrder) {
        pendingRefresh.current = true;
      } else {
        refetch();
      }
    };

    socket.connect();
    socket.on("order:new",     handleOrderEvent);
    socket.on("order:updated", handleOrderEvent);

    return () => {
      socket.off("order:new",     handleOrderEvent);
      socket.off("order:updated", handleOrderEvent);
      socket.disconnect();
    };
  }, [paymentOrder, editOrder]);

  const closePaymentModal = () => {
    setPaymentOrder(null);
    if (pendingRefresh.current) {
      pendingRefresh.current = false;
      refetch();
    }
  };

  const closeEditModal = () => {
    setEditOrder(null);
    if (pendingRefresh.current) {
      pendingRefresh.current = false;
      refetch();
    }
  };

  const filter = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFilter   ? { date: dateFilter }     : {}),
    ...(refreshToken ? { _t: refreshToken }     : {}),
  };

  const { data: orders, loading, error, refetch } = useOrders(filter);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const idMatch    = String(order.id).includes(q.replace("#", ""));
      const tableMatch = order.tableNumber
        ? String(order.tableNumber).toLowerCase().includes(q.replace("mesa", "").trim())
        : false;
      const notesMatch = order.notes
        ? order.notes.toLowerCase().includes(q)
        : false;
      const itemsMatch = order.items.some((i) =>
        i.product.name.toLowerCase().includes(q)
      );
      return idMatch || tableMatch || notesMatch || itemsMatch;
    });
  }, [orders, searchQuery]);

  const advanceStatus = async (orderId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    if (next === "DELIVERED") {
      const order = orders.find((o) => o.id === orderId);
      setPaymentOrder(order);
      return;
    }
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

  const handlePaymentConfirm = async (paymentInfo) => {
    setUpdating(paymentOrder.id);
    try {
      await api.patch(`/orders/${paymentOrder.id}/status`, { status: "DELIVERED" });
      await api.patch(`/orders/${paymentOrder.id}/payment`, {
        paymentMethod: paymentInfo.method,
        cashGiven:     paymentInfo.cashGiven,
        cashChange:    paymentInfo.change,
        transferAmount: paymentInfo.transfer || null,
      });
      pendingRefresh.current = false;
      refetch();
    } catch {
      alert("Error al confirmar el pago");
    } finally {
      setUpdating(null);
      setPaymentOrder(null);
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

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="p-4 md:p-8">
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onConfirm={handlePaymentConfirm}
          onClose={closePaymentModal}
        />
      )}

      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={closeEditModal}
          onSaved={() => {
            pendingRefresh.current = false;
            refetch();
          }}
        />
      )}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Pedidos</h2>
          <p className="text-gray-500 text-sm mt-1">
            {isSearching
              ? `${filteredOrders.length} resultado${filteredOrders.length !== 1 ? "s" : ""} para "${searchQuery}"`
              : `${orders?.length || 0} pedidos encontrados`
            }
          </p>
        </div>
        <Link to="/orders/new"
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors text-sm">
          + Nuevo
        </Link>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por #pedido, mesa, notas o producto..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!searchQuery && (
        <div className="flex gap-2 flex-wrap mb-4">
          {["#1", "Mesa 1", "sin verduras", "sin salsa", "perro"].map((hint) => (
            <button
              key={hint}
              onClick={() => setSearchQuery(hint)}
              className="text-xs text-gray-500 bg-gray-800/60 border border-gray-700 rounded-full px-2.5 py-1 hover:text-amber-400 hover:border-amber-700 transition-colors"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {[null, "PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"].map((s) => (
            <button key={s ?? "all"} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-amber-500 text-gray-900"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}>
              {s ? STATUS_LABELS[s].label : "Todos"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          {dateFilter !== TODAY && (
            <button onClick={() => setDateFilter(TODAY)} className="text-xs text-amber-500 hover:text-amber-400">
              Hoy
            </button>
          )}
          <button onClick={() => setDateFilter("")}
            className={`text-xs transition-colors ${!dateFilter ? "text-amber-400" : "text-gray-500 hover:text-white"}`}>
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
          {filteredOrders.map((order) => {
            const st         = STATUS_LABELS[order.status];
            const canAdvance = !!NEXT_STATUS[order.status];
            const canCancel  = ["PENDING", "PREPARING"].includes(order.status);
            const canEdit    = ["PENDING", "PREPARING", "READY"].includes(order.status);
            const q          = searchQuery.trim();

            return (
              <div key={order.id}
                className={`bg-gray-900 border rounded-xl p-4 transition-all ${
                  order.status === "CANCELLED" ? "opacity-50 border-gray-800" :
                  isSearching ? "border-amber-800/50 shadow-amber-900/20 shadow-sm" : "border-gray-800"
                }`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">
                      Pedido #<Highlight text={String(order.id)} query={q.replace("#", "")} />
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    {order.orderType && ORDER_TYPE_LABELS[order.orderType] && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_TYPE_LABELS[order.orderType].color}`}>
                        {ORDER_TYPE_LABELS[order.orderType].icon} {ORDER_TYPE_LABELS[order.orderType].label}
                        {order.orderType === "MESA" && order.tableNumber ? ` ${order.tableNumber}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-amber-400 font-bold text-base flex-shrink-0">
                    ${order.total.toLocaleString()}
                  </p>
                </div>

                <p className="text-gray-500 text-xs mb-1 line-clamp-2">
                  {order.items.map((i, idx) => (
                    <span key={i.product.id}>
                      {idx > 0 && ", "}
                      {i.quantity}x <Highlight text={i.product.name} query={q} />
                    </span>
                  ))}
                </p>

                {order.notes && (
                  <p className="text-yellow-400/70 text-xs mt-0.5 mb-1 flex items-center gap-1">
                    <FileText size={11} /> <Highlight text={order.notes} query={q} />
                  </p>
                )}

                <p className="text-xs text-gray-600 mb-1">
                  {new Date(order.createdAt).toLocaleTimeString("es-CO")}
                </p>
                {order.user?.name && (
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <User size={11} /> <span className="text-white font-medium">{order.user.name}</span>
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {canAdvance && (
                    <button
                      onClick={() => advanceStatus(order.id, order.status)}
                      disabled={updating === order.id}
                      className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                        NEXT_STATUS[order.status] === "DELIVERED"
                          ? "bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold"
                          : "bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white"
                      }`}>
                      {updating === order.id
                        ? "..."
                        : NEXT_STATUS[order.status] === "DELIVERED"
                        ? <><DollarSign size={13} className="inline mr-1" />Cobrar y entregar</>
                        : `→ ${STATUS_LABELS[NEXT_STATUS[order.status]].label}`}
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={() => setEditOrder(order)}
                      className="bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900 text-blue-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                      className="bg-red-900/20 hover:bg-red-900/40 border border-red-900 text-red-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                      {cancelling === order.id ? "..." : "Cancelar"}
                    </button>
                  )}
                  {order.status !== "CANCELLED" && (
                    <>
                      <button
                        onClick={() => printKitchenTicket(order)}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                        title="Imprimir ticket cocina">
                        <ChefHat size={14} />
                      </button>
                      <button
                        onClick={() => printReceipt({
                          ...order,
                          payment: order.paymentMethod ? {
                            method:    order.paymentMethod,
                            cashGiven: order.cashGiven,
                            change:    order.cashChange,
                          } : null,
                        })}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                        title="Imprimir factura">
                        <Printer size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-600">
              {isSearching ? (
                <>
                  <div className="text-4xl mb-3 flex justify-center"><Search size={40} className="text-gray-600" /></div>
                  <p className="text-gray-500">Sin resultados para <span className="text-amber-400">"{searchQuery}"</span></p>
                  <p className="text-xs mt-2 text-gray-600">Prueba con el número de pedido, mesa o una nota</p>
                  <button onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs text-amber-500 hover:text-amber-400">
                    Limpiar búsqueda
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3 flex justify-center"><FileText size={40} className="text-gray-600" /></div>
                  <p>No hay pedidos con este filtro!</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}