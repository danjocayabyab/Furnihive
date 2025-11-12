import { useNavigate } from "react-router-dom";
import CategoryCard from "../../components/CategoryCard.jsx";
import ProductCard from "../../components/ProductCard.jsx";
import Button from "../../components/ui/Button.jsx";
import { categories, featured } from "../../data/mockProducts.js";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 grid md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--brown-700)] leading-tight">
              Transform Your<br />Home with Quality<br />Furniture
            </h1>
            <p className="mt-3 text-sm text-gray-700 max-w-md">
              Discover thousands of furniture pieces from trusted Filipino retailers.
              From modern designs to classic styles, find everything you need.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={() => navigate("/shop")}>Shop Now</Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-[var(--line-amber)]">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop"
              alt="Hero"
              className="h-56 md:h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="border-t border-[var(--line-amber)]" />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--brown-700)]">Shop by Category</h2>
          <p className="text-sm text-gray-600">
            Explore our wide selection of furniture organized by room and function
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((c, i) => (
            <CategoryCard key={i} item={c} />
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--brown-700)]">Featured Products</h2>
          <Button
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={() => navigate("/shop")}
          >
            View All
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Promo banner */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-xl border border-[var(--line-amber)] bg-white p-5 md:p-6 grid md:grid-cols-[1fr,260px] gap-4 items-center">
          <div>
            <div className="text-[11px] text-gray-600 mb-1">Limited Time Offer</div>
            <h3 className="text-[var(--brown-700)] font-bold">
              Free Delivery on Orders Over ₱25,000
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              Get your furniture delivered straight to your doorstep anywhere in Metro Manila.
              Valid until March 31, 2025.
            </p>
            <Button className="mt-3" onClick={() => navigate("/shop")}>
              Shop Now & Save
            </Button>
          </div>
          <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] px-6 py-5 text-center">
            <div className="text-5xl">📦</div>
            <div className="font-bold mt-1">FREE</div>
            <div className="text-xs text-gray-700">Nationwide Delivery</div>
          </div>
        </div>
      </section>
    </div>
  );
}
