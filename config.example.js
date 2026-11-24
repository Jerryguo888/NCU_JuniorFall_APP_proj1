window.DAYLIGHT_CONFIG = Object.freeze({
  firebase: {
    apiKey: "YOUR_FIREBASE_WEB_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_WEB_APP_ID"
  },
  functionsRegion: "asia-east1",
  aiBackendEnabled: false,
  aiLogic: null, // Set to { host, siteKey, model } after configuring Firebase App Check.
  appCheckSiteKey: "",
  useEmulators: false
});
