import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() &&
      (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim())
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Please ensure your Firebase environment variables are defined in .env.local."
    );
  }
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  return getAuth(app);
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return await signInWithPopup(auth, provider);
}

export async function signInWithFirebaseEmail(email: string, pass: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function signUpWithFirebaseEmail(
  name: string,
  email: string,
  pass: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user && name.trim()) {
    try {
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch {
      // Non-critical profile name update failure
    }
  }
  return cred;
}

export function isPopupClosedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}

export function formatFirebaseAuthError(error: unknown, fallback = "Authentication failed. Please try again."): string {
  if (!error || typeof error !== "object") return fallback;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  const msg = "message" in error ? String((error as { message: unknown }).message) : "";

  switch (code) {
    case "auth/api-key-not-valid":
      return "Firebase API key is invalid or restricted in Google Cloud Console. Please verify the API key in .env.local.";
    case "auth/unauthorized-domain":
      return "This domain (localhost) is not authorized in Firebase Console. Add 'localhost' under Firebase Authentication -> Settings -> Authorized Domains.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please verify and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please log in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 8 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "This authentication provider is not enabled in Firebase Console. Please enable it under Firebase Authentication -> Sign-in method.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups for this site.";
    default:
      if (msg && !msg.toLowerCase().includes("firebase:")) {
        return msg;
      }
      return fallback;
  }
}
