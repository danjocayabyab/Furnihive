// src/admin/api/adminApi.js (mock)

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const mapStatus = (s) => {
  const v = (s || "pending").toString().toLowerCase();
  if (v === "reviewing") return "pending";   // remove "reviewing" from the system
  return v;
};

let APPS = [
  {
    _id: "a1",
    companyName: "Manila Furniture Co.",
    email: "contact@manilafurniture.com",
    businessType: "Manufacturer",
    location: "Manila, Philippines",
    status: "pending",
  },
  {
    _id: "a2",
    companyName: "Cebu Wood Works",
    email: "info@cebuwood.com",
    businessType: "Retailer",
    location: "Cebu, Philippines",
    status: "pending",
  },
  {
    _id: "a3",
    companyName: "Modern Living Solutions",
    email: "hello@modernliving.ph",
    businessType: "Distributor",
    location: "Makati, Philippines",
    status: "reviewing", // will be mapped to "pending"
  },
];

// Return ALL by default; optionally filter by a status
export async function listApplications(status = "all") {
  await delay(300);
  const data = APPS.map((a) => ({ ...a, status: mapStatus(a.status) }));
  if (status === "all") return data;
  return data.filter((a) => a.status === mapStatus(status));
}

export async function getApplication(id) {
  await delay(120);
  const found = APPS.find((a) => a._id === id);
  if (!found) throw new Error("Not found");
  return { ...found, status: mapStatus(found.status) };
}

export async function updateStatus(id, status) {
  await delay(120);
  const next = mapStatus(status);
  APPS = APPS.map((a) => (a._id === id ? { ...a, status: next } : a));
  const updated = APPS.find((a) => a._id === id);
  return { ...updated, status: mapStatus(updated.status) };
}
