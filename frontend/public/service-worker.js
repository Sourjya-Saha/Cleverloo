// public/service-worker.js

self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
  // Claim clients to take control of unhandled pages
  event.waitUntil(clients.claim());
});
