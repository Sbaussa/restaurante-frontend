import { useState } from "react";
import { useFetch } from "../hooks/useData";

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .split("T")[0];

const PAYMENT_LABELS = {
  EFECTIVO:      "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA:       "Tarjeta",
};

const PAYMENT_COLORS = {
  EFECTIVO:      "text-green-400 bg-green-900/30 border-green-800",
  TRANSFERENCIA: "text-blue-400 bg-blue-900/30 border-blue-800",
  TARJETA:       "text-purple-400 bg-purple-900/30 border-purple-800",
};

export default function CashRegisterPage() {
  const [date, setDate] = useState(TODAY);
  const { data: cash, loading } = useFetch(`/cash?date=${date}`, [date]);

  const handlePrint = () => {
    const fecha = new Date(date + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const paymentRows = cash?.paymentBreakdown?.map((p) => `
      <tr>
        <td>${PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod}</td>
        <td>${p._count} pedidos</td>
        <td>$${(p._sum.total || 0).toLocaleString()}</td>
      </tr>
    `).join("") || "";

    const topRows = cash?.topProducts?.map((p, i) => `
      <tr>
        <td>${i + 1}. ${p.name}</td>
        <td>${p.totalSold} uds</td>
      </tr>
    `).join("") || "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
          h1 { text-align: center; font-size: 16px; margin: 0; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
          td:last-child { text-align: right; }
          .total { font-size: 15px; font-weight: bold; }
          @media print { @page { size: 80mm auto; margin: 0; } }
        </style>
      </head>
      <body>
        <h1>El Nuevo Baraton</h1>
        <p class="center">Calle 70 - Barranquilla</p>
        <p class="center">CIERRE DE CAJA</p>
        <div class="divider"></div>
        <p>Fecha    : ${fecha}</p>
        <p>Pedidos  : ${cash?.totalOrders || 0}</p>
        <p>Cancelados: ${cash?.cancelledOrders || 0}</p>
        <p>Tk prom  : $${Math.round(cash?.avgTicket || 0).toLocaleString()}</p>
        <div class="divider"></div>
        <p><b>METODOS DE PAGO</b></p>
        <table>${paymentRows}</table>
        <div class="divider"></div>
        <p><b>TOP PRODUCTOS</b></p>
        <table>${topRows}</table>
        <div class="divider"></div>
        <table>
          <tr class="total">
            <td>TOTAL DEL DIA</td>
            <td>$${(cash?.totalRevenue || 0).toLocaleString()}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <p class="center">Generado: ${new Date().toLocaleString("es-CO")}</p>
      </body>
      </html>
    `;

    const w = window.open("", "_blank", "width=320,height=600");
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.onafterprint = () => w.close(); }, 250);
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Historial de Caja</h2>
          <p className="text-gray-500 text-sm mt-1">Resumen diario de ventas</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date" value={date} max={TODAY}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handlePrint}
            disabled={!cash || loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm"
          >
            🖨️ Imprimir cierre
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando...</p>
      ) : !cash ? null : (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { icon: "💰", label: "Total del día",    value: `$${(cash.totalRevenue || 0).toLocaleString()}`,          color: "text-amber-400" },
              { icon: "🧾", label: "Pedidos entregados",value: cash.totalOrders,                                         color: "text-green-400" },
              { icon: "🎯", label: "Ticket promedio",   value: `$${Math.round(cash.avgTicket || 0).toLocaleString()}`,   color: "text-blue-400"  },
              { icon: "❌", label: "Cancelados",        value: cash.cancelledOrders,                                     color: "text-red-400"   },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <span className="text-xl">{icon}</span>
                <p className={`text-2xl font-bold ${color} mt-2`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Métodos de pago */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Métodos de pago</h3>
              {cash.paymentBreakdown?.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin pagos registrados</p>
              ) : (
                <div className="space-y-3">
                  {cash.paymentBreakdown?.map((p) => (
                    <div key={p.paymentMethod} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAYMENT_COLORS[p.paymentMethod] || "text-gray-400 bg-gray-800 border-gray-700"}`}>
                          {PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod}
                        </span>
                        <span className="text-gray-500 text-xs">{p._count} pedidos</span>
                      </div>
                      <span className="text-white font-medium text-sm">${(p._sum.total || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top productos */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Top productos del día</h3>
              <div className="space-y-2">
                {cash.topProducts?.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{p.name}</p>
                      <div className="h-1.5 bg-gray-800 rounded-full mt-1">
                        <div className="h-1.5 bg-amber-500 rounded-full"
                          style={{ width: `${(p.totalSold / cash.topProducts[0].totalSold) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{p.totalSold}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Últimos pedidos */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Pedidos del día</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cash.orders?.length === 0 ? (
                  <p className="text-gray-600 text-sm">Sin pedidos</p>
                ) : (
                  cash.orders?.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                      <div>
                        <span className="text-white text-xs font-medium">#{order.id}</span>
                        {order.tableNumber && (
                          <span className="text-gray-500 text-xs ml-2">Mesa {order.tableNumber}</span>
                        )}
                        <p className="text-gray-600 text-xs">
                          {new Date(order.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          {order.paymentMethod && ` · ${PAYMENT_LABELS[order.paymentMethod]}`}
                        </p>
                      </div>
                      <span className="text-amber-400 text-xs font-bold">${order.total.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}