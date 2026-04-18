import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { formatINR, shortDate } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TABS = [
  { key: "", label: "All" },
  { key: "direct_referral", label: "Direct" },
  { key: "team_level", label: "Team Level" },
  { key: "monthly_cashback", label: "Cashback" },
  { key: "milestone_bonus", label: "Milestone" },
  { key: "milestone_salary", label: "Salary" },
];

export default function IncomePage() {
  const [tab, setTab] = useState("");
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = tab ? `/user/wallet/transactions?tx_type=${tab}` : "/user/wallet/transactions";
    api.get(url).then((r) => {
      setTx(r.data);
      setLoading(false);
    });
  }, [tab]);

  const total = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="income-page">
      <div className="overline mb-2">Income</div>
      <h1 className="text-4xl font-black mb-2">Earnings Ledger</h1>
      <p className="text-sm text-zinc-500 mb-6">Filter by income type</p>

      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map((t) => (
          <button
            key={t.key || "all"}
            onClick={() => setTab(t.key)}
            className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border ${
              tab === t.key ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10" : "border-[#222] text-zinc-500 hover:text-white"
            }`}
            data-testid={`income-tab-${t.key || "all"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card-dark p-6 mb-6 gold-border">
        <div className="overline mb-1">Filtered Total (credits)</div>
        <div className="text-3xl font-black text-[#d4af37]">{formatINR(total)}</div>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <div className="col-span-5">Description</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1">Level</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-zinc-500 text-sm">Loading…</div>
        ) : tx.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 text-sm">No transactions.</div>
        ) : (
          tx.map((t, i) => (
            <div key={i} className="grid grid-cols-12 px-6 py-3 border-b border-[#141414] last:border-0 hover:bg-[#0f0f0f] text-sm" data-testid={`income-row-${i}`}>
              <div className="col-span-5 text-white truncate">{t.description}</div>
              <div className="col-span-2 text-zinc-400 text-xs uppercase tracking-widest">{t.type.replace(/_/g, " ")}</div>
              <div className="col-span-1 text-zinc-500">{t.level ? `L${t.level}` : "—"}</div>
              <div className="col-span-2 text-zinc-500 text-xs">{shortDate(t.created_at)}</div>
              <div className={`col-span-2 text-right font-mono font-bold ${t.amount >= 0 ? "text-[#d4af37]" : "text-red-400"}`}>
                {t.amount >= 0 ? "+" : ""}{formatINR(t.amount)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
