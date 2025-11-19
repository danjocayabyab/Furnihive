// src/admin/api/adminApi.js
// Supabase-backed implementation for seller applications

import { supabase } from "../../lib/supabaseClient";

const mapStatus = (s) => {
  const v = (s || "pending").toString().toLowerCase();
  if (v === "reviewing") return "pending";
  return v;
};

// Helper to coerce id into the right type for queries
const normalizeId = (id) => {
  const asNumber = Number(id);
  return Number.isNaN(asNumber) ? id : asNumber;
};

// Return ALL by default; ApplicationsPage will filter by status client-side.
// Each item is mapped into the shape ApplicationsPage expects.
export async function listApplications(_status = "all") {
  const { data, error } = await supabase
    .from("store_verifications")
    .select("id, seller_id, status, created_at, notes, contact_email, contact_phone, location")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = data || [];

  // Fetch store names for all seller_ids to show as application title
  const sellerIds = rows.map((row) => row.seller_id).filter(Boolean);
  let storeNamesById = {};
  if (sellerIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, store_name")
      .in("id", sellerIds);
    (profs || []).forEach((p) => {
      if (p?.id) storeNamesById[p.id] = p.store_name || null;
    });
  }

  return rows.map((row) => ({
    _id: row.id?.toString?.() ?? String(row.id),
    // Prefer the seller's store name; fall back to location, then notes
    companyName:
      storeNamesById[row.seller_id] || row.location || row.notes || "Seller Application",
    email: row.contact_email || "", // shown in ApplicationsPage + modal
    businessType: "Seller",
    location: row.location || "",
    status: mapStatus(row.status),
  }));
}

