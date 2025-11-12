import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

import { CartProvider } from "./components/contexts/CartContext.jsx";
import { UiProvider } from "./components/contexts/UiContext.jsx"; 

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <UiProvider>
          <Toaster position="top-right" />
          <App />
        </UiProvider>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);
