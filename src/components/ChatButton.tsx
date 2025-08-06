// src/components/ChatButton.tsx
"use client";

import React from "react";

export default function ChatButton() {
  return (
    <button
      onClick={() => window.supportChat?.open()}
      className="bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-100 transition"
    >
      Chat With An Agent
    </button>
  );
}
