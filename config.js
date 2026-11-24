/* Public Firebase Web App settings only. Never put an AI key or admin private key here.
   Copy the object from Firebase Console > Project settings > Your apps.
   Keep firebase: null to use the fully local demo without an account. */
window.DAYLIGHT_CONFIG = Object.freeze({
  firebase: {
    apiKey: "AIzaSyC7afwjLHRX5L_TGdeaDRBqSK4zb7GOUwQ",
    authDomain: "ncu-app-proj1-daylight-planner.firebaseapp.com",
    projectId: "ncu-app-proj1-daylight-planner",
    storageBucket: "ncu-app-proj1-daylight-planner.firebasestorage.app",
    messagingSenderId: "373059480922",
    appId: "1:373059480922:web:50dbf65605229a84eb1763"
  },
  functionsRegion: "asia-east1",
  aiBackendEnabled: false,
  appCheckSiteKey: "",
  useEmulators: false
});
