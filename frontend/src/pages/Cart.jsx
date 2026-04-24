import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";


export default function Cart() {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart") || "[]"));
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const save = (c) => {
    setCart(c);
    localStorage.setItem("cart", JSON.stringify(c));
  };

  const remove = (pid) => save(cart.filter((c) => c.product_id !== pid));
  const updateQty = (pid, q) => save(cart.map((c) => (c.product_id === pid ? { ...c, quantity: Math.max(1, q) } : c)));

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
        address,
      });
      localStorage.setItem("cart", "[]");
      setCart([]);
      toast.success(`Order placed! ID: ${data.order_id.slice(0, 8)}`);
      navigate("/orders");
    } catch (e) {
      toast.error("Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto" data-testid="cart-page">
      <div className="overline mb-2">Checkout</div>
      <h1 className="text-4xl font-black mb-8">Your Cart</h1>

      {cart.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <div className="text-zinc-400">Your cart is empty.</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cart.map((c) => (
              <div key={c.product_id} className="card-dark p-4 flex items-center gap-4" data-testid={`cart-item-${c.product_id}`}>
                {c.image && <img src={c.image} alt={c.name} className="w-20 h-20 object-cover" />}
                <div className="flex-1">
                  <div className="text-white font-medium">{c.name}</div>
                  <div className="text-[#d4af37] font-bold">{formatINR(c.price)}</div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={c.quantity}
                  onChange={(e) => updateQty(c.product_id, parseInt(e.target.value || "1"))}
                  className="w-16 bg-black border border-[#222] text-white px-3 py-2 outline-none text-center"
                />
                <button onClick={() => remove(c.product_id)} className="text-zinc-500 hover:text-red-400" data-testid={`remove-${c.product_id}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="card-dark p-6 h-fit gold-border">
            <div className="overline mb-2">Order Summary</div>
            <div className="flex justify-between text-sm py-2 border-b border-[#1a1a1a]">
              <span className="text-zinc-400">Items</span>
              <span className="text-white">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-zinc-400">Total</span>
              <span className="text-2xl font-black text-[#d4af37]">{formatINR(total)}</span>
            </div>
            <textarea
              placeholder="Delivery address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-black border border-[#222] text-white px-3 py-2 outline-none mt-2 text-sm"
              data-testid="cart-address"
            />
            <button
              disabled={loading}
              onClick={checkout}
              className="btn-gold w-full mt-4 disabled:opacity-60"
              data-testid="checkout-btn"
            >
              {loading ? "Placing..." : "Place Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
