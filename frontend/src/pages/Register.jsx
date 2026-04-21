import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { formatApiErrorDetail } from "@/lib/apiClient";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    sponsor_code: params.get("ref") || "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        sponsor_code: form.sponsor_code || null,
      });
      toast.success(`Welcome, ${u.name}! Your code: ${u.referral_code}`);
      navigate("/dashboard");
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="register-page">
      <div className="flex items-center justify-center p-8 order-2 md:order-1" style={{ background: "#050505" }}>
        <form onSubmit={submit} className="w-full max-w-md" data-testid="register-form">
          <div className="overline mb-4">Join Network</div>
          <h2 className="text-3xl font-black mb-8">Create your account</h2>

          <Field label="Full Name">
            <input
              required
              value={form.name}
              onChange={onChange("name")}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="register-name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={onChange("email")}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="register-email"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={onChange("phone")}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="register-phone"
            />
          </Field>
          <Field label="Password (min 6 chars)">
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={onChange("password")}
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none"
              data-testid="register-password"
            />
          </Field>
          <Field label="Sponsor Referral Code (optional)">
            <input
              value={form.sponsor_code}
              onChange={onChange("sponsor_code")}
              placeholder="e.g. ADMIN001"
              className="w-full bg-black border border-[#222] focus:border-[#d4af37] text-white px-4 py-3 outline-none uppercase"
              data-testid="register-sponsor"
            />
          </Field>

          {err && <div className="text-sm text-red-400 mb-4" data-testid="register-error">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full disabled:opacity-60"
            data-testid="register-submit"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <div className="mt-6 text-sm text-zinc-500">
            Already a member?{" "}
            <Link to="/login" className="text-[#d4af37] hover:underline" data-testid="link-to-login">
              Sign in
            </Link>
          </div>
        </form>
      </div>

      <div className="relative hidden md:block order-1 md:order-2">
        <img
          src="https://images.unsplash.com/photo-1761437856299-af640f6e75ad?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85"
          alt="Gold"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(225deg, rgba(5,5,5,0.55), rgba(5,5,5,0.95))" }} />
        <div className="relative z-10 p-12 h-full flex flex-col justify-between">
          <Link to="/" className="flex items-center gap-3 justify-end">
            <div>
              <div className="text-[11px] tracking-[0.32em] text-[#d4af37] font-bold uppercase text-right">SMA-TasAgro</div>
              <div className="text-xs text-zinc-500 text-right">Wealth Network</div>
            </div>
            <img src="https://customer-assets.emergentagent.com/job_mlm-kit-commerce/artifacts/tv5jynvy_WhatsApp%20Image%202026-04-21%20at%203.23.17%20PM%20%281%29.jpeg" alt="SMA-TasAgro" className="w-12 h-12 object-contain rounded-sm bg-white p-1" />
          </Link>
          <div className="text-right">
            <div className="overline mb-4 justify-end">Begin your journey</div>
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              Every member gets <br /><span className="text-[#d4af37]">a network.</span>
            </h1>
            <p className="mt-4 text-zinc-400 max-w-md ml-auto">
              Join with a sponsor code to get auto-placed in the binary tree — or join as root and build your own empire.
            </p>
          </div>
        </div>
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
