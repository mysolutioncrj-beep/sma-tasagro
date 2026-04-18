import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatINR, shortDate } from "@/lib/format";
import { useAuth } from "@/lib/AuthContext";
import { formatApiErrorDetail } from "@/lib/apiClient";

export default function WithdrawPage() {
  const { user, refresh } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [details, setDetails] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/user/withdrawals").then((r) => setWithdrawals(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/user/withdraw", { amount: parseFloat(amount), method, details });
      toast.success("Withdrawal requested");
      setAmount("");
      setDetails("");
      refresh();
      load();
    } catch (ex) {
      toast.error(formatApiErrorDetail(ex.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto" data-testid="withdraw-page">
      <div className="overline mb-2">Withdraw</div>
      <h1 className="text-4xl font-black mb-2">Cash Out</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Available balance: <span className="text-[#d4af37] font-bold">{formatINR(user?.wallet_balance || 0)}</span>
      </p>

      <form onSubmit={submit} className="card-dark p-6 mb-10" data-testid="withdraw-form">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Amount (₹)</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="withdraw-amount"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="withdraw-method"
            >
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Account / UPI</label>
            <input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="withdraw-details"
            />
          </div>
        </div>
        <button disabled={loading} className="btn-gold mt-6 disabled:opacity-60" data-testid="withdraw-submit">
          {loading ? "Requesting..." : "Request Withdrawal"}
        </button>
      </form>

      <div className="card-dark overflow-hidden">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Amount</div>
          <div className="col-span-2">Method</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Details</div>
        </div>
        {withdrawals.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">No withdrawal requests yet.</div>
        ) : (
          withdrawals.map((w) => (
            <div key={w.withdrawal_id} className="grid grid-cols-12 px-6 py-3 border-b border-[#141414] last:border-0 text-sm" data-testid={`withdrawal-${w.withdrawal_id}`}>
              <div className="col-span-3 text-zinc-400 text-xs">{shortDate(w.created_at)}</div>
              <div className="col-span-3 text-[#d4af37] font-bold">{formatINR(w.amount)}</div>
              <div className="col-span-2 text-zinc-400 uppercase text-xs tracking-widest">{w.method}</div>
              <div className="col-span-2">
                <span
                  className={`text-xs px-2 py-1 ${
                    w.status === "approved"
                      ? "bg-green-500/10 text-green-400"
                      : w.status === "rejected"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-[#d4af37]/10 text-[#d4af37]"
                  }`}
                >
                  {w.status}
                </span>
              </div>
              <div className="col-span-2 text-zinc-500 text-xs truncate">{w.details}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
