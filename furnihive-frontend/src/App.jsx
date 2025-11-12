// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
//almacengods
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
import SellerProducts from "./pages/seller/Products.jsx";
import Inventory from "./pages/seller/Inventory.jsx"; 
import SellerOrders from "./pages/seller/Orders.jsx";
import SellerPromotions from "./pages/seller/Promotions.jsx"; 
import SellerAnalytics from "./pages/seller/Analytics.jsx";
import SellerEngagement from "./pages/seller/Engagement.jsx";
import SellerMessages from "./pages/seller/Messages.jsx";
import SellerSettings from "./pages/seller/Settings.jsx";
/* ---------- Role Protection ---------- */
function RequireRole({ role, children }) {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("fh_user"));
  } catch {
    user = null;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    // redirect if logged in but wrong role
    return <Navigate to={user.role === "seller" ? "/seller" : "/home"} replace />;
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
        <Route index element={<SellerDashboard />} />                       {/* /seller */}
        <Route path="products" element={<SellerProducts />} />              {/* /seller/products */}
        <Route path="inventory" element={<Inventory />} />                  {/* /seller/inventory */}
        <Route path="/seller/orders" element={<SellerOrders />} />
        <Route path="/seller/promotions" element={<SellerPromotions />} />
        <Route path="/seller/analytics" element={<SellerAnalytics />} />
        <Route path="/seller/engagement" element={<SellerEngagement />} />
        <Route path="/seller/messages" element={<SellerMessages />} />
        <Route path="/seller/settings" element={<SellerSettings />} />
      </Route>

      {/* ---------- Fallback ---------- */}
      <Route path="*" element={<div className="p-8">Not Found</div>} />
    </Routes>
  );
}
