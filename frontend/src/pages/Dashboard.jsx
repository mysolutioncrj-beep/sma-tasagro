import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Users, Network, TrendingUp, Gift, Copy, ShoppingBag, Award } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { formatINR, shortDate } from "@/lib/format";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/user/dashboard").then((r) => setData(r.data));
  }, []);

  const refLink = `${window.location.origin}/register?ref=${user?.referral_code}`;
  const copyRef = () => {
    navigator.clipboard.writeText(refLink);
    toast.success("Referral link copied");
  };

  const stats = data?.stats || {};
  const nextCb = data?.next_cashback;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="overline mb-2">Member Dashboard</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Welcome, <span className="text-[#d4af37]">{user?.name}</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-2">Referral code: <span className="text-[#d4af37] font-mono">{user?.referral_code}</span></p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={copyRef} className="btn-ghost-gold !py-2 !px-4 !text-xs flex items-center gap-2" data-testid="copy-referral">
            <Copy size={14} /> Copy Referral Link
          </button>
          {!user?.kit_purchased && (
            <Link to="/buy-kit" className="btn-gold !py-2 !px-4 !text-xs" data-testid="cta-buy-kit">
              Buy ₹10,000 Kit
            </Link>
          )}
        </div>
      </div>

      {!user?.kit_purchased && (
        <div className="mb-10 border gold-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#121212] to-[#0a0a0a]" data-testid="kit-banner">
          <div>
            <div className="overline mb-1">Activate your account</div>
            <div className="text-xl font-bold">Purchase your Product Kit to start earning</div>
            <div className="text-sm text-zinc-500 mt-1">Get 18 agro products + ₹1,000 cashback for 24 months.</div>
          </div>
          <Link to="/buy-kit" className="btn-gold !py-3 !px-6 !text-sm">Buy Kit Now</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <Kpi icon={Wallet} label="Wallet Balance" value={formatINR(stats.wallet_balance || 0)} accent testid="kpi-wallet" />
        <Kpi icon={TrendingUp} label="Total Earnings" value={formatINR(stats.total_earnings || 0)} testid="kpi-earnings" />
        <Kpi icon={Users} label="Direct Referrals" value={stats.direct_referrals ?? 0} testid="kpi-directs" />
        <Kpi icon={Network} label="Total Team" value={stats.total_team ?? 0} testid="kpi-team" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <Kpi icon={ShoppingBag} label="Team Business" value={formatINR(stats.team_business || 0)} testid="kpi-business" />
        <Kpi icon={Award} label="Milestone Tier" value={`T${stats.milestone_tier ?? 0}`} testid="kpi-milestone" />
        <Kpi
          icon={Gift}
          label="Next Cashback"
          value={nextCb ? formatINR(nextCb.amount) : "—"}
          sub={nextCb ? `Due ${shortDate(nextCb.due_date)} · Month ${nextCb.month_index}/24` : "No schedule yet"}
          testid="kpi-next-cashback"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-dark p-6" data-testid="recent-tx">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Recent Transactions</div>
            <Link to="/income" className="text-xs text-[#d4af37] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {(data?.recent_transactions || []).length === 0 && (
              <div className="text-sm text-zinc-500 py-6">No transactions yet.</div>
            )}
            {(data?.recent_transactions || []).map((t, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{t.description}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                    {t.type.replace(/_/g, " ")} · {shortDate(t.created_at)}
                  </div>
                </div>
                <div className={`font-bold font-mono ${t.amount >= 0 ? "text-[#d4af37]" : "text-red-400"}`}>
                  {t.amount >= 0 ? "+" : ""}
                  {formatINR(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-dark p-6" data-testid="quick-actions">
          <div className="overline mb-4">Quick Actions</div>
          <div className="space-y-2">
            <Link to="/tree" className="block w-full btn-ghost-gold !py-3 !px-4 !text-xs text-left">View Genealogy Tree</Link>
            <Link to="/shop" className="block w-full btn-ghost-gold !py-3 !px-4 !text-xs text-left">Browse Shop</Link>
            <Link to="/withdraw" className="block w-full btn-ghost-gold !py-3 !px-4 !text-xs text-left">Withdraw Funds</Link>
            <Link to="/income" className="block w-full btn-ghost-gold !py-3 !px-4 !text-xs text-left">Income History</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent = false, testid }) {
  return (
    <div className={`card-dark p-6 relative ${accent ? "gold-border gold-glow" : ""}`} data-testid={testid}>
      <Icon size={18} strokeWidth={1.5} color="#d4af37" />
      <div className="overline mt-3">{label}</div>
      <div className={`text-2xl mt-1 font-black ${accent ? "text-[#d4af37]" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}
