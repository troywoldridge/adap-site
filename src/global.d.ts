// src/global.d.ts
export {}; // ensure this file is treated as a module

declare global {
  interface Window {
    /** your live-chat widget instance */
    supportChat?: {
      open: () => void;
      // …any other methods you use, e.g. close(), chatId, etc.
    };
  }
}
