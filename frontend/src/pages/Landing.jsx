import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { Crown, Leaf, TrendingUp, Users, Network, Gift, ArrowRight, Check } from "lucide-react";

export default function Landing() {
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/public/plan").then((r) => setPlan(r.data)).catch(() => {});
    api.get("/public/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#050505", color: "#f9fafb" }} data-testid="landing-page">
      {/* Top nav */}
      <header className="border-b border-[#141414]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="landing-brand">
            <div className="w-10 h-10 flex items-center justify-center" style={{ background: "#d4af37" }}>
              <Crown size={20} color="#050505" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.32em] text-[#d4af37] font-bold uppercase">Agro MLM</div>
              <div className="text-xs text-zinc-500 tracking-wide">Wealth Network · est. 2026</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#plan" className="hover:text-[#d4af37] transition">The Plan</a>
            <a href="#income" className="hover:text-[#d4af37] transition">Income</a>
            <a href="#rewards" className="hover:text-[#d4af37] transition">Rewards</a>
            <a href="#faq" className="hover:text-[#d4af37] transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-zinc-300 hover:text-[#d4af37] transition" data-testid="landing-login">
              Login
            </Link>
            <Link to="/register" className="btn-gold !py-2 !px-5 !text-xs" data-testid="landing-register">
              Join Network
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative radial-gold overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-12 gap-12 items-center relative z-10">
          <div className="md:col-span-7">
            <div className="overline mb-6">Premium Binary Plan · Agro Edition</div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl leading-[1.05] font-black tracking-tight">
              Invest <span className="text-[#d4af37]">₹10,000</span>
              <br />
              Earn for <span className="text-[#d4af37]">24 months</span> &amp; Beyond.
            </h1>
            <p className="mt-8 text-lg text-zinc-400 max-w-xl leading-relaxed">
              Buy the 18-product agro kit once — receive ₹1,000 monthly cashback for 24 months,
              plus unlimited earnings from direct referrals, level income across 24 tiers, and team profit shares.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="btn-gold inline-flex items-center gap-2" data-testid="hero-cta-register">
                Buy Product Kit <ArrowRight size={16} />
              </Link>
              <a href="#plan" className="btn-ghost-gold">View Compensation Plan</a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-8 max-w-lg">
              <Stat label="Kit Price" value="₹10,000" />
              <Stat label="Monthly" value="₹1,000" />
              <Stat label="Duration" value="24 mo" />
            </div>
          </div>

          <div className="md:col-span-5 relative">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1761437856299-af640f6e75ad?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85"
                alt="Gold texture"
                className="w-full h-[460px] object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, #050505 100%)" }} />
              <div className="absolute bottom-6 left-6 right-6 bg-[#0a0a0a]/90 backdrop-blur-md p-6 border border-[#d4af37]/40">
                <div className="overline mb-2">Live Network</div>
                <div className="text-3xl font-black">{stats?.total_members ?? "—"}</div>
                <div className="text-xs text-zinc-500 tracking-widest uppercase">Active Members</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plan explainer */}
      <section id="plan" className="border-t border-[#141414]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="overline mb-4">The Plan</div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl">
            Four streams of income. One <span className="text-[#d4af37]">₹10,000</span> investment.
          </h2>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PlanCard
              icon={Leaf}
              title="Product Kit"
              value="18 Products"
              desc="Receive a curated kit of 18 premium agro products worth ₹10,000 on joining."
            />
            <PlanCard
              icon={Gift}
              title="Monthly Cashback"
              value="₹1,000 × 24"
              desc="Get ₹1,000 deposited in your wallet every month for 24 months — ₹24,000 guaranteed."
            />
            <PlanCard
              icon={Network}
              title="Direct Referral"
              value="Up to 24 Levels"
              desc="Earn 5% on L1, 2% L2-3, 1% L4-9 and more across 24 sponsor levels on every kit sold downline."
            />
            <PlanCard
              icon={TrendingUp}
              title="Team Profit"
              value="10% of Profit"
              desc="Collect up to 10% of the profit from every product order placed by your team."
            />
          </div>
        </div>
      </section>

      {/* Income tables */}
      <section id="income" className="border-t border-[#141414]" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-10">
          <div>
            <div className="overline mb-3">Direct Referral Bonus</div>
            <h3 className="text-2xl font-bold mb-6">Paid on every kit purchase in your network</h3>
            <div className="border border-[#1f1f1f]">
              <TableHeader cols={["Level", "Bonus %", "Earn per ₹10,000 Kit"]} />
              {plan &&
                Object.entries(plan.direct_bonus_map).map(([lvl, rate]) => (
                  <TableRow
                    key={lvl}
                    cols={[`L${lvl}`, `${(rate * 100).toFixed(2)}%`, formatINR(rate * (plan.kit_price || 10000))]}
                    highlight={parseInt(lvl) <= 3}
                  />
                ))}
            </div>
          </div>
          <div>
            <div className="overline mb-3">Team Level Profit</div>
            <h3 className="text-2xl font-bold mb-6">Applied to profit from team orders</h3>
            <div className="border border-[#1f1f1f]">
              <TableHeader cols={["Level", "Profit Share %"]} />
              {plan &&
                Object.entries(plan.team_level_map).map(([lvl, rate]) => (
                  <TableRow
                    key={lvl}
                    cols={[`L${lvl}`, `${(rate * 100).toFixed(2)}%`]}
                    highlight={parseInt(lvl) <= 4}
                  />
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rewards / Milestones */}
      <section id="rewards" className="border-t border-[#141414]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="overline mb-3">Business Milestones</div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl">
            Unlock <span className="text-[#d4af37]">₹5,000</span> to <span className="text-[#d4af37]">₹3.2 Cr</span> rewards.
          </h2>
          <div className="mt-12 border border-[#1f1f1f]">
            <TableHeader cols={["Tier", "Target Business", "Bonus", "Monthly Salary", "Months", "Total Value"]} />
            {plan &&
              plan.milestones.map((m) => (
                <TableRow
                  key={m.tier}
                  cols={[
                    `T${m.tier}`,
                    formatINR(m.target),
                    formatINR(m.bonus),
                    formatINR(m.salary),
                    `${m.months} mo`,
                    formatINR(m.bonus + m.salary * m.months),
                  ]}
                  highlight={m.tier === 1}
                />
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#141414] relative overflow-hidden" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="overline mb-4">Start Today</div>
            <h2 className="text-3xl sm:text-5xl font-black leading-[1.05]">
              Your wealth journey begins with <span className="text-[#d4af37]">one kit.</span>
            </h2>
            <ul className="mt-8 space-y-3 text-zinc-400">
              {[
                "18 agro products delivered to your door",
                "₹24,000 guaranteed in 24 months",
                "Unlimited network & residual income",
                "Instant tree placement with spillover",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Check size={16} color="#d4af37" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex gap-4">
              <Link to="/register" className="btn-gold inline-flex items-center gap-2" data-testid="footer-cta-register">
                Create Account <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-ghost-gold">Member Login</Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square border border-[#d4af37]/40 bg-gradient-to-br from-[#0f0f0f] to-black flex items-center justify-center p-12">
              <div className="text-center">
                <div className="overline mb-4">Product Kit</div>
                <div className="text-6xl font-black text-[#d4af37] tracking-tight">18</div>
                <div className="text-xs tracking-[0.3em] uppercase text-zinc-500 mt-2">Agro Products</div>
                <div className="mt-8 text-4xl font-black">{formatINR(10000)}</div>
                <div className="text-xs text-zinc-500 mt-2">One-time investment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="faq" className="border-t border-[#141414]" style={{ background: "#050505" }}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#d4af37" }}>
              <Crown size={16} color="#050505" />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.32em] text-[#d4af37] font-bold uppercase">Agro MLM</div>
              <div className="text-xs text-zinc-500">© 2026 · All rights reserved</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <a href="#" className="hover:text-[#d4af37]">Terms</a>
            <a href="#" className="hover:text-[#d4af37]">Privacy</a>
            <a href="#" className="hover:text-[#d4af37]">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.28em] uppercase text-zinc-500">{label}</div>
      <div className="text-xl font-bold text-[#d4af37] mt-1">{value}</div>
    </div>
  );
}

function PlanCard({ icon: Icon, title, value, desc }) {
  return (
    <div className="card-dark p-8 relative group" data-testid={`plan-card-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <Icon size={24} strokeWidth={1.5} color="#d4af37" />
      <div className="overline mt-6">{title}</div>
      <div className="text-2xl font-black mt-2">{value}</div>
      <p className="text-sm text-zinc-500 mt-4 leading-relaxed">{desc}</p>
    </div>
  );
}

function TableHeader({ cols }) {
  return (
    <div
      className="grid text-[10px] uppercase tracking-[0.2em] text-zinc-500 border-b border-[#1f1f1f] px-4 py-3"
      style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
    >
      {cols.map((c) => <div key={c}>{c}</div>)}
    </div>
  );
}
function TableRow({ cols, highlight = false }) {
  return (
    <div
      className="grid text-sm px-4 py-3 border-b border-[#141414] last:border-0 hover:bg-[#0f0f0f]"
      style={{
        gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
        color: highlight ? "#d4af37" : "#d4d4d8",
      }}
    >
      {cols.map((c, i) => <div key={i}>{c}</div>)}
    </div>
  );
}
