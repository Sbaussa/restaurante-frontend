import api from "./api";

const LOCAL_URL = import.meta.env.VITE_LOCAL_PRINT_URL || "http://localhost:3002";

export async function printReceipt(order) {
  try {
    const response = await fetch(`${LOCAL_URL}/api/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": api.defaults.headers.common["Authorization"],
      },
      body: JSON.stringify({ order }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Error al imprimir");
    }
  } catch (err) {
    alert(err.message || "Error al imprimir");
  }
}

export async function printKitchenTicket(order) {
  try {
    const response = await fetch(`${LOCAL_URL}/api/print/kitchen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": api.defaults.headers.common["Authorization"],
      },
      body: JSON.stringify({ order }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Error al imprimir ticket de cocina");
    }
  } catch (err) {
    alert(err.message || "Error al imprimir ticket de cocina");
  }
}