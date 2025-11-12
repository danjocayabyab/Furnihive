import { Outlet } from "react-router-dom";
import UserNavbar from "../components/navbar/UserNavbar.jsx";
import SiteFooter from "../components/footer/SiteFooter.jsx";
import { CartProvider } from "../components/contexts/CartContext.jsx";

export default function UserLayout(){
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-[var(--cream-50)]">
        <UserNavbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </CartProvider>
  );
}
