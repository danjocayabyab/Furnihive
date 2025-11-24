// src/pages/seller/Inventory.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Status from "../../components/seller/Status.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import toast from "react-hot-toast";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function Inventory() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [menu, setMenu] = useState(null); // id for 3-dot menu
  const [view, setView] = useState(null); // product object
  const [edit, setEdit] = useState(null); // product object
  const [confirm, setConfirm] = useState(null); // id to delete
  const [add, setAdd] = useState(false); // new add modal

  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") {
        setMenu(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select(
            `id, seller_id, name, description, category, base_price, status,
             sku, length_cm, width_cm, height_cm, stock_qty, material, weight_kg, color,
             product_images ( url, is_primary, position ),
             inventory_items ( quantity_on_hand )`
          )
          .eq("seller_id", authUser.id)
          .neq("status", "archived")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const mapped = (data || []).map((p) => {
          const imgs = (p.product_images || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const primary = imgs.find((i) => i.is_primary) || imgs[0] || null;
          return {
            id: p.id,
            title: p.name,
            category: p.category || "Uncategorized",
            description: p.description || "",
            price: p.base_price,
            stock: (p.stock_qty ?? null) != null ? p.stock_qty : (p.inventory_items?.[0]?.quantity_on_hand ?? 0),
            views: 0,
            sold: 0,
            sku: p.sku || "",
            active: p.status === "active",
            image: primary?.url || "",
            images: imgs.map((i) => i.url),
            length: p.length_cm ?? 0,
            width: p.width_cm ?? 0,
            height: p.height_cm ?? 0,
            material: p.material || "",
            weight_kg: p.weight_kg ?? 0,
            color: p.color || "",
          };
        });
        if (!cancelled) setItems(mapped);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load inventory", e);
          toast.error(e?.message || "Failed to load inventory.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((p) => (p.stock ?? 0) > 0).length;
    const low = items.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 2).length;
    const oos = items.filter((p) => (p.stock ?? 0) === 0).length;
    return { total, active, low, oos };
  }, [items]);

  const toggleActive = async (id, currentActive) => {
    if (!authUser?.id) return;
    try {
      const newStatus = currentActive ? "inactive" : "active";
      const { error: statusErr } = await supabase
        .from("products")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("seller_id", authUser.id);
      if (statusErr) throw statusErr;

      setItems((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                active: !currentActive,
              }
            : p,
        ),
      );
      toast.success(newStatus === "active" ? "Product activated." : "Product deactivated.");
    } catch (e) {
      console.error("Toggle product status failed", e);
      toast.error(e?.message || "Failed to update product status.");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((p) => {
      const okQ =
        !s ||
        p.title.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s);
      const okC = category === "All" || p.category === category;
      return okQ && okC;
    });
  }, [items, q, category]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items]
  );

  const updateItem = async (id, changes) => {
    if (!authUser?.id) return;
    try {
      const productPayload = {
        name: changes.title,
        description: changes.description,
        category: changes.category,
        base_price: changes.price,
        sku: changes.sku,
        length_cm: changes.length,
        width_cm: changes.width,
        height_cm: changes.height,
        material: changes.material,
        weight_kg: changes.weight_kg,
        color: changes.color,
      };
      if (typeof changes.stock === "number") {
        productPayload.stock_qty = changes.stock;
      }
      const { error: prodErr } = await supabase
        .from("products")
        .update(productPayload)
        .eq("id", id)
        .eq("seller_id", authUser.id);
      if (prodErr) throw prodErr;

      if (typeof changes.stock === "number") {
        const { data: invRow, error: invSelErr } = await supabase
          .from("inventory_items")
          .select("id")
          .eq("product_id", id)
          .eq("seller_id", authUser.id)
          .maybeSingle();
        if (!invSelErr) {
          if (invRow?.id) {
            const { error: invErr } = await supabase
              .from("inventory_items")
              .update({ quantity_on_hand: changes.stock })
              .eq("id", invRow.id);
            if (invErr) throw invErr;
          } else {
            const { error: invInsErr } = await supabase
              .from("inventory_items")
              .insert({
                seller_id: authUser.id,
                product_id: id,
                quantity_on_hand: changes.stock,
              });
            if (invInsErr) throw invInsErr;
          }
        }
      }

      // Handle images: keep selected existing ones and append any newly uploaded files
      let finalImages = null;
      const keptExisting = Array.isArray(changes.existingImages)
        ? changes.existingImages.filter(Boolean)
        : [];
      const newFiles = Array.isArray(changes.files) ? changes.files.filter(Boolean) : [];

      if (keptExisting.length || newFiles.length) {
        // Upload any new files
        const uploads = newFiles.map(async (file, index) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
          const path = `${authUser.id}/${id}/${Date.now()}-${index}-${safeName}`;
          const { error: uploadErr } = await supabase
            .storage
            .from("product-images")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });
          if (uploadErr) throw uploadErr;
          const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
          const url = pub?.publicUrl || null;
          if (!url) throw new Error("Failed to get public URL for image.");
          return url;
        });

        const uploadedUrls = uploads.length ? await Promise.all(uploads) : [];
        finalImages = [...keptExisting, ...uploadedUrls];

        // Sync product_images table to match finalImages set
        const { data: currentRows, error: currentErr } = await supabase
          .from("product_images")
          .select("id, url")
          .eq("product_id", id);
        if (currentErr) throw currentErr;

        const currentByUrl = new Map((currentRows || []).map((r) => [r.url, r]));
        const keepSet = new Set(finalImages);

        // Delete rows that are no longer referenced
        const toDeleteIds = (currentRows || [])
          .filter((r) => !keepSet.has(r.url))
          .map((r) => r.id);
        if (toDeleteIds.length) {
          const { error: delErr } = await supabase
            .from("product_images")
            .delete()
            .in("id", toDeleteIds);
          if (delErr) throw delErr;
        }

        // Ensure each image in finalImages has the right position and primary flag
        for (let index = 0; index < finalImages.length; index++) {
          const url = finalImages[index];
          const is_primary = index === 0;
          const existing = currentByUrl.get(url);
          if (existing) {
            const { error: updErr } = await supabase
              .from("product_images")
              .update({ is_primary, position: index })
              .eq("id", existing.id);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase
              .from("product_images")
              .insert({
                product_id: id,
                url,
                is_primary,
                position: index,
              });
            if (insErr) throw insErr;
          }
        }
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                ...changes,
                image: finalImages ? finalImages[0] : i.image,
                images: finalImages || i.images,
              }
            : i
        )
      );
      toast.success("Product updated.");
    } catch (e) {
      console.error("Update product failed", e);
      toast.error(e?.message || "Failed to update product.");
    }
  };

  const removeItem = async (id) => {
    if (!authUser?.id) return;
    try {
      // First remove related inventory and images, then delete the product
      const { error: invErr } = await supabase
        .from("inventory_items")
        .delete()
        .eq("product_id", id)
        .eq("seller_id", authUser.id);
      if (invErr) throw invErr;

      const { error: imgErr } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", id);
      if (imgErr) throw imgErr;

      const { error: prodErr } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("seller_id", authUser.id);
      if (prodErr) throw prodErr;
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Product deleted.");
    } catch (e) {
      console.error("Archive product failed", e);
      toast.error(e?.message || "Failed to delete product.");
    }
  };

  const addItem = async (data) => {
    if (!authUser?.id) return;
    try {
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .insert({
          seller_id: authUser.id,
          name: data.title,
          description: data.description,
          category: data.category,
          base_price: data.price,
          sku: data.sku,
          length_cm: data.length,
          width_cm: data.width,
          height_cm: data.height,
          material: data.material,
          weight_kg: data.weight_kg,
          color: data.color,
          status: "active",
          stock_qty: data.stock,
        })
        .select("id, name, description, category, base_price, status, sku, length_cm, width_cm, height_cm, stock_qty, material, weight_kg, color")
        .single();
      if (prodErr) throw prodErr;

      const { data: invRow, error: invErr } = await supabase
        .from("inventory_items")
        .insert({
          seller_id: authUser.id,
          product_id: product.id,
          quantity_on_hand: data.stock,
        })
        .select("quantity_on_hand")
        .single();
      if (invErr) throw invErr;

      let imageUrls = [];
      if (Array.isArray(data.files) && data.files.length) {
        const uploads = data.files.map(async (file, index) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
          const path = `${authUser.id}/${product.id}/${Date.now()}-${index}-${safeName}`;
          const { error: uploadErr } = await supabase
            .storage
            .from("product-images")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });
          if (uploadErr) throw uploadErr;
          const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
          const url = pub?.publicUrl || null;
          if (!url) throw new Error("Failed to get public URL for image.");
          return { url, index };
        });

        const uploaded = await Promise.all(uploads);
        imageUrls = uploaded.map((u) => u.url);

        const rows = uploaded.map((u) => ({
          product_id: product.id,
          url: u.url,
          is_primary: u.index === 0,
          position: u.index,
        }));
        const { error: imgErr } = await supabase
          .from("product_images")
          .insert(rows);
        if (imgErr) throw imgErr;
      }

      const newItem = {
        id: product.id,
        title: product.name,
        category: product.category || "Uncategorized",
        description: product.description || "",
        price: product.base_price,
        stock: (product.stock_qty ?? null) != null ? product.stock_qty : (invRow.quantity_on_hand ?? 0),
        views: 0,
        sold: 0,
        sku: product.sku || "",
        active: product.status === "active",
        image: imageUrls[0] || "",
        images: imageUrls,
        length: product.length_cm ?? 0,
        width: product.width_cm ?? 0,
        height: product.height_cm ?? 0,
        material: product.material || "",
        weight_kg: product.weight_kg ?? 0,
        color: product.color || "",
      };
      setItems((prev) => [newItem, ...prev]);
      toast.success("Product added.");
    } catch (e) {
      console.error("Add product failed", e);
      toast.error(e?.message || "Failed to add product.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header + back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/seller")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          aria-label="Back"
          title="Back to Dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">
            Inventory Management
          </h1>
          <p className="text-xs text-gray-600">
            Track stock levels and manage inventory alerts
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total Products" value={loading ? "-" : stats.total} />
        <Metric label="Active" value={loading ? "-" : stats.active} />
        <Metric label="Low Stock" value={loading ? "-" : stats.low} />
        <Metric label="Out of Stock" value={loading ? "-" : stats.oos} />
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search products..."
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border border-[var(--line-amber)] bg-white px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product list */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)] flex justify-between items-center">
          <div>
            <div className="font-semibold text-[var(--brown-700)]">Product List</div>
            <div className="text-sm text-gray-600">
              Manage your furniture inventory
            </div>
          </div>
          <button
            onClick={() => setAdd(true)}
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
          >
            + Add Product
          </button>
        </div>

        <ul className="divide-y divide-[var(--line-amber)]/70">
          {filtered.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setView(p)}
                  className="flex flex-1 items-center gap-4 text-left hover:bg-[var(--cream-50)] rounded-xl px-2 py-1 -mx-2"
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-16 w-24 object-cover rounded-lg border border-[var(--line-amber)] flex-shrink-0"
                  />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-y-1 gap-x-4">
                    <div className="col-span-2">
                      <div className="font-medium text-[var(--brown-700)]">
                        {p.title}
                      </div>
                      <div className="text-xs text-gray-600">{p.category}</div>
                    </div>
                    <Info label="Price" value={<b>{peso(p.price)}</b>} />
                    <Info label="Stock" value={`${p.stock} ${p.stock === 1 ? "unit" : "units"}`} />
                    <Info label="SKU" value={p.sku || "—"} />
                    <Info label="Sold" value={p.sold} />
                  </div>
                </button>

                {/* 3-dots menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenu(menu === p.id ? null : p.id)}
                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--cream-50)] border border-[var(--line-amber)]"
                    aria-label="More"
                  >
                    ⋮
                  </button>
                  {menu === p.id && (
                    <Menu onClose={() => setMenu(null)}>
                      <MenuItem
                        onClick={async () => {
                          setMenu(null);
                          await toggleActive(p.id, p.active);
                        }}
                      >
                        {p.active ? "Deactivate" : "Activate"}
                      </MenuItem>
                      <MenuItem onClick={() => { setEdit(p); setMenu(null); }}>
                        Edit product
                      </MenuItem>
                      <MenuItem danger onClick={() => { setConfirm(p.id); setMenu(null); }}>
                        Delete
                      </MenuItem>
                    </Menu>
                  )}
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-600">
              No products found.
            </li>
          )}
        </ul>
      </div>

      {/* View details modal */}
      {view && (
        <Modal onClose={() => setView(null)} maxWidth="880px">
          <ViewProductDetails
            view={view}
            onClose={() => setView(null)}
            onEdit={(v) => {
              setEdit(v);
              setView(null);
            }}
            onToggleActive={async () => {
              await toggleActive(view.id, view.active);
              setView((prev) => (prev ? { ...prev, active: !prev.active } : prev));
            }}
          />
        </Modal>
      )}

      {/* Edit product modal */}
      {edit && (
        <EditModal
          item={edit}
          onCancel={() => setEdit(null)}
          onSave={async (updated) => {
            await updateItem(edit.id, updated);
            setEdit(null);
          }}
        />
      )}

      {/* Add product modal */}
      {add && (
        <EditModal
          item={{
            title: "",
            category: "Living Room",
            price: 0,
            stock: 0,
            length: 0,
            width: 0,
            height: 0,
            material: "",
            weight_kg: 0,
            color: "",
          }}
          onCancel={() => setAdd(false)}
          onSave={async (newItem) => {
            await addItem(newItem);
            setAdd(false);
          }}
        />
      )}

      {/* Delete confirm */}
      {confirm && (
        <Confirm
          title="Delete Product?"
          body="This product will be removed from your inventory."
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await removeItem(confirm);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function ViewProductDetails({ view, onClose, onEdit, onToggleActive }) {
  const [mainIndex, setMainIndex] = useState(0);
  const images = view.images && view.images.length ? view.images : (view.image ? [view.image] : []);
  const mainImage = images[mainIndex] || images[0] || "";

  return (
    <div className="space-y-4">
      {/* Image + basic header */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,3fr)] items-start">
        <div className="space-y-2">
          <div className="rounded-xl border border-[var(--line-amber)] overflow-hidden bg-[var(--cream-50)] flex items-center justify-center">
            <img
              src={mainImage}
              alt={view.title}
              className="max-h-96 w-auto max-w-full object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pt-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMainIndex(idx)}
                  className={`h-14 w-20 rounded-lg border ${
                    idx === mainIndex
                      ? "border-[var(--orange-600)]"
                      : "border-[var(--line-amber)] opacity-80"
                  } overflow-hidden flex-shrink-0 bg-white`}
                >
                  <img
                    src={img}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--brown-700)]">
              {view.title}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">{view.category}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-[var(--line-amber)] bg-[var(--cream-50)] p-3">
              <div className="text-xs text-gray-600">Price</div>
              <div className="mt-1 text-[var(--brown-700)] font-semibold">{peso(view.price)}</div>
            </div>
            <div className="rounded-lg border border-[var(--line-amber)] bg-[var(--cream-50)] p-3">
              <div className="text-xs text-gray-600">Stock</div>
              <div className="mt-1 text-[var(--brown-700)] font-semibold">{view.stock} units</div>
            </div>
            <div className="rounded-lg border border-[var(--line-amber)] bg-white p-3">
              <div className="text-xs text-gray-600">SKU</div>
              <div className="mt-1 text-[var(--brown-700)] font-semibold">{view.sku || "—"}</div>
            </div>
            <div className="rounded-lg border border-[var(--line-amber)] bg-white p-3">
              <div className="text-xs text-gray-600">Total Sold</div>
              <div className="mt-1 text-[var(--brown-700)] font-semibold">{view.sold}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 text-sm">
        <div className="text-xs text-gray-600 mb-1">Description</div>
        <div className="text-sm text-[var(--brown-700)] whitespace-pre-line">
          {view.description || "No description provided."}
        </div>
      </div>

      {/* Specifications */}
      <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 mt-3 text-sm">
        <div className="text-xs text-gray-600 mb-1">Specifications</div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Length (cm)" value={view.length != null ? `${view.length}` : "-"} />
          <Field label="Width (cm)" value={view.width != null ? `${view.width}` : "-"} />
          <Field label="Height (cm)" value={view.height != null ? `${view.height}` : "-"} />
          <Field label="Material" value={view.material || "-"} />
          <Field label="Weight (kg)" value={view.weight_kg != null ? `${view.weight_kg}` : "-"} />
          <Field label="Color" value={view.color || "-"} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
          onClick={onClose}
        >
          Close
        </button>
        <button
          className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
          onClick={onToggleActive}
        >
          {view.active ? "Deactivate" : "Activate"}
        </button>
        <button
          className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
          onClick={() => onEdit(view)}
        >
          Edit Product
        </button>
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xl">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Menu({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-40 rounded-xl border border-[var(--line-amber)] bg-white shadow z-30 overflow-hidden"
    >
      {children}
    </div>
  );
}
function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--cream-50)] ${
        danger ? "text-red-600" : "text-[var(--brown-700)]"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose, maxWidth = "640px" }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--line-amber)] bg-white p-5"
        style={{ maxWidth }}
      >
        <button
          className="absolute right-3 top-3 text-xl leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-[var(--brown-700)]">{value}</div>
    </div>
  );
}

