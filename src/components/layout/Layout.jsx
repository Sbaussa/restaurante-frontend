import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import NotificationPrompt from "../NotificationPrompt";
import { socket } from "../../utils/socket";
import { playAlertSoundDirect, unlockAudio } from "../../utils/pushNotifications";
import {
  LayoutDashboard, Armchair, ClipboardList, PlusCircle,
  UtensilsCrossed, Tag, Wallet, Users, ChefHat, LogOut,
  ChevronLeft, ChevronRight, Menu,
} from "lucide-react";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [collapsed, setCollapsed]           = useState(false);

  const navItems = [
    { to: "/dashboard",  Icon: LayoutDashboard, label: "Dashboard",   roles: ["ADMIN"] },
    { to: "/tables",     Icon: Armchair,        label: "Mesas",        roles: ["ADMIN", "CASHIER", "MESERO"] },
    { to: "/orders",     Icon: ClipboardList,   label: "Pedidos",      roles: ["ADMIN", "CASHIER", "MESERO"], end: true },
    { to: "/orders/new", Icon: PlusCircle,      label: "Nuevo Pedido", roles: ["ADMIN", "CASHIER", "MESERO"] },
    { to: "/products",   Icon: UtensilsCrossed, label: "Productos",    roles: ["ADMIN", "CASHIER"] },
    { to: "/categories", Icon: Tag,             label: "Categorías",   roles: ["ADMIN"] },
    { to: "/cash",       Icon: Wallet,          label: "Caja",         roles: ["ADMIN"] },
    { to: "/users",      Icon: Users,           label: "Usuarios",     roles: ["ADMIN"] },
    { to: "/kitchen",    Icon: ChefHat,         label: "Cocina",       roles: ["ADMIN", "KITCHEN"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener("click",      unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click",      unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

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
    return () => { socket.off("order:updated"); socket.disconnect(); };
  }, [user]);

  const handleLogout = () => { logout(); navigate("/login"); };
  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = ({ isDesktop = false }) => (
    <>
      {/* Header */}
      <div className={`p-4 border-b border-gray-800 flex items-center ${collapsed && isDesktop ? "justify-center" : "justify-between"}`}>
        {(!collapsed || !isDesktop) && (
          <div>
            <h1 className="text-lg font-bold text-amber-400 flex items-center gap-2"><UtensilsCrossed size={18} /> El Nuevo Baratón</h1>
            <p className="text-xs text-gray-500 mt-0.5">Panel de gestión v2</p>
          </div>
        )}
        {isDesktop ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        ) : (
          <button onClick={closeSidebar} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={closeSidebar}
            title={collapsed && isDesktop ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed && isDesktop ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-amber-500 text-gray-900"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }>
            <Icon size={18} className="flex-shrink-0" />
            {(!collapsed || !isDesktop) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`p-3 border-t border-gray-800 ${collapsed && isDesktop ? "flex justify-center" : ""}`}>
        {(!collapsed || !isDesktop) && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed && isDesktop ? "Cerrar sesión" : undefined}
          className={`text-gray-400 hover:text-red-400 transition-colors ${collapsed && isDesktop ? "" : "w-full text-left text-sm px-2"}`}
        >
          {collapsed && isDesktop ? (
            <LogOut size={18} />
          ) : (
            <span className="flex items-center gap-2"><LogOut size={14} /> Cerrar sesión</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <NotificationPrompt />

      {/* Sidebar desktop con colapso */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-gray-900 border-r border-gray-800 transition-all duration-200 ${collapsed ? "w-16" : "w-64"}`}>
        <SidebarContent isDesktop={true} />
      </aside>

      {/* Sidebar móvil overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSidebar} />
          <aside className="relative w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full z-10">
            <SidebarContent isDesktop={false} />
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu size={24} />
          </button>
          <h1 className="text-amber-400 font-bold text-lg flex items-center gap-2"><UtensilsCrossed size={18} /> El Nuevo Baratón</h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}