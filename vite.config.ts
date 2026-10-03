/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Paths under /__/ belong to Firebase's sign-in handler. The offline
// navigation fallback must leave them alone, like the hosting rewrite does.
export const firebaseReservedPath: RegExp = /^\/__\//;

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
                name: "Magpie",
                short_name: "Magpie",
                start_url: "/",
                display: "standalone",
                background_color: "#f3f5fa",
                theme_color: "#00a88f",
                icons: [
                    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
                    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,png,svg}"],
                navigateFallback: "/index.html",
                navigateFallbackDenylist: [firebaseReservedPath],
            },
        }),
    ],
    test: {
        environment: "jsdom",
        setupFiles: ["src/test/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
    },
});
