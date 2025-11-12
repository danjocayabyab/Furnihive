import { Outlet, useNavigate } from "react-router-dom";
import SellerTopbar from "../components/seller/SellerTopbar.jsx";

export default function SellerLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--cream-50)]">
      {/* Seller Topbar */}
      <SellerTopbar
        onNavigateSettings={() => navigate("/seller/settings")}
        onNavigateDashboard={() => navigate("/seller")}
        onNavigateMessages={() => navigate("/seller/messages")}
      />

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
