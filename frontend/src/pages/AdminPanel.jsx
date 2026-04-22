import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatINR, shortDate } from "@/lib/format";
import { Users, Package, Tags, BadgePercent, ShoppingBag, Wallet, PlayCircle, Trash2, Plus, Receipt, Download, X, Eye } from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview", icon: ShoppingBag },
  { key: "payments", label: "Payments", icon: Receipt },
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
      {tab === "payments" && <PaymentsTab />}
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

function PaymentsTab() {
  const [data, setData] = useState({ summary: {}, rows: [] });
  const [filters, setFilters] = useState({ payment_type: "", status: "", search: "" });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.payment_type) params.set("payment_type", filters.payment_type);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      const { data } = await api.get(`/admin/payments?${params.toString()}`);
      setData(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.payment_type, filters.status]);

  const openDetail = async (row) => {
    const { data } = await api.get(`/admin/payments/${row.payment_type}/${row.ref_id}`);
    setDetail(data);
  };

  const exportCsv = () => {
    const headers = ["Date", "Type", "Direction", "Ref ID", "User", "Amount", "Method", "Status", "Txn Ref", "Note"];
    const lines = [headers.join(",")];
    data.rows.forEach((r) => {
      lines.push([
        shortDate(r.created_at),
        r.payment_type,
        r.direction,
        r.ref_id,
        (r.user_name || "").replace(/,/g, " "),
        r.amount,
        r.method || "",
        r.status,
        (r.transaction_ref || "").replace(/,/g, " "),
        (r.note || "").replace(/,/g, " ").replace(/\n/g, " "),
      ].join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data.summary || {};

  return (
    <div data-testid="admin-payments">
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Money In (Approved)" value={formatINR(s.total_in || 0)} accent testid="payments-in" />
        <Kpi label="Money Out (Approved)" value={formatINR(s.total_out || 0)} testid="payments-out" />
        <Kpi label="Pending" value={s.pending_count ?? 0} testid="payments-pending" />
        <Kpi label="Total Records" value={s.count ?? 0} testid="payments-count" />
      </div>

      <div className="card-dark p-4 mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filters.payment_type}
          onChange={(e) => setFilters({ ...filters, payment_type: e.target.value })}
          className="bg-black border border-[#222] text-white px-3 py-2 outline-none text-sm"
          data-testid="filter-type"
        >
          <option value="">All types</option>
          <option value="kit">Kit purchase</option>
          <option value="order">Product order</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="bg-black border border-[#222] text-white px-3 py-2 outline-none text-sm"
          data-testid="filter-status"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="placed">Placed</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search user, ref ID, txn ref…"
          className="flex-1 min-w-[200px] bg-black border border-[#222] text-white px-3 py-2 outline-none text-sm"
          data-testid="filter-search"
        />
        <button onClick={load} className="btn-ghost-gold !py-2 !px-4 !text-xs" data-testid="filter-apply">Apply</button>
        <button onClick={exportCsv} className="btn-gold !py-2 !px-4 !text-xs flex items-center gap-2" data-testid="export-csv">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 border-b border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">User</div>
          <div className="col-span-2">Ref ID</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-1">Method</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-zinc-500 text-sm">Loading…</div>
        ) : data.rows.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 text-sm">No payments found.</div>
        ) : (
          data.rows.map((r) => (
            <div
              key={`${r.payment_type}-${r.ref_id}`}
              className="grid grid-cols-12 px-4 py-3 border-b border-[#141414] last:border-0 hover:bg-[#0f0f0f] text-sm items-center"
              data-testid={`payment-row-${r.ref_id}`}
            >
              <div className="col-span-2 text-xs text-zinc-400">{shortDate(r.created_at)}</div>
              <div className="col-span-1">
                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${
                  r.payment_type === "kit" ? "bg-[#d4af37]/10 text-[#d4af37]" :
                  r.payment_type === "order" ? "bg-blue-500/10 text-blue-300" :
                  "bg-red-500/10 text-red-300"
                }`}>{r.payment_type}</span>
              </div>
              <div className="col-span-2 truncate text-white">{r.user_name || "—"}</div>
              <div className="col-span-2 font-mono text-[11px] text-zinc-500 truncate">{r.ref_id?.slice(0, 12)}</div>
              <div className={`col-span-2 font-bold font-mono ${r.direction === "in" ? "text-[#d4af37]" : "text-red-400"}`}>
                {r.direction === "in" ? "+" : "−"}{formatINR(r.amount)}
              </div>
              <div className="col-span-1 text-xs uppercase tracking-widest text-zinc-400">{r.method || "—"}</div>
              <div className="col-span-1"><Status s={r.status} /></div>
              <div className="col-span-1 text-right">
                <button onClick={() => openDetail(r)} className="text-[#d4af37] hover:underline text-xs inline-flex items-center gap-1" data-testid={`view-${r.ref_id}`}>
                  <Eye size={12} /> View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {detail && <PaymentDetailModal detail={detail} onClose={() => setDetail(null)} onSaved={() => { setDetail(null); load(); }} />}
    </div>
  );
}

function PaymentDetailModal({ detail, onClose, onSaved }) {
  const d = detail.data || {};
  const u = detail.user || {};
  const type = detail.payment_type;
  const refId = d.order_id || d.withdrawal_id;
  const [txnRef, setTxnRef] = useState(d.transaction_ref || "");
  const [note, setNote] = useState(d.note || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/payments/${type}/${refId}/note`, { transaction_ref: txnRef, note });
      toast.success("Payment record updated");
      onSaved();
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="payment-detail-modal">
      <div className="card-dark gold-border max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between sticky top-0 bg-[#121212] z-10">
          <div>
            <div className="overline">Payment Record · {type.toUpperCase()}</div>
            <div className="text-lg font-bold text-white mt-1 font-mono">{refId}</div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" data-testid="close-detail"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Kv label="Amount" value={formatINR(d.amount || d.total || 0)} gold />
            <Kv label="Status" value={<Status s={d.status} />} />
            <Kv label="Method" value={d.method || d.payment_method || "wallet"} />
            <Kv label="Created" value={shortDate(d.created_at)} />
            {d.approved_at && <Kv label="Approved" value={shortDate(d.approved_at)} />}
            {d.profit != null && <Kv label="Profit" value={formatINR(d.profit)} />}
          </div>

          <div className="border-t border-[#1a1a1a] pt-4">
            <div className="overline mb-3">User Info</div>
            <div className="grid grid-cols-2 gap-4">
              <Kv label="Name" value={u.name || d.user_name || "—"} />
              <Kv label="Email" value={u.email || "—"} />
              <Kv label="Phone" value={u.phone || "—"} />
              <Kv label="Referral Code" value={<span className="font-mono text-[#d4af37]">{u.referral_code || "—"}</span>} />
            </div>
          </div>

          {type === "order" && d.items && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <div className="overline mb-3">Items ({d.items.length})</div>
              <div className="divide-y divide-[#1a1a1a]">
                {d.items.map((it) => (
                  <div key={it.product_id} className="flex justify-between py-2 text-sm">
                    <span className="text-white">{it.name} × {it.quantity}</span>
                    <span className="text-zinc-400">{formatINR(it.line_total)}</span>
                  </div>
                ))}
              </div>
              {d.address && <div className="mt-3 text-xs text-zinc-500">Address: {d.address}</div>}
            </div>
          )}

          {type === "withdrawal" && d.details && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <div className="overline mb-3">Bank / UPI Details</div>
              <div className="text-sm text-zinc-300 font-mono bg-black p-3 border border-[#222]">{d.details}</div>
            </div>
          )}

          <div className="border-t border-[#1a1a1a] pt-4">
            <div className="overline mb-3">Attach Transaction Reference</div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Txn Ref / UTR / Bank ID</label>
                <input
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-3 py-2 outline-none text-sm"
                  placeholder="e.g. UTR123456 / RAZORPAY-xyz / Bank Ref 998877"
                  data-testid="txn-ref-input"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Admin Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-3 py-2 outline-none text-sm"
                  placeholder="Any remark for audit trail…"
                  data-testid="note-input"
                />
              </div>
              <button disabled={saving} onClick={save} className="btn-gold !py-2 !px-5 !text-xs disabled:opacity-60 w-fit" data-testid="save-txn-ref">
                {saving ? "Saving..." : "Save Reference"}
              </button>
            </div>
          </div>

          {detail.related_commissions && detail.related_commissions.length > 0 && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <div className="overline mb-3">Related Commissions ({detail.related_commissions.length})</div>
              <div className="divide-y divide-[#1a1a1a] max-h-60 overflow-y-auto">
                {detail.related_commissions.map((t, i) => (
                  <div key={i} className="flex justify-between py-2 text-xs">
                    <div>
                      <div className="text-zinc-300">{t.description}</div>
                      <div className="text-zinc-600 uppercase tracking-widest">{t.type.replace(/_/g, " ")} · {shortDate(t.created_at)}</div>
                    </div>
                    <div className={`font-mono font-bold ${t.amount >= 0 ? "text-[#d4af37]" : "text-red-400"}`}>
                      {t.amount >= 0 ? "+" : ""}{formatINR(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent = false, testid }) {
  return (
    <div className={`card-dark p-5 ${accent ? "gold-border" : ""}`} data-testid={testid}>
      <div className="overline">{label}</div>
      <div className={`text-2xl font-black mt-2 ${accent ? "text-[#d4af37]" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Kv({ label, value, gold = false }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className={`text-sm font-medium mt-1 ${gold ? "text-[#d4af37] font-bold" : "text-white"}`}>{value}</div>
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
