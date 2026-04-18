import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { formatINR, shortDate } from "@/lib/format";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get("/orders").then((r) => setOrders(r.data)); }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="orders-page">
      <div className="overline mb-2">History</div>
      <h1 className="text-4xl font-black mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="card-dark p-12 text-center text-zinc-500">No orders yet.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.order_id} className="card-dark p-6" data-testid={`order-${o.order_id}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                <div>
                  <div className="text-xs text-zinc-500 tracking-widest uppercase">Order #{o.order_id.slice(0, 8)}</div>
                  <div className="text-xs text-zinc-500">{shortDate(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest bg-[#d4af37]/10 text-[#d4af37] px-3 py-1">{o.status}</span>
                  <div className="text-2xl font-black text-[#d4af37]">{formatINR(o.total)}</div>
                </div>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {o.items.map((it) => (
                  <div key={it.product_id} className="flex justify-between py-2 text-sm">
                    <div>
                      <span className="text-white">{it.name}</span>
                      <span className="text-zinc-500"> × {it.quantity}</span>
                    </div>
                    <div className="text-zinc-400">{formatINR(it.line_total)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
