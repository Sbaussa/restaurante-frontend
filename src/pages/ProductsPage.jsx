import { useState } from "react";
import { useProducts, useCategories } from "../hooks/useData";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = { name: "", price: "", stock: "", categoryId: "", imageUrl: "" };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { data: products, loading, refetch } = useProducts();
  const { data: categories } = useCategories();
  const [modal, setModal] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500";

  const openCreate = () => { setForm(EMPTY_FORM); setEditingProduct(null); setModal("create"); };
  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({ name: p.name, price: p.price, stock: p.stock, categoryId: p.categoryId, imageUrl: p.imageUrl || "" });
    setModal("edit");
  };
  const openDelete = (p) => { setDeletingProduct(p); setModal("delete"); };
  const closeModal = () => { setModal(null); setEditingProduct(null); setDeletingProduct(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "edit") {
        await api.put(`/products/${editingProduct.id}`, {
          ...form, price: Number(form.price), stock: Number(form.stock),
          categoryId: Number(form.categoryId), available: editingProduct.available,
        });
      } else {
        await api.post("/products", { ...form, categoryId: Number(form.categoryId) });
      }
      closeModal(); refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar producto");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/products/${deletingProduct.id}`);
      closeModal(); refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar");
    } finally { setSaving(false); }
  };

  const toggleAvailable = async (product) => {
    try {
      await api.put(`/products/${product.id}`, { ...product, available: !product.available });
      refetch();
    } catch { alert("Error al actualizar producto"); }
  };

  const grouped = products?.reduce((acc, p) => {
    const cat = p.category?.name || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {}) || {};

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Productos</h2>
          <p className="text-gray-500 text-sm mt-1">{products?.length || 0} productos en total</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors text-sm">
            + Nuevo
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando productos...</p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6 md:mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              {category}
              <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full text-xs font-normal">{items.length}</span>
            </h3>

            {/* Desktop: tabla */}
            <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-gray-500 font-medium">Producto</th>
                    <th className="text-right p-4 text-gray-500 font-medium">Precio</th>
                    <th className="text-right p-4 text-gray-500 font-medium">Stock</th>
                    <th className="text-center p-4 text-gray-500 font-medium">Estado</th>
                    {isAdmin && <th className="p-4 text-right text-gray-500 font-medium">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product.id} className="border-b border-gray-800 last:border-0">
                      <td className="p-4 text-white font-medium">{product.name}</td>
                      <td className="p-4 text-right text-amber-400 font-bold">${product.price.toLocaleString()}</td>
                      <td className="p-4 text-right text-gray-400">
                        <span className={product.stock < 10 ? "text-red-400" : ""}>{product.stock}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleAvailable(product)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border hover:opacity-70 ${
                            product.available
                              ? "bg-green-900/30 text-green-400 border-green-800"
                              : "bg-gray-800 text-gray-500 border-gray-700"
                          }`}>
                          {product.available ? "Disponible" : "Agotado"}
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openEdit(product)} className="text-xs text-gray-500 hover:text-amber-400">Editar</button>
                            <button onClick={() => openDelete(product)} className="text-xs text-gray-500 hover:text-red-400">Eliminar</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas */}
            <div className="md:hidden space-y-2">
              {items.map((product) => (
                <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-white font-medium text-sm">{product.name}</p>
                    <p className="text-amber-400 font-bold text-sm flex-shrink-0">${product.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${product.stock < 10 ? "text-red-400" : "text-gray-500"}`}>
                        Stock: {product.stock}
                      </span>
                      <button onClick={() => toggleAvailable(product)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          product.available
                            ? "bg-green-900/30 text-green-400 border-green-800"
                            : "bg-gray-800 text-gray-500 border-gray-700"
                        }`}>
                        {product.available ? "Disponible" : "Agotado"}
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(product)} className="text-xs text-gray-500 hover:text-amber-400">Editar</button>
                        <button onClick={() => openDelete(product)} className="text-xs text-gray-500 hover:text-red-400">Eliminar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal crear/editar */}
      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? `Editando: ${editingProduct.name}` : "Nuevo producto"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="Ej: Perro Sencillo" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio</label>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required type="number" placeholder="7000" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stock</label>
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  required type="number" placeholder="100" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required className={inputClass + " cursor-pointer"}>
                <option value="" disabled>Selecciona una categoría</option>
                {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-lg text-sm">
                {saving ? "Guardando..." : modal === "edit" ? "Guardar cambios" : "Crear producto"}
              </button>
              <button type="button" onClick={closeModal}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal eliminar */}
      {modal === "delete" && (
        <Modal title="Eliminar producto" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              ¿Eliminar <span className="text-white font-semibold">"{deletingProduct?.name}"</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm">
                {saving ? "Eliminando..." : "Sí, eliminar"}
              </button>
              <button onClick={closeModal}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}