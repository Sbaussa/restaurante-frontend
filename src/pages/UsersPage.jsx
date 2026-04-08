import { useState } from "react";
import { useUsers } from "../hooks/useData";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const ROLES = ["ADMIN", "CASHIER", "KITCHEN", "MESERO"];

const ROLE_LABELS = {
  ADMIN:   { label: "Admin",  color: "text-amber-400 bg-amber-900/30 border-amber-800" },
  CASHIER: { label: "Cajero", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  KITCHEN: { label: "Cocina", color: "text-green-400 bg-green-900/30 border-green-800" },
  MESERO:  { label: "Mesero", color: "text-purple-400 bg-purple-900/30 border-purple-800" },
};

const EMPTY_FORM = { name: "", email: "", password: "", role: "MESERO" };

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

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data: users, loading, refetch } = useUsers();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500";

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setModal("create"); };
  const openEdit   = (u) => { setSelected(u); setForm({ name: u.name, email: u.email, password: "", role: u.role }); setModal("edit"); };
  const openDelete = (u) => { setSelected(u); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "edit") {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/auth/users/${selected.id}`, payload);
      } else {
        await api.post("/auth/users", form);
      }
      closeModal(); refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/auth/users/${selected.id}`);
      closeModal(); refetch();
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Usuarios</h2>
          <p className="text-gray-500 text-sm mt-1">{users?.length || 0} usuarios registrados</p>
        </div>
        <button onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-sm">
          + Nuevo
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando usuarios...</p>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 text-gray-500 font-medium">Nombre</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Email</th>
                  <th className="text-center p-4 text-gray-500 font-medium">Rol</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Creado</th>
                  <th className="p-4 text-right text-gray-500 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-800 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">
                          {u.name} {u.id === me?.id && <span className="text-xs text-gray-600">(tú)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{u.email}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${ROLE_LABELS[u.role]?.color || "text-gray-400 bg-gray-800 border-gray-700"}`}>
                        {ROLE_LABELS[u.role]?.label || u.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString("es-CO")}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEdit(u)} className="text-xs text-gray-500 hover:text-amber-400">Editar</button>
                        <button onClick={() => openDelete(u)} disabled={u.id === me?.id}
                          className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <div className="md:hidden space-y-2">
            {users?.map((u) => (
              <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-800 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {u.name} {u.id === me?.id && <span className="text-xs text-gray-600">(tú)</span>}
                      </p>
                      <p className="text-gray-500 text-xs truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${ROLE_LABELS[u.role]?.color || "text-gray-400 bg-gray-800 border-gray-700"}`}>
                    {ROLE_LABELS[u.role]?.label || u.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 text-xs">{new Date(u.createdAt).toLocaleDateString("es-CO")}</p>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(u)} className="text-xs text-gray-500 hover:text-amber-400">Editar</button>
                    <button onClick={() => openDelete(u)} disabled={u.id === me?.id}
                      className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-30">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal crear/editar */}
      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? `Editando: ${selected.name}` : "Nuevo usuario"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="Ej: Juan Pérez" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                required type="email" placeholder="juan@baraton.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {modal === "edit" ? "Nueva contraseña (vacío para no cambiar)" : "Contraseña"}
              </label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                type="password" required={modal === "create"} placeholder="••••••••" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClass + " cursor-pointer"}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]?.label || r}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-lg text-sm">
                {saving ? "Guardando..." : modal === "edit" ? "Guardar cambios" : "Crear usuario"}
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
        <Modal title="Eliminar usuario" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              ¿Eliminar a <span className="text-white font-semibold">"{selected?.name}"</span>? Esta acción no se puede deshacer.
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