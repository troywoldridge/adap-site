"use client";
import { useEffect } from "react";

export default function ClearCartCookie() {
  useEffect(() => {
    fetch("/api/cart/clear", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
