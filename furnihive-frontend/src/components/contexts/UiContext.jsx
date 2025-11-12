import { createContext, useContext, useState } from "react";
import AddToCartModal from "../modals/AddToCartModal.jsx";

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [addToCartData, setAddToCartData] = useState(null);
  const showAddToCart = (data) => setAddToCartData(data); // { title, qty, onViewCart, onClose }

  return (
    <UiContext.Provider value={{ showAddToCart }}>
      {children}
      {addToCartData && (
        <AddToCartModal
          title={addToCartData.title}
          qty={addToCartData.qty}
          onContinue={() => setAddToCartData(null)}
          onViewCart={() => {
            setAddToCartData(null);
            addToCartData.onViewCart?.();
          }}
        />
      )}
    </UiContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUI must be used within UiProvider");
  return ctx;
}
