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

  return rows.map((row) => ({
    _id: row.id?.toString?.() ?? String(row.id),
    companyName: row.notes || "Seller Application",
    email: row.contact_email || "", // shown in ApplicationsPage + modal
    businessType: "Seller",
    location: row.location || "",
    status: mapStatus(row.status),
  }));
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
    submittedAt: data.created_at || "",
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
