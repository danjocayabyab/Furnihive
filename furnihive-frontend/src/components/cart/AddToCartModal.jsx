import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal.jsx";

export default function AddToCartModal({ open, onClose, added }) {
  const navigate = useNavigate();
  if (!added) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="grid place-items-center h-14 w-14 rounded-full bg-[var(--amber-50)] text-[var(--orange-600)] text-2xl">✔</div>
        <h3 className="text-lg font-semibold text-[var(--brown-700)]">Added to Cart!</h3>
        <p className="text-sm text-gray-700">
          <span className="font-medium">{added.title}</span> ({added.qty} item{added.qty>1?"s":""}) added to your cart
        </p>
        <div className="w-full mt-2 space-y-2">
          <button
            onClick={() => { onClose(); navigate("/cart"); }}
            className="w-full rounded-xl bg-[var(--orange-600)] text-white font-semibold py-2.5"
          >
            🛒 View Cart
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-[var(--line-amber)] bg-white font-semibold py-2.5 text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </Modal>
  );
}
