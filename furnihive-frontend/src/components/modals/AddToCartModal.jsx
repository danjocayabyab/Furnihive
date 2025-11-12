export default function AddToCartModal({ title, qty = 1, onContinue, onViewCart }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line-amber)] bg-white p-6 text-center">
        <h2 className="text-xl font-semibold text-[var(--brown-700)]">Added to Cart</h2>

        <p className="mt-3 text-[15px]">
          <span className="font-semibold text-[var(--brown-700)]">{title}</span>{" "}
          <span className="font-semibold">×{qty}</span>{" "}
          <span className="text-gray-700">has been added to your cart.</span>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onContinue}
            className="rounded-lg border border-[var(--orange-600)] px-4 py-2.5 font-medium text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
          >
            Continue Shopping
          </button>
          <button
            onClick={onViewCart}
            className="rounded-lg bg-[var(--orange-600)] px-4 py-2.5 font-semibold text-white hover:brightness-95"
          >
            View Cart
          </button>
        </div>
      </div>
    </div>
  );
}
