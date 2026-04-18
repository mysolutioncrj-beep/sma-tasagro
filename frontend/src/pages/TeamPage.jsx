import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { formatINR, shortDate } from "@/lib/format";
import { UserPlus } from "lucide-react";

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/user/team").then((r) => {
      setTeam(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="team-page">
      <div className="overline mb-2">My Team</div>
      <h1 className="text-4xl font-black mb-2">Direct Referrals</h1>
      <p className="text-sm text-zinc-500 mb-8">{team.length} members directly sponsored by you</p>

      <div className="card-dark overflow-hidden">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <div className="col-span-4">Member</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Pos</div>
          <div className="col-span-2">Kit</div>
          <div className="col-span-2">Joined</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-zinc-500 text-sm">Loading…</div>
        ) : team.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={28} color="#d4af37" className="mx-auto mb-3" />
            <div className="text-zinc-400 text-sm">You haven't referred anyone yet.</div>
            <div className="text-zinc-600 text-xs mt-1">Share your referral link to start building your network.</div>
          </div>
        ) : (
          team.map((m) => (
            <div key={m.id} className="grid grid-cols-12 px-6 py-4 border-b border-[#141414] last:border-0 hover:bg-[#0f0f0f]" data-testid={`team-row-${m.id}`}>
              <div className="col-span-4">
                <div className="text-white font-medium">{m.name}</div>
                <div className="text-xs text-zinc-500">{m.email}</div>
              </div>
              <div className="col-span-2 font-mono text-[#d4af37] text-sm">{m.referral_code}</div>
              <div className="col-span-2 text-sm text-zinc-400">{m.position || "—"}</div>
              <div className="col-span-2">
                <span className={`text-xs px-2 py-1 ${m.kit_purchased ? "bg-[#d4af37]/10 text-[#d4af37]" : "bg-zinc-900 text-zinc-500"}`}>
                  {m.kit_purchased ? "Active" : "Pending"}
                </span>
              </div>
              <div className="col-span-2 text-xs text-zinc-500">{shortDate(m.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
