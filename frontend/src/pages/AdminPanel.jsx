import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatINR, shortDate } from "@/lib/format";
import { Users, Package, Tags, BadgePercent, ShoppingBag, Wallet, PlayCircle, Trash2, Plus } from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview", icon: ShoppingBag },
  { key: "users", label: "Users", icon: Users },
  { key: "kits", label: "Kit Orders", icon: Package },
  { key: "withdrawals", label: "Withdrawals", icon: Wallet },
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "offers", label: "Offers", icon: BadgePercent },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "payouts", label: "Payouts", icon: PlayCircle },
];

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="admin-panel">
      <div className="overline mb-2">Administration</div>
      <h1 className="text-4xl font-black mb-8">Admin Console</h1>
      <div className="flex gap-2 flex-wrap mb-8 border-b border-[#1a1a1a] pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs uppercase tracking-[0.22em] px-4 py-3 flex items-center gap-2 border-b-2 -mb-px ${
                tab === t.key ? "border-[#d4af37] text-[#d4af37]" : "border-transparent text-zinc-500 hover:text-white"
              }`}
              data-testid={`admin-tab-${t.key}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersTab />}
      {tab === "kits" && <KitsTab />}
      {tab === "withdrawals" && <WithdrawalsTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "offers" && <OffersTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "payouts" && <PayoutsTab />}
    </div>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/overview").then((r) => setS(r.data)); }, []);
  const kpis = s
    ? [
        { label: "Total Users", v: s.users_count },
        { label: "Kits Purchased", v: s.kit_purchased },
        { label: "Revenue", v: formatINR(s.total_revenue) },
        { label: "Pending Withdrawals", v: s.pending_withdrawals },
        { label: "Total Orders", v: s.total_orders },
        { label: "Pending Cashbacks", v: s.pending_cashback },
      ]
    : [];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-5" data-testid="overview-grid">
      {kpis.map((k) => (
        <div key={k.label} className="card-dark p-6">
          <div className="overline">{k.label}</div>
          <div className="text-3xl font-black mt-2 text-white">{k.v ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/users").then((r) => setRows(r.data)); }, []);
  return (
    <div className="card-dark overflow-hidden" data-testid="admin-users">
      <TH cols={["Name", "Email", "Code", "Role", "Kit", "Wallet", "Directs"]} />
      {rows.map((u) => (
        <TR key={u.id} testid={`admin-user-${u.id}`} cols={[
          u.name,
          u.email,
          <span className="text-[#d4af37] font-mono">{u.referral_code}</span>,
          u.role,
          u.kit_purchased ? "Active" : "—",
          formatINR(u.wallet_balance || 0),
          u.direct_referrals_count || 0,
        ]} />
      ))}
    </div>
  );
}

function KitsTab() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/kit-orders").then((r) => setRows(r.data)); }, []);
  return (
    <div className="card-dark overflow-hidden" data-testid="admin-kits">
      <TH cols={["Order", "User", "Amount", "Method", "Status", "Date"]} />
      {rows.map((k) => (
        <TR key={k.order_id} cols={[
          k.order_id.slice(0, 8),
          k.user_name,
          formatINR(k.amount),
          k.payment_method,
          <Status s={k.status} />,
          shortDate(k.created_at),
        ]} />
      ))}
    </div>
  );
}

function WithdrawalsTab() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/admin/withdrawals").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);
  const act = async (id, which) => {
    try {
      await api.post(`/admin/withdrawals/${id}/${which}`);
      toast.success(`${which} success`);
      load();
    } catch (e) { toast.error("Failed"); }
  };
  return (
    <div className="card-dark overflow-hidden" data-testid="admin-withdrawals">
      <TH cols={["ID", "User", "Amount", "Method", "Status", "Actions"]} />
      {rows.map((w) => (
        <TR key={w.withdrawal_id} cols={[
          w.withdrawal_id.slice(0, 8),
          w.user_name,
          formatINR(w.amount),
          w.method,
          <Status s={w.status} />,
          w.status === "pending" ? (
            <div className="flex gap-2">
              <button onClick={() => act(w.withdrawal_id, "approve")} className="text-xs text-green-400 hover:underline" data-testid={`approve-${w.withdrawal_id}`}>Approve</button>
              <button onClick={() => act(w.withdrawal_id, "reject")} className="text-xs text-red-400 hover:underline" data-testid={`reject-${w.withdrawal_id}`}>Reject</button>
            </div>
          ) : "—",
        ]} />
      ))}
    </div>
  );
}

function ProductsTab() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: 0, category_id: "", image: "", stock: 100, profit_margin: 0.1 });
  const load = () => api.get("/products").then((r) => setRows(r.data));
  useEffect(() => { load(); api.get("/categories").then((r) => setCats(r.data)); }, []);
  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/products", { ...form, price: parseFloat(form.price), stock: parseInt(form.stock), profit_margin: parseFloat(form.profit_margin) });
      toast.success("Product created");
      setForm({ name: "", description: "", price: 0, category_id: "", image: "", stock: 100, profit_margin: 0.1 });
      load();
    } catch { toast.error("Failed"); }
  };
  const del = async (id) => { await api.delete(`/admin/products/${id}`); load(); };
  return (
    <div data-testid="admin-products">
      <form onSubmit={create} className="card-dark p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none" data-testid="product-name" />
        <input required type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none" data-testid="product-price" />
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none" data-testid="product-category">
          <option value="">No category</option>
          {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
        <input placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none md:col-span-2" />
        <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none md:col-span-2" />
        <input type="number" step="0.01" placeholder="Profit margin 0-1" value={form.profit_margin} onChange={(e) => setForm({ ...form, profit_margin: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none" />
        <button className="btn-gold md:col-span-3" data-testid="create-product-btn"><Plus size={14} className="inline" /> Add Product</button>
      </form>

      <div className="card-dark overflow-hidden">
        <TH cols={["Name", "Price", "Stock", "Margin", ""]} />
        {rows.map((p) => (
          <TR key={p.product_id} cols={[
            p.name,
            formatINR(p.price),
            p.stock,
            `${((p.profit_margin || 0) * 100).toFixed(0)}%`,
            <button onClick={() => del(p.product_id)} className="text-red-400 hover:underline text-xs" data-testid={`del-product-${p.product_id}`}><Trash2 size={12} className="inline" /></button>,
          ]} />
        ))}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const load = () => api.get("/categories").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/categories", { name }); toast.success("Category added"); setName(""); load(); } catch { toast.error("Failed"); }
  };
  const del = async (id) => { await api.delete(`/admin/categories/${id}`); load(); };
  return (
    <div data-testid="admin-categories">
      <form onSubmit={create} className="card-dark p-6 mb-6 flex gap-3">
        <input required placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-black border border-[#222] text-white px-3 py-2 outline-none" data-testid="category-name" />
        <button className="btn-gold !py-2 !px-4" data-testid="create-category-btn">Add</button>
      </form>
      <div className="card-dark overflow-hidden">
        <TH cols={["Name", "Slug", ""]} />
        {rows.map((c) => (
          <TR key={c.category_id} cols={[c.name, c.slug, <button onClick={() => del(c.category_id)} className="text-red-400 text-xs" data-testid={`del-cat-${c.category_id}`}><Trash2 size={12} className="inline" /></button>]} />
        ))}
      </div>
    </div>
  );
}

function OffersTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ title: "", type: "discount", discount_pct: 0, banner_image: "", active: true });
  const load = () => api.get("/offers").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/offers", { ...form, discount_pct: parseFloat(form.discount_pct) }); toast.success("Offer added"); setForm({ title: "", type: "discount", discount_pct: 0, banner_image: "", active: true }); load(); } catch { toast.error("Failed"); }
  };
  const del = async (id) => { await api.delete(`/admin/offers/${id}`); load(); };
  return (
    <div data-testid="admin-offers">
      <form onSubmit={create} className="card-dark p-6 mb-6 grid md:grid-cols-3 gap-3">
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none md:col-span-2" data-testid="offer-title" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none">
          <option value="discount">Discount</option>
          <option value="bogo">Buy 1 Get 1</option>
          <option value="festive">Festive</option>
        </select>
        <input type="number" placeholder="Discount %" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none" />
        <input placeholder="Banner image URL" value={form.banner_image} onChange={(e) => setForm({ ...form, banner_image: e.target.value })} className="bg-black border border-[#222] text-white px-3 py-2 outline-none md:col-span-2" />
        <button className="btn-gold md:col-span-3" data-testid="create-offer-btn">Add Offer</button>
      </form>
      <div className="card-dark overflow-hidden">
        <TH cols={["Title", "Type", "Discount", "Active", ""]} />
        {rows.map((o) => (
          <TR key={o.offer_id} cols={[o.title, o.type, `${o.discount_pct}%`, o.active ? "Yes" : "No",
            <button onClick={() => del(o.offer_id)} className="text-red-400 text-xs" data-testid={`del-offer-${o.offer_id}`}><Trash2 size={12} className="inline" /></button>,
          ]} />
        ))}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/orders").then((r) => setRows(r.data)); }, []);
  return (
    <div className="card-dark overflow-hidden" data-testid="admin-orders">
      <TH cols={["Order", "User", "Items", "Total", "Profit", "Date"]} />
      {rows.map((o) => (
        <TR key={o.order_id} cols={[
          o.order_id.slice(0, 8),
          o.user_name,
          o.items.length,
          formatINR(o.total),
          formatINR(o.profit),
          shortDate(o.created_at),
        ]} />
      ))}
    </div>
  );
}

function PayoutsTab() {
  const [info, setInfo] = useState(null);
  const runCashback = async () => {
    const { data } = await api.post("/admin/cashback/run");
    setInfo(`Paid ${data.paid_count} due cashbacks · ${formatINR(data.total_paid)}`);
    toast.success("Due cashbacks processed");
  };
  const runAllCashback = async () => {
    const { data } = await api.post("/admin/cashback/run-all");
    setInfo(`Paid ALL ${data.paid_count} cashbacks · ${formatINR(data.total_paid)} (demo)`);
    toast.success("All pending cashbacks paid (demo)");
  };
  const runSalary = async () => {
    const { data } = await api.post("/admin/salary/run");
    setInfo(`Paid ${data.paid_count} milestone salaries · ${formatINR(data.total_paid)}`);
    toast.success("Milestone salaries processed");
  };
  return (
    <div className="grid md:grid-cols-3 gap-5" data-testid="admin-payouts">
      <div className="card-dark p-6">
        <div className="overline">Monthly Cashback</div>
        <div className="text-sm text-zinc-500 mt-2">Pay all cashback entries with due_date &lt;= now.</div>
        <button onClick={runCashback} className="btn-gold mt-4" data-testid="run-cashback-due">Run Due Cashback</button>
      </div>
      <div className="card-dark p-6">
        <div className="overline">Demo: Pay All</div>
        <div className="text-sm text-zinc-500 mt-2">Ignore due_date and pay every pending cashback (for demo).</div>
        <button onClick={runAllCashback} className="btn-ghost-gold mt-4" data-testid="run-cashback-all">Run All Cashback</button>
      </div>
      <div className="card-dark p-6">
        <div className="overline">Milestone Salaries</div>
        <div className="text-sm text-zinc-500 mt-2">Pay due milestone monthly salaries.</div>
        <button onClick={runSalary} className="btn-gold mt-4" data-testid="run-salary">Run Salary</button>
      </div>
      {info && <div className="md:col-span-3 card-dark p-4 text-sm text-[#d4af37]" data-testid="payout-info">{info}</div>}
    </div>
  );
}

// Shared tiny components
function TH({ cols }) {
  return (
    <div
      className="grid px-6 py-3 border-b border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-zinc-500"
      style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
    >
      {cols.map((c, i) => <div key={i}>{c}</div>)}
    </div>
  );
}
function TR({ cols, testid }) {
  return (
    <div
      data-testid={testid}
      className="grid px-6 py-3 border-b border-[#141414] last:border-0 text-sm hover:bg-[#0f0f0f]"
      style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
    >
      {cols.map((c, i) => <div key={i} className="truncate text-zinc-300">{c}</div>)}
    </div>
  );
}
function Status({ s }) {
  const map = {
    pending: "bg-[#d4af37]/10 text-[#d4af37]",
    approved: "bg-green-500/10 text-green-400",
    rejected: "bg-red-500/10 text-red-400",
    placed: "bg-[#d4af37]/10 text-[#d4af37]",
  };
  return <span className={`text-xs px-2 py-1 ${map[s] || "bg-zinc-800 text-zinc-400"}`}>{s}</span>;
}
