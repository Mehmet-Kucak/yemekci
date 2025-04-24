import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
//
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
//
import { toast } from "react-hot-toast";
import Router from "next/router";
const tr = require("@public/locales/tr.json");
const en = require("@public/locales/en.json");
const de = require("@public/locales/en.json");
const fr = require("@public/locales/en.json");
const it = require("@public/locales/en.json");
const nl = require("@public/locales/en.json");
const sv = require("@public/locales/en.json");
const es = require("@public/locales/en.json");
const el = require("@public/locales/en.json");
const ru = require("@public/locales/en.json");
const ja = require("@public/locales/en.json");
const zh = require("@public/locales/en.json");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

const t = (text: string) => {
  const lang = Router.locale;

  switch (lang) {
    case "tr":
      return tr.FirebaseConfig[text] || text;
    case "en":
      return en.FirebaseConfig[text] || text;
    case "de":
      return de.FirebaseConfig[text] || text;
    case "fr":
      return fr.FirebaseConfig[text] || text;
    case "it":
      return it.FirebaseConfig[text] || text;
    case "nl":
      return nl.FirebaseConfig[text] || text;
    case "sv":
      return sv.FirebaseConfig[text] || text;
    case "es":
      return es.FirebaseConfig[text] || text;
    case "el":
      return el.FirebaseConfig[text] || text;
    case "ru":
      return ru.FirebaseConfig[text] || text;
    case "ja":
      return ja.FirebaseConfig[text] || text;
    case "zh":
      return zh.FirebaseConfig[text] || text;
    default:
      return en.FirebaseConfig[text] || text;
  }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.useDeviceLanguage();
export const user = () => {
  return auth.currentUser;
};
export const db = getFirestore(app);

// ##########Auth##########
export async function SignUp(
  username: any,
  email: any,
  password1: any,
  password2: any
) {
  let success = false;

  try {
    if (username.length < 3 || username.length > 20) {
      toast.error(t("signUpError1"));
      return success;
    } else if (username.includes(" ")) {
      toast.error(t("signUpError2"));
      return success;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      toast.error(t("signUpError3"));
      return success;
    } else if (await UserWithUsernameExists(username)) {
      toast.error(t("signUpError4"));
      return success;
    } else if (password1 !== password2) {
      toast.error(t("signUpError5"));
      return success;
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password1
    );
    await updateProfile(userCredential.user, {
      displayName: username,
    });

    await SaveNewUser(userCredential.user);

    success = true;
  } catch (error) {
    handleAuthError(error);
  }

  SignOut();
  return success;
}

export async function SignIn(email: any, password: any) {
  var success = true;

  await signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
    })
    .catch((error) => {
      success = false;
      handleAuthError(error);
    });

  return success;
}

export function SignOut() {
  signOut(auth).catch(() => {
    toast.error(t("signOutError"));
  });
}

function handleAuthError(error: any) {
  console.error("Error code: ", error.code);
  switch (error.code) {
    case "auth/email-already-in-use":
      toast.error(t("authError1"));
      break;
    case "auth/invalid-email":
      toast.error(t("authError2"));
      break;
    case "auth/weak-password":
      toast.error(t("authError3"));
      break;
    case "auth/user-disabled":
      toast.error(t("authError4"));
      break;
    case "auth/invalid-credential":
      toast.error(t("authError5"));
      break;
    case "auth/user-not-found":
      toast.error(t("authError6"));
      break;
    case "auth/too-many-requests":
      toast.error(t("authError7"));
      break;
    case "auth/operation-not-allowed":
      toast.error(t("authError8"));
      break;
    default:
      toast.error(t("authError9"));
      break;
  }
}
// ########################

// ##########Database##########
/* Database Scheme
#Users
- Username (String)
- UserID (String)
- Language (String)
- Favourites (Array of Objects)
    - city (String)
    - id (String)
- CreationDate (Date)
*/

export function SaveNewUser(user: any) {
  const newUserID = user.uid;
  const usersDoc = doc(db, "Users", newUserID || "");

  const newUser = {
    Username: user.displayName,
    UserID: newUserID,
    Language: "tr",
    Favourites: [],
    CreationDate: new Date(user.metadata.creationTime),
  };

  setDoc(usersDoc, newUser);
}

export async function GetUserData(userID = user()?.uid) {
  const docRef = doc(db, "Users", userID || "");
  const docSnap = await getDoc(docRef);
  const data = await docSnap.data();

  return data;
}

export async function UserWithUsernameExists(username: any) {
  const usersCollection = await collection(db, "Users");
  const docs = await getDocs(
    query(usersCollection, where("Username", "==", username))
  );

  if (!docs.empty) {
    return true;
  }

  return false;
}

export async function AddToFavourites(
  userID: string,
  favourite: { city: string; id: string }
) {
  const userDoc = doc(db, "Users", userID);
  try {
    await updateDoc(userDoc, {
      Favourites: arrayUnion(favourite),
    });
    toast.success(t("addFavSuccess"));
  } catch (error) {
    toast.error(t("addFavError"));
    console.error("Error adding to favourites: ", error);
  }
}

// Remove a product from the user's favorites
export async function RemoveFromFavourites(
  userID: string,
  favourite: { city: string; id: string }
) {
  const userDoc = doc(db, "Users", userID);
  try {
    await updateDoc(userDoc, {
      Favourites: arrayRemove(favourite),
    });
    toast.success(t("removeFavSuccess"));
  } catch (error) {
    toast.error(t("removeFavError"));
    console.error("Error removing from favourites: ", error);
  }
}
// ############################
