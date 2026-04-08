import { useEffect } from "react";
import { socket } from "../utils/socket";
import { playAlertSoundDirect } from "../utils/pushNotifications";
import { useAuth } from "../context/AuthContext";

// Dentro del componente OrdersPage, agrega este useEffect:
const { user } = useAuth();

useEffect(() => {
  socket.connect();
  socket.on("order:updated", (order) => {
    // Suena si el pedido es mío y está listo
    if (order.status === "READY" && order.userId === user?.id) {
      playAlertSoundDirect();
      // Notificación nativa del navegador si tiene permiso
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