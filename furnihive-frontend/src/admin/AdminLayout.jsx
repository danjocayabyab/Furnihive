import { useState } from "react";
import AdminTopbar from "./AdminTopbar";
import AdminTabs from "./AdminTabs";
import ApplicationsPage from "./ApplicationsPage";
import AnalyticsReports from "./AnalyticsReports";
import OrdersPage from "./OrdersPage";
import UsersPage from "./UsersPage";
import CustomerSupportPage from "./CustomerSupportPage";

export default function AdminLayout() {
  const [tab, setTab] = useState("applications");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--cream-50)]">
      {/* Topbar (already uses mx-auto max-w-6xl px-4) */}
      <AdminTopbar />

      {/* Tabs: aligned to topbar/container */}
      <div className="w-full">
        <div className="mx-auto max-w-6xl px-4">
          <div className="py-2">
            <AdminTabs active={tab} onChange={setTab} />
          </div>
        </div>
      </div>

      {/* Content: same container as tabs/topbar */}
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-6xl px-4 pb-6">
          {tab === "applications" && <ApplicationsPage />}
          {tab === "analytics" && <AnalyticsReports />}
          {tab === "orders" && <OrdersPage />}
          {tab === "users" && <UsersPage />}
          {tab === "support" && <CustomerSupportPage />}
        </div>
      </main>
    </div>
  );
}
