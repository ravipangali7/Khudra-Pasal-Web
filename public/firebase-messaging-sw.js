/* eslint-disable no-undef */
/* Firebase Messaging service worker — keep firebase JS version in sync with web/package.json "firebase". */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBmIqwM-aO3TBwjD4Fr-9s7VNJ57xs9oG8",
  authDomain: "khudra-pasal-f0cc3.firebaseapp.com",
  projectId: "khudra-pasal-f0cc3",
  storageBucket: "khudra-pasal-f0cc3.firebasestorage.app",
  messagingSenderId: "1079145523329",
  appId: "1:1079145523329:web:081e89b0f22e805afb0580",
  measurementId: "G-SCF006FTLB",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Khudra Pasal";
  const body = payload.notification?.body || payload.data?.body || "";
  const options = {
    body,
    icon: "/favicon.ico",
    data: payload.data || {},
  };
  return self.registration.showNotification(title, options);
});