function Confirm({ title, body, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} maxWidth="420px">
      <div className="space-y-3 text-center">
        <div className="text-3xl">🗑</div>
        <h2 className="text-lg font-semibold text-[var(--brown-700)]">{title}</h2>
        <p className="text-sm text-gray-600">{body}</p>
        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditModal({ item, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: item.title || "",
    category: item.category || "Living Room",
    description: item.description || "",
    price: item.price || 0,
    stock: item.stock || 0,
    sku: item.sku || "SKU-001",
    length: item.length || 0,
    width: item.width || 0,
    height: item.height || 0,
    material: item.material || "",
    weight_kg: item.weight_kg || 0,
    color: item.color || "",
    images: (() => {
      const imgs = item.images || (item.image ? [item.image] : []);
      return imgs.slice(0, 4);
    })(),
    files: [null, null, null, null],
  });

  const initialExistingImagesRef = useRef(
    (item.images || (item.image ? [item.image] : [])).slice(0, 4)
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageSlot = (index, e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => {
        const images = [...(prev.images || [])];
        const files = [...(prev.files || [])];
        images[index] = reader.result;
        files[index] = file;
        return { ...prev, images, files };
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImageAtIndex = (index) => {
    setForm((prev) => {
      const images = [...(prev.images || [])];
      const files = [...(prev.files || [])];
      images[index] = null;
      files[index] = null;
      return { ...prev, images, files };
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const initialExisting = initialExistingImagesRef.current || [];
    const keptExisting = [];

    (form.images || []).forEach((img, idx) => {
      if (!img) return;
      const file = (form.files || [])[idx];
      if (!file && initialExisting.includes(img)) {
        keptExisting.push(img);
      }
    });

    const allFiles = (form.files || []).filter(Boolean);
    const spaceLeft = Math.max(0, 4 - keptExisting.length);
    const validFiles = allFiles.slice(0, spaceLeft);

    if (!keptExisting.length && !validFiles.length) {
      alert("Please keep or upload at least one image for the product.");
      return;
    }
    onSave({
      title: form.title,
      category: form.category,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      length: Number(form.length) || 0,
      width: Number(form.width) || 0,
      height: Number(form.height) || 0,
      material: form.material,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      color: form.color,
      sku: form.sku,
      description: form.description,
      existingImages: keptExisting,
      files: validFiles,
    });
  };

  return (
    <Modal onClose={onCancel} maxWidth="720px">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--brown-700)]">
          {item.title ? "Edit Product" : "Add Product"}
        </h3>

        {/* Images Upload */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Product Images (up to 4)</label>
          <div className="w-full rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-3">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <label
                  key={idx}
                  className="relative h-28 rounded-lg border border-dashed border-[var(--line-amber)] bg-white flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  {form.images && form.images[idx] ? (
                    <>
                      <img
                        src={form.images[idx]}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          removeImageAtIndex(idx);
                        }}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Choose file</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleImageSlot(idx, e)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Name & Category */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Product Name</label>
            <input
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Category</label>
            <select
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option>Living Room</option>
              <option>Dining Room</option>
              <option>Bedroom</option>
              <option>Office</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-600">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
            placeholder="Describe your product..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {/* Specifications (includes dimensions and key attributes) */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Specifications</label>
          <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-3">
            <div className="grid md:grid-cols-3 gap-3">
              <DimInput label="Length (cm)" value={form.length} onChange={(v) => set("length", v)} />
              <DimInput label="Width (cm)" value={form.width} onChange={(v) => set("width", v)} />
              <DimInput label="Height (cm)" value={form.height} onChange={(v) => set("height", v)} />
              <div>
                <label className="text-xs text-gray-600">Material</label>
                <input
                  className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
                  value={form.material}
                  onChange={(e) => set("material", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Weight (kg)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
                  value={form.weight_kg}
                  onChange={(e) => set("weight_kg", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Color</label>
                <input
                  className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Price, Stock, SKU */}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-600">Price (₱)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Stock Quantity *</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">SKU (Optional)</label>
            <input
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
          >
            {item.title ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function DimInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <input
        type="number"
        className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
