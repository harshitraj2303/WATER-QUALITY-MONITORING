// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB8R2dUuWWRNJgjmnjV-xL6FDdL1lfYbOM",
  authDomain: "water-monitoring-system-a3703.firebaseapp.com",
  databaseURL: "https://water-monitoring-system-a3703-default-rtdb.firebaseio.com",
  projectId: "water-monitoring-system-a3703",
  storageBucket: "water-monitoring-system-a3703.appspot.com",
  messagingSenderId: "154674257347",
  appId: "1:154674257347:web:ab7dc16d586cde497f176",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue };
