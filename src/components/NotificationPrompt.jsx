import { useState, useEffect } from "react";
import { subscribeToPush } from "../utils/pushNotifications";

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
  if (!("Notification" in window)) return;
  if (!localStorage.getItem("notif_asked")) {
    setTimeout(() => setShow(true), 1500);
  }
}, []);

  const handleActivar = async () => {
    localStorage.setItem("notif_asked", "1");
    setShow(false);
    await subscribeToPush();
  };

  const handleNow = () => {
    localStorage.setItem("notif_asked", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-4">
            <span className="text-3xl">🔔</span>
          </div>
          <h3 className="text-white font-bold text-lg">Activar notificaciones</h3>
          <p className="text-gray-400 text-sm mt-2">
            Recibe una alerta cuando un pedido esté listo para entregar, aunque tengas el celular bloqueado.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleActivar}
            className="w-full bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-3 rounded-xl transition-colors"
          >
            🔔 Sí, activar notificaciones
          </button>
          <button
            onClick={handleNow}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-2.5 rounded-xl text-sm transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}