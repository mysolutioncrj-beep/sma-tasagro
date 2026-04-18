import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import TreePage from "@/pages/TreePage";
import TeamPage from "@/pages/TeamPage";
import IncomePage from "@/pages/IncomePage";
import Shop from "@/pages/Shop";
import Cart from "@/pages/Cart";
import OrdersPage from "@/pages/OrdersPage";
import WithdrawPage from "@/pages/WithdrawPage";
import BuyKit from "@/pages/BuyKit";
import AdminPanel from "@/pages/AdminPanel";
import AppShell from "@/components/AppShell";

function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function UserShell({ children }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster theme="dark" position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={<Protected><UserShell><Dashboard /></UserShell></Protected>} />
            <Route path="/tree" element={<Protected><UserShell><TreePage /></UserShell></Protected>} />
            <Route path="/team" element={<Protected><UserShell><TeamPage /></UserShell></Protected>} />
            <Route path="/income" element={<Protected><UserShell><IncomePage /></UserShell></Protected>} />
            <Route path="/shop" element={<Protected><UserShell><Shop /></UserShell></Protected>} />
            <Route path="/cart" element={<Protected><UserShell><Cart /></UserShell></Protected>} />
            <Route path="/orders" element={<Protected><UserShell><OrdersPage /></UserShell></Protected>} />
            <Route path="/withdraw" element={<Protected><UserShell><WithdrawPage /></UserShell></Protected>} />
            <Route path="/buy-kit" element={<Protected><UserShell><BuyKit /></UserShell></Protected>} />

            <Route path="/admin" element={<Protected adminOnly><UserShell><AdminPanel /></UserShell></Protected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
