// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { firebaseConfig } from "./firebase-secret.js";

import {
  getFirestore, collection, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  doc, setDoc, query, orderBy, limit, startAfter, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

import {
  getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export {
  db, storage, collection, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  doc, ref, uploadBytes, getDownloadURL, deleteObject,
  setDoc, query, orderBy, limit, startAfter, serverTimestamp, onSnapshot,
  getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail
};
