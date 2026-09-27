"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 10000,
        className: "text-sm",
        style: { maxWidth: 440 },
      }}
    />
  );
}
