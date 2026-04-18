import React from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  TrendingUp,
  Store,
  ShoppingCart,
  Wallet,
  Package,
  ShieldCheck,
  LogOut,
  Crown,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { formatINR } from "@/lib/format";

const userLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/tree", label: "Genealogy", icon: GitBranch, testid: "nav-tree" },
  { to: "/team", label: "My Team", icon: Users, testid: "nav-team" },
  { to: "/income", label: "Income", icon: TrendingUp, testid: "nav-income" },
  { to: "/shop", label: "Shop", icon: Store, testid: "nav-shop" },
  { to: "/cart", label: "Cart", icon: ShoppingCart, testid: "nav-cart" },
  { to: "/orders", label: "Orders", icon: Package, testid: "nav-orders" },
  { to: "/withdraw", label: "Withdraw", icon: Wallet, testid: "nav-withdraw" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#050505" }} data-testid="app-shell">
      <aside className="w-64 border-r border-[#1a1a1a] hidden lg:flex flex-col" style={{ background: "#0a0a0a" }}>
        <Link to="/" className="px-6 py-6 border-b border-[#1a1a1a] flex items-center gap-3" data-testid="brand-link">
          <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#d4af37" }}>
            <Crown size={18} color="#050505" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.28em] text-[#d4af37] font-bold uppercase">Agro MLM</div>
            <div className="text-xs text-zinc-500">Wealth Network</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
          {userLinks.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                data-testid={l.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide transition-colors ${
                    isActive
                      ? "bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.6} />
                <span>{l.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] tracking-[0.3em] text-zinc-600 uppercase">Admin</div>
              <NavLink
                to="/admin"
                data-testid="nav-admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide transition-colors ${
                    isActive
                      ? "bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`
                }
              >
                <ShieldCheck size={16} strokeWidth={1.6} />
                <span>Admin Panel</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-[#1a1a1a] p-4">
          <div className="text-[10px] tracking-[0.28em] uppercase text-[#d4af37] mb-1">Wallet</div>
          <div className="text-xl font-bold text-white" data-testid="sidebar-wallet">
            {formatINR(user?.wallet_balance || 0)}
          </div>
          <div className="text-xs text-zinc-500">
            Earned {formatINR(user?.total_earnings || 0)}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-6" style={{ background: "#0a0a0a" }}>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#d4af37" }}>
              <Crown size={16} color="#050505" />
            </div>
            <span className="text-[#d4af37] font-bold tracking-[0.2em] text-sm">AGRO MLM</span>
          </div>
          <div className="text-xs text-zinc-500 tracking-widest uppercase hidden lg:block">
            {location.pathname.replace("/", "") || "Home"}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-white font-medium" data-testid="header-user-name">{user?.name}</div>
              <div className="text-[10px] tracking-widest uppercase text-[#d4af37]" data-testid="header-user-code">
                {user?.referral_code}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost-gold !py-2 !px-4 !text-xs flex items-center gap-2"
              data-testid="logout-btn"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" data-testid="main-content">{children}</main>

        <nav className="lg:hidden border-t border-[#1a1a1a] grid grid-cols-5 text-xs" style={{ background: "#0a0a0a" }}>
          {userLinks.slice(0, 5).map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 gap-1 ${isActive ? "text-[#d4af37]" : "text-zinc-500"}`
                }
              >
                <Icon size={16} />
                <span className="text-[10px]">{l.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
