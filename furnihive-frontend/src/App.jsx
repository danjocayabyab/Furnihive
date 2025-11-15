// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

/* ---------- Auth Pages ---------- */
import Login from "./pages/auth/Login.jsx";
import Signup from "./pages/auth/Signup.jsx";

/* ---------- User Layout + Pages ---------- */
import UserLayout from "./layouts/UserLayout.jsx";
import Home from "./pages/user/Home.jsx";
import Shop from "./pages/user/Shop.jsx";
import ProductDetail from "./pages/user/ProductDetail.jsx";
import Profile from "./pages/user/Profile.jsx";
import AccountSettings from "./pages/user/AccountSettings.jsx";
import Messages from "./pages/user/Messages.jsx";
import Cart from "./pages/user/Cart.jsx";
import Checkout, { CheckoutSuccess } from "./pages/user/Checkout.jsx";

/* ---------- Seller Layout + Pages ---------- */
import SellerLayout from "./layouts/SellerLayout.jsx";
import SellerDashboard from "./pages/seller/Dashboard.jsx";
import Inventory from "./pages/seller/Inventory.jsx"; 
import SellerOrders from "./pages/seller/Orders.jsx";
import SellerPromotions from "./pages/seller/Promotions.jsx"; 
import SellerAnalytics from "./pages/seller/Analytics.jsx";
import SellerEngagement from "./pages/seller/Engagement.jsx";
import SellerMessages from "./pages/seller/Messages.jsx";
import SellerSettings from "./pages/seller/Settings.jsx";



/* ---------- Admin Layout + Pages ---------- */
import AdminLayout from "./admin/AdminLayout";
import AdminLogin from "./admin/AdminLogin";

/* ---------- Role Protection ---------- */
import { useAuth } from "./components/contexts/AuthContext.jsx";

function RequireAuth({ children }) {
  const { loading, user } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LogoutRoute() {
  // Lightweight route component to clear session and send user to login
  return (
    <RequireAuth>
      {(() => {
        // Side-effect inside IIFE to avoid hooks
        try {
          // Call our logout util via a dynamic import to avoid circular deps
          import("./lib/auth.js").then(({ logout }) => logout());
        } catch {}
        return <Navigate to="/login" replace />;
      })()}
    </RequireAuth>
  );
}

function RequireRole({ role, children }) {
  const { loading, user, profile, isAdmin } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) {
    // Admins go to admin login, others to user login
    return <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />;
  }

  if (role === "admin") {
    // Only allow if flagged in admins table
    if (!isAdmin) return <Navigate to="/admin/login" replace />;
    return children;
  }

  const effectiveRole = user?.user_metadata?.role || profile?.role || "buyer";
  if (role && effectiveRole !== role) {
    return <Navigate to={effectiveRole === "seller" ? "/seller" : "/home"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ---------- Auth Routes ---------- */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/logout" element={<LogoutRoute />} />

      {/* ---------- Buyer (User) Routes ---------- */}
      <Route element={<UserLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/settings" element={<AccountSettings />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
      </Route>

      {/* ---------- Seller Routes (nested under /seller) ---------- */}
      <Route
        path="/seller"
        element={
          <RequireRole role="seller">
            <SellerLayout />
          </RequireRole>
        }
      >
        <Route index element={<SellerDashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="promotions" element={<SellerPromotions />} />
        <Route path="analytics" element={<SellerAnalytics />} />
        <Route path="engagement" element={<SellerEngagement />} />
        <Route path="messages" element={<SellerMessages />} />
        <Route path="settings" element={<SellerSettings />} />
      </Route>


      {/* ---------- Admin Routes ---------- */}
      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />

      
      {/* ---------- Fallback ---------- */}
      <Route path="*" element={<div className="p-8">Not Found</div>} />
    </Routes>
  );
}
