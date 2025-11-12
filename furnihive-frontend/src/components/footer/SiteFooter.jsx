export default function SiteFooter(){
  return (
    <footer className="border-t border-[var(--line-amber)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="inline-flex items-center gap-2">
            <div className="h-6 w-6 grid place-items-center rounded-md bg-gradient-to-br from-[var(--amber-500)] to-[var(--orange-600)] text-white font-bold">F</div>
            <span className="font-semibold text-[var(--brown-700)]">FurniHive</span>
          </div>
          <p className="mt-3 text-gray-600">
            Empowering Filipino furniture retailers in the digital marketplace since 2025.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--brown-700)] mb-3">Categories</h4>
          <ul className="space-y-2 text-gray-700">
            <li>Living Room</li><li>Bedroom</li><li>Dining</li><li>Office</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--brown-700)] mb-3">Support</h4>
          <ul className="space-y-2 text-gray-700">
            <li>Help Center</li><li>Shipping & Delivery</li><li>Returns</li><li>Contact Us</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--brown-700)] mb-3">Sell With Us</h4>
          <ul className="space-y-2 text-gray-700">
            <li>Become a Seller</li><li>Seller Center</li><li>Seller Guidelines</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--line-amber)]">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-gray-600">
          © {new Date().getFullYear()} FurniHive. Made with 🧡 for Filipino furniture retailers.
        </div>
      </div>
    </footer>
  );
}
