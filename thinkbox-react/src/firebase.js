// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCUEVjMFHilowCjviJSJ8aeWGItRSSvdbY",
  authDomain: "cool-citadel-427909-s2.firebaseapp.com",
  projectId: "cool-citadel-427909-s2",
  storageBucket: "cool-citadel-427909-s2.appspot.com",
  messagingSenderId: "307634775595",
  appId: "1:307634775595:web:c9d1e96d238eede3736c6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged };