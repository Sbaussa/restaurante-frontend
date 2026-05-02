import { useState } from "react";
import { useFetch } from "../hooks/useData";
import {
  DollarSign, Receipt, Target, XCircle,
  Printer, CreditCard, BarChart2, ClipboardList, Shuffle,
} from "lucide-react";

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .split("T")[0];

const PAYMENT_LABELS = {
  EFECTIVO:      "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA:       "Tarjeta",
  MIXTO:         "Mixto",
};

const PAYMENT_COLORS = {
  EFECTIVO:      "text-green-400 bg-green-900/30 border-green-800",
  TRANSFERENCIA: "text-blue-400 bg-blue-900/30 border-blue-800",
  TARJETA:       "text-purple-400 bg-purple-900/30 border-purple-800",
  MIXTO:         "text-pink-400 bg-pink-900/30 border-pink-800",
};

const PAYMENT_ICONS = {
  EFECTIVO:      "💵",
  TRANSFERENCIA: "📲",
  TARJETA:       "💳",
  MIXTO:         "🔀",
};

export default function CashRegisterPage() {
  const [date, setDate] = useState(TODAY);
  const { data: cash, loading } = useFetch(`/cash?date=${date}`, [date]);

  // Pedidos con pago mixto
  const mixedOrders = cash?.orders?.filter((o) => o.paymentMethod === "MIXTO") || [];

  const handlePrint = () => {
    const fecha = new Date(date + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const paymentRows = cash?.paymentBreakdown?.map((p) => `
      <tr>
        <td>${PAYMENT_ICONS[p.paymentMethod] || ""} ${PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod}</td>
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

  const statCards = [
    { Icon: DollarSign,  label: "Total del día",     value: `$${(cash?.totalRevenue || 0).toLocaleString()}`,        color: "text-amber-400",  bg: "bg-amber-500/10" },
    { Icon: Receipt,     label: "Pedidos entregados", value: cash?.totalOrders ?? 0,                                  color: "text-green-400",  bg: "bg-green-500/10" },
    { Icon: Target,      label: "Ticket promedio",    value: `$${Math.round(cash?.avgTicket || 0).toLocaleString()}`, color: "text-blue-400",   bg: "bg-blue-500/10"  },
    { Icon: XCircle,     label: "Cancelados",         value: cash?.cancelledOrders ?? 0,                              color: "text-red-400",    bg: "bg-red-500/10"   },
  ];

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
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Printer size={15} /> Imprimir cierre
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Cargando...</p>
      ) : !cash ? null : (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {statCards.map(({ Icon, label, value, color, bg }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={color} />
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Métodos de pago */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={15} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">Métodos de pago</h3>
              </div>
              {cash.paymentBreakdown?.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin pagos registrados</p>
              ) : (
                <div className="space-y-3">
                  {cash.paymentBreakdown?.map((p) => (
                    <div key={p.paymentMethod} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAYMENT_COLORS[p.paymentMethod] || "text-gray-400 bg-gray-800 border-gray-700"}`}>
                          {PAYMENT_ICONS[p.paymentMethod] || ""} {PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod}
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
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">Top productos del día</h3>
              </div>
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

            {/* Pedidos del día */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={15} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">Pedidos del día</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cash.orders?.length === 0 ? (
                  <p className="text-gray-600 text-sm">Sin pedidos</p>
                ) : (
                  cash.orders?.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-medium">#{order.id}</span>
                          {order.tableNumber && (
                            <span className="text-gray-500 text-xs">Mesa {order.tableNumber}</span>
                          )}
                          {order.paymentMethod && (
                            <span className="text-xs">{PAYMENT_ICONS[order.paymentMethod] || ""}</span>
                          )}
                        </div>
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

          {/* ── Pagos Mixtos ─────────────────────────────────────── */}
          {mixedOrders.length > 0 && (
            <div className="bg-gray-900 border border-pink-900/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shuffle size={15} className="text-pink-400" />
                <h3 className="text-sm font-semibold text-pink-400">Pagos Mixtos del día</h3>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{mixedOrders.length} pedidos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-2 font-medium">Pedido</th>
                      <th className="text-left pb-2 font-medium">Hora</th>
                      <th className="text-right pb-2 font-medium">💵 Efectivo</th>
                      <th className="text-right pb-2 font-medium">📲 Transferencia</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixedOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-800/50 last:border-0">
                        <td className="py-2 text-white font-medium">#{order.id}</td>
                        <td className="py-2 text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 text-right text-green-400 font-medium">
                          {order.cashGiven ? `$${order.cashGiven.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2 text-right text-blue-400 font-medium">
                          {order.transferAmount ? `$${order.transferAmount.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2 text-right text-amber-400 font-bold">
                          ${order.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-700">
                      <td colSpan={2} className="pt-3 text-gray-500 font-medium">Totales</td>
                      <td className="pt-3 text-right text-green-400 font-bold">
                        ${mixedOrders.reduce((s, o) => s + (o.cashGiven || 0), 0).toLocaleString()}
                      </td>
                      <td className="pt-3 text-right text-blue-400 font-bold">
                        ${mixedOrders.reduce((s, o) => s + (o.transferAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="pt-3 text-right text-amber-400 font-bold">
                        ${mixedOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}