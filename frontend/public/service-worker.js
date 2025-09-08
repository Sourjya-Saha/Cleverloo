// public/service-worker.js

self.addEventListener("install", (event) => {
  console.log("Service Worker installed.");
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
  event.waitUntil(clients.claim()); // Take control of uncontrolled clients
});

self.addEventListener("fetch", (event) => {
  // Optional: just pass through all requests
  event.respondWith(fetch(event.request));
});
