import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { CartProvider } from "./components/contexts/CartContext.jsx";
import { UiProvider } from "./components/contexts/UiContext.jsx"; 
import { AuthProvider } from "./components/contexts/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <UiProvider>
            <Toaster position="top-right" />
            <App />
          </UiProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </>
);
