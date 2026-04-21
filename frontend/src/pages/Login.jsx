import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { formatApiErrorDetail } from "@/lib/apiClient";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      <div className="relative hidden md:block">
        <img
          src="https://images.unsplash.com/photo-1764437358247-51f409686853?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85"
          alt="Gold"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(5,5,5,0.6), rgba(5,5,5,0.95))" }} />
        <div className="relative z-10 p-12 h-full flex flex-col justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="https://customer-assets.emergentagent.com/job_mlm-kit-commerce/artifacts/tv5jynvy_WhatsApp%20Image%202026-04-21%20at%203.23.17%20PM%20%281%29.jpeg" alt="SMA-TasAgro" className="w-12 h-12 object-contain rounded-sm bg-white p-1" />
            <div>
              <div className="text-[11px] tracking-[0.32em] text-[#d4af37] font-bold uppercase">SMA-TasAgro</div>
              <div className="text-xs text-zinc-500">Wealth Network</div>
            </div>
          </Link>
          <div>
            <div className="overline mb-4">Member Access</div>
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              Welcome to your <br /><span className="text-[#d4af37]">wealth portal.</span>
            </h1>
            <p className="mt-4 text-zinc-400 max-w-md">
              Track your wallet, team growth, cashback schedule and withdraw earnings — all in one premium dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8" style={{ background: "#050505" }}>
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="overline mb-4">Login</div>
          <h2 className="text-3xl font-black mb-8">Access your account</h2>

          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="login-email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="login-password"
            />
          </Field>

          {err && <div className="text-sm text-red-400 mb-4" data-testid="login-error">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full disabled:opacity-60"
            data-testid="login-submit"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-6 text-sm text-zinc-500">
            New member?{" "}
            <Link to="/register" className="text-[#d4af37] hover:underline" data-testid="link-to-register">
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">{label}</label>
      {children}
    </div>
  );
}
