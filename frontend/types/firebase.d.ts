declare module "firebase/app" {
  export type FirebaseApp = any;
  export const initializeApp: any;
  export const getApps: any;
  export const getApp: any;
}

declare module "firebase/auth" {
  export type Auth = any;
  export type UserCredential = any;
  export const getAuth: any;
  export const GoogleAuthProvider: any;
  export const signInWithPopup: any;
  export const signInWithEmailAndPassword: any;
  export const createUserWithEmailAndPassword: any;
  export const updateProfile: any;
}