// Admin: list products with basic info and cover image
export async function listProductsForAdmin({ limit = 100, search = "" } = {}) {
  const sel =
    "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, created_at, featured_rank, hero_rank";
  let q = supabase.from("products").select(sel).order("created_at", { ascending: false }).limit(limit);
  if (search) {
    // simple ilike on name
    q = q.ilike("name", `%${search}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];

  // cover images
  const ids = rows.map((r) => r.id);
  let coverById = {};
  if (ids.length) {
    const { data: imgs } = await supabase
      .from("product_images")
      .select("product_id, url, path, is_primary, position, created_at")
      .in("product_id", ids)
      .order("is_primary", { ascending: false })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    (imgs || []).forEach((row) => {
      if (!coverById[row.product_id]) coverById[row.product_id] = { url: row.url, path: row.path };
    });
  }

  const IMAGES_PUBLIC = String(import.meta.env.VITE_PRODUCT_IMAGES_PUBLIC || "false").toLowerCase() === "true";
  const out = [];
  for (const r of rows) {
    const entry = coverById[r.id] || null;
    let image = "";
    if (entry?.url) image = entry.url;
    else if (entry?.path) {
      if (IMAGES_PUBLIC) {
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(entry.path);
        image = pub?.publicUrl || "";
      } else {
        try {
          const { data: signed } = await supabase.storage
            .from("product-images")
            .createSignedUrl(entry.path, 3600);
          image = signed?.signedUrl || "";
        } catch {
          image = "";
        }
      }
    }
    out.push({
      id: r.id,
      title: r.name || "Untitled",
      price: Number(r.base_price ?? 0),
      category: r.category || "",
      status: r.status || "",
      stock_qty: r.stock_qty ?? null,
      featured_rank: r.featured_rank ?? 0,
      hero_rank: r.hero_rank ?? 0,
      image:
        image ||
        "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
      created_at: r.created_at,
    });
  }
  return out;
}

// Admin: update a product's featured_rank
export async function updateFeaturedRank(productId, rank) {
  const { data, error } = await supabase
    .from("products")
    .update({ featured_rank: Number(rank) || 0 })
    .eq("id", productId)
    .select("id, featured_rank")
    .maybeSingle();
  if (error) throw error;
  return { id: data?.id || productId, featured_rank: data?.featured_rank ?? 0 };
}

// Admin: update a product's hero_rank (used for homepage hero slideshow)
export async function updateHeroRank(productId, rank) {
  const { data, error } = await supabase
    .from("products")
    .update({ hero_rank: Number(rank) || 0 })
    .eq("id", productId)
    .select("id, hero_rank")
    .maybeSingle();
  if (error) throw error;
  return { id: data?.id || productId, hero_rank: data?.hero_rank ?? 0 };
}

// Load a single application with more detail for the modal.
// We fetch the verification first, then (optionally) enrich from profiles.
export async function getApplication(id) {
  const appId = normalizeId(id);

  const { data, error } = await supabase
    .from("store_verifications")
    .select("id, seller_id, status, created_at, notes, files, contact_email, contact_phone, location")
    .eq("id", appId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Not found");

  let profile = null;
  if (data.seller_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("store_name, phone")
      .eq("id", data.seller_id)
      .maybeSingle();
    profile = prof || null;
  }

  const status = mapStatus(data.status);

  return {
    _id: data.id?.toString?.() ?? String(data.id),
    // Prefer the seller's store name; fall back to location or notes
    companyName:
      profile?.store_name ||
      data.location ||
      data.notes ||
      "Seller Application",
    email: data.contact_email || "", // comes from seller verification form
    businessType: "Seller",
    location: data.location || "",
    status,
    // Fields used by ApplicationModal (with safe fallbacks)
    phone: data.contact_phone || profile?.phone || "",
    address: "",
    submittedAt: data.created_at
      ? new Date(data.created_at).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "",
    description: data.notes || "",
    documents: data.files || [],
  };
}

// Update verification status and, when approved, flag seller as verified.
export async function updateStatus(id, status) {
  const appId = normalizeId(id);
  const next = mapStatus(status);

  const { data, error } = await supabase
    .from("store_verifications")
    .update({ status: next })
    .eq("id", appId)
    .select("id, seller_id, status")
    .single();

  if (error) throw error;

  // Keep seller profile in sync with application decision.
  if (data?.seller_id) {
    // This assumes profiles.id references auth.users.id
    if (next === "approved") {
      await supabase
        .from("profiles")
        .update({ seller_approved: true })
        .eq("id", data.seller_id);
    } else if (next === "rejected") {
      await supabase
        .from("profiles")
        .update({ seller_approved: false })
        .eq("id", data.seller_id);
    }
  }

  return {
    _id: data.id?.toString?.() ?? String(data.id),
    status: mapStatus(data.status),
  };
}

// List users (buyers and sellers) from profiles table for Admin Users tab
// Maps into the shape expected by UsersPage UI.
export async function listUsers() {
  // Prefer secure RPC which joins auth.users (email) with profiles, admin-gated by RLS
  const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_list_users");

  let rows = null;
  // Prefer RPC, but only if it includes the suspended flag we rely on.
  if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length && "suspended" in rpcData[0]) {
    rows = rpcData;
  } else {
    // Fallback: read from profiles directly so we always have suspended.
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, role, seller_approved, first_name, last_name, phone, store_name, avatar_url, created_at, last_active, suspended, email, location"
      )
      .order("created_at", { ascending: false });
    if (error) throw (rpcErr || error);
    rows = data || [];
  }

  const toName = (p) => {
    const role = String(p.role || "").toLowerCase();
    if (role === "seller" && p.store_name) return p.store_name;
    const fn = p.first_name || "";
    const ln = p.last_name || "";
    const full = `${fn} ${ln}`.trim();
    return full || "Unnamed User";
  };

  return rows.map((p) => ({
    id: p.id,
    name: toName(p),
    email: p.email || "",
    location: p.location || "",
    role: String(p.role || "buyer").toLowerCase() === "seller" ? "seller" : "customer",
    status: p.suspended ? "suspended" : "active", // Suspended flag from profiles
    joinDate: (() => {
      const ts = p.created_at || p.join_date || new Date().toISOString();
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    })(),
    days: (() => {
      const ts = p.created_at || p.join_date || new Date().toISOString();
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return 0;
      const diffMs = Date.now() - d.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    })(),
    lastActive: (() => {
      const ts = p.last_active || p.created_at || p.join_date || new Date().toISOString();
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    })(),
    orders: 0,
    spent: 0,
    sales: 0,
    revenue: 0,
    phone: p.phone || "",
    avatarUrl: p.avatar_url || "",
  }));
}

// Toggle user suspension in profiles so admin Suspend button is persisted.
export async function toggleUserSuspension(userId, suspend) {
  if (!userId) throw new Error("Missing user id");

  const { data, error } = await supabase
    .from("profiles")
    .update({ suspended: !!suspend })
    .eq("id", userId)
    .select("id, suspended")
    .maybeSingle();

  if (error) throw error;

  return {
    id: data?.id || userId,
    status: data?.suspended ? "suspended" : "active",
  };
}
