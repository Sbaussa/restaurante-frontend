import { useState } from "react";
import { useCategories } from "../hooks/useData";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { data: categories, loading, refetch } = useCategories();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const openCreate = () => { setName(""); setSelected(null); setModal("create"); };
  const openEdit = (cat) => { setSelected(cat); setName(cat.name); setModal("edit"); };
  const openDelete = (cat) => { setSelected(cat); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); setName(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "edit") await api.put(`/categories/${selected.id}`, { name });
      else await api.post("/categories", { name });
      closeModal(); refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/categories/${selected.id}`);
      closeModal(); refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Categorías</h2>
          <p className="text-gray-500 text-sm mt-1">{categories?.length || 0} categorías en total</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-sm">
            + Nueva
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando categorías...</p>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 text-gray-500 font-medium">Nombre</th>
                  <th className="text-right p-4 text-gray-500 font-medium">Productos</th>
                  {isAdmin && <th className="p-4 text-right text-gray-500 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {categories?.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-800 last:border-0">
                    <td className="p-4 text-white font-medium">{cat.name}</td>
                    <td className="p-4 text-right text-gray-400">
                      <span className="bg-gray-800 px-2 py-0.5 rounded-full text-xs">{cat._count?.products ?? 0} productos</span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => openEdit(cat)} className="text-xs text-gray-500 hover:text-amber-400">Editar</button>
                          <button onClick={() => openDelete(cat)} className="text-xs text-gray-500 hover:text-red-400">Eliminar</button>
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
            {categories?.map((cat) => (
              <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{cat.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{cat._count?.products ?? 0} productos</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(cat)} className="text-xs text-gray-500 hover:text-amber-400">Editar</button>
                    <button onClick={() => openDelete(cat)} className="text-xs text-gray-500 hover:text-red-400">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? `Editando: ${selected.name}` : "Nueva categoría"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Ej: Bebidas" autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-lg text-sm">
                {saving ? "Guardando..." : modal === "edit" ? "Guardar" : "Crear"}
              </button>
              <button type="button" onClick={closeModal}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "delete" && (
        <Modal title="Eliminar categoría" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              ¿Eliminar <span className="text-white font-semibold">"{selected?.name}"</span>?
            </p>
            {selected?._count?.products > 0 && (
              <div className="bg-red-900/20 border border-red-900 rounded-lg px-4 py-3 text-red-400 text-xs">
                ⚠ Tiene {selected._count.products} producto(s) asociado(s). Debes reasignarlos primero.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={saving || selected?._count?.products > 0}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-lg text-sm">
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