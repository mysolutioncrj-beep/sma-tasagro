import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [cat, setCat] = useState("");

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/offers").then((r) => setOffers(r.data));
  }, []);

  useEffect(() => {
    const url = cat ? `/products?category_id=${cat}` : "/products";
    api.get(url).then((r) => setProducts(r.data));
  }, [cat]);

  const addToCart = (p) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((c) => c.product_id === p.product_id);
    if (existing) existing.quantity += 1;
    else cart.push({ product_id: p.product_id, name: p.name, price: p.price, image: p.image, quantity: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success(`${p.name} added to cart`);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto" data-testid="shop-page">
      <div className="overline mb-2">Store</div>
      <h1 className="text-4xl font-black mb-2">Agro Shop</h1>
      <p className="text-sm text-zinc-500 mb-6">Premium agro products. Every order funds your team's profit share.</p>

      {offers.length > 0 && (
        <div className="mb-8 relative border gold-border p-8 bg-gradient-to-r from-[#121212] to-[#1a1a1a] overflow-hidden" data-testid="offer-banner">
          <div className="overline mb-2">Limited Offer</div>
          <div className="text-2xl font-black">{offers[0].title}</div>
          <div className="text-sm text-zinc-500 mt-1">Tap any product to claim — offer auto-applies at checkout.</div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setCat("")}
          className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border ${
            !cat ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10" : "border-[#222] text-zinc-500 hover:text-white"
          }`}
          data-testid="category-all"
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.category_id}
            onClick={() => setCat(c.category_id)}
            className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border ${
              cat === c.category_id ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10" : "border-[#222] text-zinc-500 hover:text-white"
            }`}
            data-testid={`category-${c.slug}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <div key={p.product_id} className="card-dark overflow-hidden group" data-testid={`product-${p.product_id}`}>
            <div className="aspect-square overflow-hidden bg-black relative">
              {p.image && (
                <img src={p.image} alt={p.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" />
              )}
            </div>
            <div className="p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Agro</div>
              <div className="text-sm font-bold text-white mt-1 line-clamp-2">{p.name}</div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-[#d4af37] font-black">{formatINR(p.price)}</div>
                <button
                  onClick={() => addToCart(p)}
                  className="btn-ghost-gold !py-1.5 !px-3 !text-[10px] flex items-center gap-1"
                  data-testid={`add-to-cart-${p.product_id}`}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
