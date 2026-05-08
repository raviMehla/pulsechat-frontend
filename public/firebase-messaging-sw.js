// public/firebase-messaging-sw.js

// Import Firebase libraries via CDN for the Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 🔴 You must paste your exact config here again (SW cannot access import.meta.env)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: '/vite.svg', // Replace with your app logo in the public folder
    data: payload.data // Contains our routing info (chatId) for Phase 3
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Phase 3: Click-to-Open Routing
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // If the backend sent a chatId in the payload data, route directly to it
  const chatId = event.notification.data?.chatId;
  const urlToOpen = chatId ? `${self.location.origin}/chat/${chatId}` : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, just focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If app is closed, open a new window to the chat
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});