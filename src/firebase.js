import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAr1Itd80qBA__t1_GqQ50XuJY2g0uSris",
  authDomain: "recipe-book-becda.firebaseapp.com",
  projectId: "recipe-book-becda",
  storageBucket: "recipe-book-becda.firebasestorage.app",
  messagingSenderId: "632738365673",
  appId: "1:632738365673:web:8f0f72bc3f7cbfe2a53078",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
