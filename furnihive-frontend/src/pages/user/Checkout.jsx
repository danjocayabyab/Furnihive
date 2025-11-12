// src/pages/user/Checkout.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../components/contexts/CartContext.jsx";
 // same hook we used in ProductDetail/Cart

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

/* ----------------------------- Main Wizard ----------------------------- */
export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();

  // ---- STEPS
  const [step, setStep] = useState(1); // 1=shipping, 2=payment, 3=review

  // ---- SHIPPING FORM
  const [ship, setShip] = useState({
    firstName: "Juan",
    lastName: "dela Cruz",
    email: "juan@example.com",
    phone: "+63 912 345 6789",
    street: "123 Main Street, Barangay Sample",
    city: "Quezon City",
    province: "",
    zip: "1100",
    note: "",
  });

  // ---- PAYMENT FORM
  const [payMethod, setPayMethod] = useState("card"); // card | gcash | paymaya | cod
  const [card, setCard] = useState({ name: "Juan dela Cruz", number: "", exp: "", cvv: "" });
  const [agree, setAgree] = useState(false);

  // ---- ORDER SUM
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    const shipping = subtotal >= 25000 || items.length === 0 ? 0 : 500;
    const vat = Math.round(subtotal * 0.12);
    const total = subtotal + shipping + vat;
    return { subtotal, shipping, vat, total };
  }, [items]);

  const canContinueShipping =
    ship.firstName && ship.lastName && ship.email && ship.phone && ship.street && ship.city && ship.zip;

  const canContinuePayment =
    (payMethod === "card"
      ? card.name && card.number && card.exp && card.cvv
      : true) && agree;

  const placeOrder = () => {
    // Normally: await api.post('/orders', { items, ship, payMethod, cardLast4... })
    clearCart();
    navigate("/checkout/success", { state: { total: totals.total } });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Top nav / progress */}
      <Progress step={step} />

      <div className="grid gap-6 lg:grid-cols-[1fr,360px] mt-4">
        {/* LEFT: step panel */}
        <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
          {step === 1 && (
            <ShippingForm
              ship={ship}
              setShip={setShip}
              onNext={() => setStep(2)}
              disabledNext={!canContinueShipping}
            />
          )}
          {step === 2 && (
            <PaymentForm
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              card={card}
              setCard={setCard}
              agree={agree}
              setAgree={setAgree}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              disabledNext={!canContinuePayment}
            />
          )}
          {step === 3 && (
            <ReviewForm
              ship={ship}
              payMethod={payMethod}
              card={card}
              onBack={() => setStep(2)}
              onPlace={placeOrder}
              total={totals.total}
            />
          )}
        </div>

        {/* RIGHT: order summary */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white p-5 h-fit">
          <h3 className="font-semibold text-[var(--brown-700)] mb-3">Order Summary</h3>

          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.id} className="flex gap-3">
                <div className="relative">
                  <img
                    src={it.image}
                    alt={it.title}
                    className="h-16 w-20 object-cover rounded-md border border-[var(--line-amber)]"
                  />
                  <span className="absolute -left-2 -top-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--orange-600)] px-1.5 text-[11px] font-semibold text-white">
                    {it.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[var(--brown-700)] text-sm">{it.title}</div>
                  <div className="text-xs text-gray-600">Color: {it.color || "Default"}</div>
                  <div className="text-[11px] text-gray-600">Sold by: {it.seller || "Manila Furniture Co."}</div>
                  <div className="text-sm font-semibold">{peso((it.price || 0) * (it.qty || 1))}</div>
                </div>
              </div>
            ))}

            <hr className="border-[var(--line-amber)]/70" />

            <Row label={`Subtotal`} value={peso(totals.subtotal)} />
            <Row label={`Shipping`} value={totals.shipping ? peso(totals.shipping) : "FREE"} />
            <Row label={`Tax (VAT 12%)`} value={peso(totals.vat)} />
            <div className="mt-1 pt-2 border-t border-[var(--line-amber)]/70">
              <Row label={<b>Total</b>} value={<b>{peso(totals.total)}</b>} />
            </div>

            <div className="mt-2 rounded-xl bg-[var(--amber-50)] border border-[var(--line-amber)] p-3 text-sm text-[var(--brown-700)]">
              <div className="font-medium mb-1">📦 Estimated Delivery</div>
              <div className="text-xs text-gray-700">7–10 business days</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Back to cart link */}
      <div className="mt-4">
        <Link to="/cart" className="text-sm text-[var(--orange-600)] hover:underline">← Back to Cart</Link>
      </div>
    </div>
  );
}

