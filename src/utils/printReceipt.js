import api from "./api";

export async function printReceipt(order) {
  try {
    const response = await fetch("http://192.168.1.100:3002/api/print", {
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