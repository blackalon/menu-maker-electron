// js/db.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// YOUR FIREBASE CONFIGURATION (REPLACE WITH YOUR ACTUAL VALUES)
const firebaseConfig = {
  apiKey: "AIzaSyDuyzIa4FYwF32KKnvpZrvcTW5fsFqF96c",
  authDomain: "menu-app-project-adac5.firebaseapp.com",
  projectId: "menu-app-project-adac5",
  storageBucket: "menu-app-project-adac5.firebasestorage.app",
  messagingSenderId: "716997545257",
  appId: "1:716997545257:web:0690199f69f6ce23133b38",
  measurementId: "G-FCPKWRGH4P"
};
// Initialize Firebase and expose them globally (or export as needed)
window.firebaseApp = initializeApp(firebaseConfig);
window.db = getFirestore(window.firebaseApp);
window.auth = getAuth(window.firebaseApp);
window.firebaseStorage = getStorage(window.firebaseApp);

export { 
    db, auth, firebaseStorage, 
    doc, setDoc, onSnapshot, collection, deleteDoc, 
    signInAnonymously, onAuthStateChanged, 
    ref, uploadBytes, getDownloadURL 
};