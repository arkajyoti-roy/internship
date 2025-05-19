import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCz8ZGYj2Ukxi3F4D-aCcGP-V3vVYBE1PE",
  authDomain: "documents-9219a.firebaseapp.com",
  projectId: "documents-9219a",
  storageBucket: "documents-9219a.appspot.com",
  messagingSenderId: "306504461373",
  appId: "1:306504461373:web:dde3490bede06427160e54",
  measurementId: "G-09504K1HSB",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth();
export const db = getFirestore(app);
export const imageDb = getStorage(app);
export default app;
