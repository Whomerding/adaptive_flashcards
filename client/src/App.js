import React from "react";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>    
      <AuthProvider>     
         <Navbar />    
        <AppRoutes />
      </AuthProvider>
      <Footer />
    </BrowserRouter>
  );
}