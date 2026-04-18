import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Leaf } from "lucide-react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { formatINR } from "@/lib/format";

export default function BuyKit() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState("mock");
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);
    try {
      await api.post("/user/kit/purchase", { payment_method: method });
      toast.success("Kit purchased. Welcome to the network!");
      await refresh();
      navigate("/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (user?.kit_purchased) {
    return (
      <div className="p-10 max-w-3xl mx-auto text-center" data-testid="buy-kit-already">
        <Check size={40} color="#d4af37" className="mx-auto mb-4" />
        <h1 className="text-3xl font-black">You already own the kit.</h1>
        <p className="text-zinc-500 mt-2">Enjoy your ₹1,000 monthly cashback for 24 months.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto" data-testid="buy-kit-page">
      <div className="overline mb-2">Activate</div>
      <h1 className="text-4xl font-black mb-8">Purchase Product Kit</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card-dark p-8 gold-border">
          <Leaf size={28} color="#d4af37" />
          <div className="overline mt-6">Product Kit · 1 Unit</div>
          <div className="text-6xl font-black mt-4">18</div>
          <div className="text-xs tracking-[0.3em] uppercase text-zinc-500">Agro Products</div>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              `₹${(10000).toLocaleString("en-IN")} one-time investment`,
              "₹1,000 monthly cashback for 24 months",
              "₹24,000 guaranteed return",
              "Unlock direct referral & level income",
              "Eligible for team profit commissions",
              "Milestone rewards: ₹5,000 bonus + monthly salary",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-zinc-300">
                <Check size={14} color="#d4af37" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="card-dark p-8">
          <div className="overline mb-4">Payment</div>
          <div className="flex items-baseline gap-2 mb-6">
            <div className="text-5xl font-black text-[#d4af37]">{formatINR(10000)}</div>
            <div className="text-zinc-500 text-sm">one-time</div>
          </div>

          <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
            data-testid="payment-method"
          >
            <option value="mock">Instant (Demo Mode)</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
          </select>

          <div className="mt-6 p-4 bg-black border border-[#222]">
            <div className="text-xs text-zinc-500 leading-relaxed">
              In demo mode the kit is activated instantly on click. In production, a payment gateway integration (Razorpay/Stripe)
              will process the ₹10,000 charge and the admin can also approve offline payments.
            </div>
          </div>

          <button
            disabled={loading}
            onClick={pay}
            className="btn-gold w-full mt-6 disabled:opacity-60"
            data-testid="pay-btn"
          >
            {loading ? "Processing..." : `Pay ${formatINR(10000)} & Activate`}
          </button>
        </div>
      </div>
    </div>
  );
}
