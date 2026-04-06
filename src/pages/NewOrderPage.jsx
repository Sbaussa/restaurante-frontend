import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProducts } from "../hooks/useData";
import api from "../utils/api";

// ── CartPanel como componente externo para evitar re-renders ──
function CartPanel({
  tableNumber, setTableNumber,
  notes, setNotes,
  cartItems, total,
  addToCart, removeFromCart,
  submitting, handleSubmit,
}) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">Resumen del pedido</h3>

      {/* Mesa */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Número de mesa (opcional)</label>
        <input
          type="number" value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="Para llevar si está vacío"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Notas */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Notas para cocina (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: sin cebolla, bien cocido..."
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 mb-4 min-h-[80px] overflow-y-auto">
        {cartItems.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Selecciona productos</p>
        ) : (
          cartItems.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{product.name}</p>
                <p className="text-gray-500 text-xs">${(product.price * quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => removeFromCart(product.id)}
                  className="w-6 h-6 rounded bg-gray-800 text-white text-xs hover:bg-gray-700">−</button>
                <span className="text-white text-sm w-4 text-center">{quantity}</span>
                <button onClick={() => addToCart(product.id)}
                  className="w-6 h-6 rounded bg-gray-800 text-white text-xs hover:bg-gray-700">+</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total */}
      <div className="border-t border-gray-800 pt-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Total</span>
          <span className="text-amber-400 font-bold text-xl">${total.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !cartItems.length}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-900 font-bold py-3 rounded-xl transition-colors"
      >
        {submitting ? "Enviando..." : "Confirmar pedido"}
      </button>
    </div>
  );
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: products, loading } = useProducts({ available: true });
  const [cart, setCart] = useState({});
  const [tableNumber, setTableNumber] = useState(searchParams.get("table") || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = (productId) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) next[productId]--;
      else delete next[productId];
      return next;
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const product = products?.find((p) => p.id === Number(id));
    return { product, quantity: qty };
  }).filter((i) => i.product);

  const total = cartItems.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity, 0
  );

  const totalItems = cartItems.reduce((sum, { quantity }) => sum + quantity, 0);

  const handleSubmit = async () => {
    if (!cartItems.length) return alert("Agrega al menos un producto");
    setSubmitting(true);
    try {
      await api.post("/orders", {
        tableNumber: tableNumber ? Number(tableNumber) : null,
        notes: notes || null,
        items: cartItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      });
      navigate("/orders", { state: { refresh: true } });
    } catch (err) {
      alert(err.response?.data?.message || "Error al crear pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = useMemo(() => {
    const cats = products?.map((p) => p.category?.name || "Sin categoría") || [];
    return ["Todas", ...Array.from(new Set(cats))];
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat    = activeCategory === "Todas" || (p.category?.name || "Sin categoría") === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, p) => {
      const cat = p.category?.name || "Sin categoría";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [filtered]);

  const cartPanelProps = {
    tableNumber, setTableNumber,
    notes, setNotes,
    cartItems, total,
    addToCart, removeFromCart,
    submitting, handleSubmit,
  };

  return (
    <div className="h-full flex flex-col md:flex-row md:gap-6 md:p-8">

      {/* ── Productos ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-0">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">Nuevo Pedido</h2>
          {tableNumber && (
            <span className="bg-amber-500/20 border border-amber-600 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
              Mesa {tableNumber}
            </span>
          )}
        </div>

        {/* Búsqueda + categorías */}
        <div className="mb-4 md:mb-6 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-amber-500 text-gray-900"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 animate-pulse">Cargando productos...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">No se encontraron productos</p>
            <button onClick={() => { setSearch(""); setActiveCategory("Todas"); }}
              className="mt-2 text-xs text-amber-500 underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-6 md:mb-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{category}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {items.map((product) => {
                  const qty = cart[product.id] || 0;
                  return (
                    <button key={product.id} onClick={() => addToCart(product.id)}
                      className={`relative text-left p-3 md:p-4 rounded-xl border transition-all ${
                        qty > 0
                          ? "bg-amber-900/20 border-amber-600"
                          : "bg-gray-900 border-gray-800 hover:border-gray-600"
                      }`}
                    >
                      {qty > 0 && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {qty}
                        </span>
                      )}
                      <p className="text-white font-medium text-xs md:text-sm pr-6">{product.name}</p>
                      <p className="text-amber-400 font-bold mt-1 text-sm">${product.price.toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="h-24 md:hidden" />
      </div>

      {/* ── Carrito desktop ── */}
      <div className="hidden md:block w-80 bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit sticky top-0">
        <CartPanel {...cartPanelProps} />
      </div>

      {/* ── Botón flotante móvil ── */}
      {totalItems > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-gray-900 font-bold px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-40"
        >
          <span className="bg-gray-900 text-amber-400 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
          Ver carrito · ${total.toLocaleString()}
        </button>
      )}

      {/* ── Drawer carrito móvil ── */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative bg-gray-900 border-t border-gray-800 rounded-t-2xl w-full p-6 max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Carrito</h3>
              <button onClick={() => setCartOpen(false)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            <CartPanel {...cartPanelProps} />
          </div>
        </div>
      )}
    </div>
  );
}