/* ---------------------------- Step Components --------------------------- */

function ShippingForm({ ship, setShip, onNext, disabledNext }) {
  const set = (k) => (e) => setShip((s) => ({ ...s, [k]: e.target.value }));
  return (
    <div className="p-5">
      <SectionTitle icon="" title="Shipping Information" />
      <div className="grid gap-3 mt-3">
        <TwoCols>
          <Field label="First Name"><Input value={ship.firstName} onChange={set("firstName")} /></Field>
          <Field label="Last Name"><Input value={ship.lastName} onChange={set("lastName")} /></Field>
        </TwoCols>

        <TwoCols>
          <Field label="Email Address"><Input value={ship.email} onChange={set("email")} /></Field>
          <Field label="Phone Number"><Input value={ship.phone} onChange={set("phone")} /></Field>
        </TwoCols>

        <Field label="Street Address"><Input value={ship.street} onChange={set("street")} /></Field>

        <TwoCols>
          <Field label="City"><Input value={ship.city} onChange={set("city")} /></Field>
          <Field label="Province">
            <Select value={ship.province} onChange={set("province")}>
              <option value="">Select province</option>
              <option>Metro Manila</option>
              <option>Cebu</option>
              <option>Davao del Sur</option>
            </Select>
          </Field>
        </TwoCols>

        <TwoCols>
          <Field label="ZIP Code"><Input value={ship.zip} onChange={set("zip")} /></Field>
          <div />
        </TwoCols>

        <Field label="Delivery Instructions (Optional)">
          <Input value={ship.note} onChange={set("note")} placeholder="Gate code, landmarks, etc." />
        </Field>

        <div className="pt-2">
          <Button primary disabled={disabledNext} onClick={onNext}>Continue to Payment</Button>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({
  payMethod, setPayMethod, card, setCard, agree, setAgree, onBack, onNext, disabledNext,
}) {
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));
  return (
    <div className="p-5">
      <SectionTitle icon="💳" title="Payment Information" />

      {/* Methods */}
      <div className="mt-3 space-y-2">
        <MethodItem active={payMethod === "card"} onClick={() => setPayMethod("card")}>Credit/Debit Card</MethodItem>
        <MethodItem active={payMethod === "gcash"} onClick={() => setPayMethod("gcash")}>GCash</MethodItem>
        <MethodItem active={payMethod === "paymaya"} onClick={() => setPayMethod("paymaya")}>PayMaya</MethodItem>
        <MethodItem active={payMethod === "cod"} onClick={() => setPayMethod("cod")}>Cash on Delivery</MethodItem>
      </div>

      {/* Card details */}
      {payMethod === "card" && (
        <div className="mt-4 grid gap-3">
          <Field label="Cardholder Name"><Input value={card.name} onChange={set("name")} /></Field>
          <Field label="Card Number"><Input value={card.number} onChange={set("number")} placeholder="1234 5678 9012 3456" /></Field>
          <TwoCols>
            <Field label="Expiry Date"><Input value={card.exp} onChange={set("exp")} placeholder="MM/YY" /></Field>
            <Field label="CVV"><Input value={card.cvv} onChange={set("cvv")} placeholder="123" /></Field>
          </TwoCols>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I accept the <a className="text-[var(--orange-600)]">Terms and Conditions</a> and{" "}
          <a className="text-[var(--orange-600)]">Privacy Policy</a>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button secondary onClick={onBack}>Back to Shipping</Button>
        <Button primary disabled={disabledNext} onClick={onNext}>Review Order</Button>
      </div>
    </div>
  );
}

function ReviewForm({ ship, payMethod, card, onBack, onPlace, total }) {
  const cardLast = card.number?.slice(-4);
  return (
    <div className="p-5">
      <SectionTitle icon="📝" title="Review Your Order" />

      <div className="grid gap-4 mt-3">
        <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4">
          <div className="font-semibold text-[var(--brown-700)] mb-1">Shipping Address</div>
          <div className="text-sm text-[var(--brown-700)]">
            {ship.firstName} {ship.lastName}<br />
            {ship.street}<br />
            {ship.city}{ship.province ? `, ${ship.province}` : ""} {ship.zip}<br />
            {ship.email}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4">
          <div className="font-semibold text-[var(--brown-700)] mb-1">Payment Method</div>
          <div className="text-sm text-[var(--brown-700)]">
            {payMethod === "card" && <>Credit/Debit Card — Ending in {cardLast || "••••"}</>}
            {payMethod === "gcash" && "GCash"}
            {payMethod === "paymaya" && "PayMaya"}
            {payMethod === "cod" && "Cash on Delivery"}
          </div>
        </div>

        <div className="flex gap-2">
          <Button secondary onClick={onBack}>Back to Payment</Button>
          <Button primary onClick={onPlace}>Place Order – {peso(total)}</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Success Page ---------------------------- */
export function CheckoutSuccess() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-600 text-4xl">✔</div>
      <h1 className="text-2xl font-bold text-[var(--brown-700)]">Order Placed Successfully!</h1>
      <p className="mt-2 text-sm text-gray-700">
        Thank you for your purchase. We'll send you a confirmation email shortly.
      </p>
      <div className="mt-6 space-y-3">
        <button
          className="w-full rounded-xl bg-[var(--orange-600)] px-4 py-3 text-white font-medium hover:brightness-95"
          onClick={() => navigate("/shop")}
        >
          Continue Shopping
        </button>
        <button
          className="w-full rounded-xl border border-[var(--line-amber)] px-4 py-3 text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
          onClick={() => navigate("/profile?tab=orders")}
        >
          View Order History
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Tiny UI bits ---------------------------- */
function Progress({ step }) {
  const Item = ({ i, label, icon }) => {
    const active = step >= i;
    return (
      <div className="flex items-center gap-2">
        <div
          className={`grid h-9 w-9 place-items-center rounded-full border ${
            active
              ? "border-emerald-500 text-emerald-600 bg-white"
              : "border-[var(--line-amber)] text-[var(--orange-600)] bg-white"
          }`}
        >
          <span>{icon}</span>
        </div>
        <div className={`${active ? "text-[var(--brown-700)]" : "text-gray-500"} text-sm hidden sm:block`}>
          {label}
        </div>
        {i < 3 && <div className={`mx-3 h-[2px] w-16 ${active ? "bg-emerald-500" : "bg-[var(--line-amber)]"}`} />}
      </div>
    );
  };
  return (
    <div className="flex items-center justify-center gap-1">
      <Item i={1} label="Shipping Info" icon="🚚" />
      <Item i={2} label="Payment" icon="💳" />
      <Item i={3} label="Review Order" icon="✅" />
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h2 className="font-semibold text-[var(--brown-700)]">{title}</h2>
    </div>
  );
}

function TwoCols({ children }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2 text-sm outline-none"
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2 text-sm outline-none bg-white"
    />
  );
}

function MethodItem({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl px-4 py-2 border ${
        active
          ? "border-[var(--orange-600)] bg-[var(--amber-50)]"
          : "border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-[var(--brown-700)]">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Button({ primary, secondary, children, ...rest }) {
  const cls = primary
    ? "rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white font-medium hover:brightness-95 disabled:opacity-50"
    : secondary
    ? "rounded-xl border border-[var(--line-amber)] px-4 py-2.5 text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
    : "rounded-xl px-4 py-2.5";
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
