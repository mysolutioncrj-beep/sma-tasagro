import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./apiClient";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=anon, object=user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data?.access_token && typeof window !== "undefined") {
      window.localStorage.setItem("access_token", data.access_token);
    }
    setUser(data);
    return data;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data?.access_token && typeof window !== "undefined") {
      window.localStorage.setItem("access_token", data.access_token);
    }
    setUser(data);
    return data;
  };
  const logout = async () => {
    await api.post("/auth/logout");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token");
    }
    setUser(false);
  };
  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
