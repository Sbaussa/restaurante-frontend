import api from "./api";

export async function printReceipt(order) {
  try {
    await api.post("/print", { order });
  } catch (err) {
    alert(err.response?.data?.message || "Error al imprimir");
  }
}