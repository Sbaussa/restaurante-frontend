import api from "./api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Contexto de audio global reutilizable
let _audioCtx = null;

export function playAlertSoundDirect() {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = _audioCtx;
    ctx.resume().then(() => {
      const osc1 = ctx.createOscillator();
      const g1   = ctx.createGain();
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.frequency.value = 880;
      g1.gain.setValueAtTime(0.4, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.3);

      const osc2 = ctx.createOscillator();
      const g2   = ctx.createGain();
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      g2.gain.setValueAtTime(0.4, ctx.currentTime + 0.35);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.start(ctx.currentTime + 0.35); osc2.stop(ctx.currentTime + 0.65);
    });
  } catch {}
}

// Escucha mensajes del Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "PLAY_ALERT") {
      playAlertSoundDirect();
    }
  });
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push no soportado en este navegador");
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permiso de notificaciones denegado");
      return;
    }
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await api.post("/push/subscribe", { subscription });
    console.log("Suscrito a push notifications ✓");
  } catch (err) {
    console.error("Error al suscribirse:", err);
  }
}

export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await api.post("/push/unsubscribe");
    }
  } catch (err) {
    console.error("Error al desuscribirse:", err);
  }
}