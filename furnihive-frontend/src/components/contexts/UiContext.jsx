import { createContext, useContext, useState } from "react";
import AddToCartModal from "../modals/AddToCartModal.jsx";
import AuthModal from "../auth/AuthModal.jsx";

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [addToCartData, setAddToCartData] = useState(null);
  const showAddToCart = (data) => setAddToCartData(data); // { title, qty, onViewCart, onClose }

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authOnAuthed, setAuthOnAuthed] = useState(null);

  const openAuth = (mode = "login", onAuthed) => {
    setAuthMode(mode);
    setAuthOnAuthed(() => onAuthed || null);
    setAuthOpen(true);
  };

  return (
    <UiContext.Provider value={{ showAddToCart, openAuth }}>
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
      {authOpen && (
        <AuthModal
          open={authOpen}
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onAuthed={
            authOnAuthed
              ? (user) => {
                  authOnAuthed(user);
                  setAuthOpen(false);
                }
              : undefined
          }
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
