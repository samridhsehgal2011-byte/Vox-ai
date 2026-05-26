import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOut = () => auth.signOut();
export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const sendVerificationEmail = (user: any) => sendEmailVerification(user);

export const OWNERS = [
  "asdgaming127@gmail.com",
  "tanusehgal87@gmail.com",
  "p.sehgal1@gmail.com",
  "samridhsehgal2011@gmail.com",
  "al13n@astralyxpvp.int.yt"
];

export const DEVS = [
  "dreamlong@astralyxpvp.int.yt",
  "indiancoder3@astralyxpvp.int.yt",
  "ytdreamlong@gmail.com",
  "indiancoder3@hotmail.com"
];

export const isOwner = (email: string | null | undefined) => {
  if (!email) return false;
  return OWNERS.includes(email.toLowerCase());
};

export const isDev = (email: string | null | undefined) => {
  if (!email) return false;
  return DEVS.includes(email.toLowerCase());
};
