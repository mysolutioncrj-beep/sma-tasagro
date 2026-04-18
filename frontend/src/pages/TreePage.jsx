import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

// Render binary tree as a fixed-depth level grid (non-recursive JSX to avoid babel traversal issues)
export default function TreePage() {
  const [tree, setTree] = useState(null);

  useEffect(() => {
    api.get("/user/tree?depth=4").then((r) => setTree(r.data));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="tree-page">
      <div className="overline mb-2">Genealogy</div>
      <h1 className="text-4xl font-black mb-2">Binary Network Tree</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Each node shows a member in your placement tree. Left and Right legs spill over automatically.
      </p>

      <div className="card-dark p-6 overflow-x-auto" style={{ background: "#050505" }}>
        {tree ? <LevelGrid root={tree} /> : <div className="text-zinc-500 text-sm py-12 text-center">Loading tree…</div>}
      </div>
    </div>
  );
}

function collectLevels(root, maxLevels = 5) {
  // returns levels array, where levels[i] is an array of size 2^i, each item = node or null
  const levels = [];
  levels.push([root]);
  for (let i = 1; i < maxLevels; i++) {
    const prev = levels[i - 1];
    const next = [];
    for (let j = 0; j < prev.length; j++) {
      const n = prev[j];
      next.push(n ? n.left : null);
      next.push(n ? n.right : null);
    }
    levels.push(next);
  }
  return levels;
}

function LevelGrid({ root }) {
  const levels = collectLevels(root, 5);
  const maxCols = levels[levels.length - 1].length;

  return (
    <div className="min-w-[960px]" data-testid="tree-grid">
      {levels.map((row, rIdx) => (
        <div key={rIdx} className="grid gap-2 mb-6" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}>
          {row.map((node, cIdx) => {
            const span = maxCols / row.length;
            return (
              <div
                key={cIdx}
                style={{ gridColumn: `span ${span} / span ${span}` }}
                className="flex justify-center"
              >
                <NodeCard node={node} isRoot={rIdx === 0} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function NodeCard({ node, isRoot }) {
  if (!node) {
    return (
      <div className="tree-node inactive" data-testid="tree-empty" style={{ opacity: 0.35 }}>
        <div className="text-[10px] uppercase tracking-widest text-zinc-600">Empty</div>
      </div>
    );
  }
  return (
    <div className={`tree-node ${node.kit_purchased ? "" : "inactive"}`} data-testid={`tree-node-${node.id}`}>
      <div className="text-sm font-bold text-white truncate max-w-[140px]">{node.name}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#d4af37] font-mono">{node.referral_code}</div>
      <div className="text-[10px] text-zinc-500 mt-1">
        {isRoot ? "ROOT" : node.position ? `Pos ${node.position}` : ""} ·{" "}
        {node.kit_purchased ? "Active" : "Inactive"}
      </div>
    </div>
  );
}
