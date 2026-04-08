import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import NotificationPrompt from "../NotificationPrompt";
import { socket } from "../../utils/socket";
import { playAlertSoundDirect } from "../../utils/pushNotifications";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: "/dashboard",  icon: "📊", label: "Dashboard",   roles: ["ADMIN", "CASHIER", "KITCHEN", "MESERO"] },
    { to: "/tables",     icon: "🪑", label: "Mesas",        roles: ["ADMIN", "CASHIER", "MESERO"] },
    { to: "/orders",     icon: "🧾", label: "Pedidos",      roles: ["ADMIN", "CASHIER", "MESERO"], end: true },
    { to: "/orders/new", icon: "➕", label: "Nuevo Pedido", roles: ["ADMIN", "CASHIER", "MESERO"] },
    { to: "/products",   icon: "🍔", label: "Productos",    roles: ["ADMIN", "CASHIER"] },
    { to: "/categories", icon: "🏷️", label: "Categorías",  roles: ["ADMIN"] },
    { to: "/cash",       icon: "💰", label: "Caja",         roles: ["ADMIN", "CASHIER"] },
    { to: "/users",      icon: "👥", label: "Usuarios",     roles: ["ADMIN"] },
    { to: "/kitchen",    icon: "🍳", label: "Cocina",       roles: ["ADMIN", "KITCHEN"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  // Alerta sonora cuando el pedido del mesero está listo
  useEffect(() => {
    if (!user) return;
    socket.connect();

    socket.on("order:updated", (order) => {
      if (order.status === "READY" && order.userId === user.id) {
        playAlertSoundDirect();
        if (Notification.permission === "granted") {
          new Notification(`🔔 Pedido #${order.id} listo`, {
            body: order.tableNumber
              ? `Mesa ${order.tableNumber} — listo para entregar`
              : "Para llevar — listo para entregar",
            icon: "/iconoweb.ico",
          });
        }
      }
    });

    return () => {
      socket.off("order:updated");
      socket.disconnect();
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-400">🍔 El Nuevo Baratón</h1>
          <p className="text-xs text-gray-500 mt-1">Panel de gestión</p>
        </div>
        <button onClick={closeSidebar} className="md:hidden text-gray-500 hover:text-white text-2xl leading-none">×</button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-500 text-gray-900"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }>
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full text-sm text-gray-400 hover:text-red-400 transition-colors text-left px-2">
          Cerrar sesión →
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <NotificationPrompt />

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar móvil overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSidebar} />
          <aside className="relative w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar móvil */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-amber-400 font-bold text-lg">🍔 El Nuevo Baratón</h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}