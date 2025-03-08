import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  auth,
  SignIn,
  SignUp,
  SignOut,
  GetUserData,
} from "@config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-hot-toast";
import styles from "@styles/Profile.module.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

const Profile = () => {
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [authType, setAuthType] = useState("login");
  const [loginUser, setLoginUser] = useState({ email: "", password: "" });
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
  });
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const t = useTranslations("Profile");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrUser(user);
        const data = await GetUserData(user.uid);
        setUserData(data);
      } else {
        setCurrUser(null);
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedLocale = localStorage.getItem("locale");
    if (storedLocale && storedLocale !== router.locale) {
      router.replace(router.pathname, undefined, { locale: storedLocale });
    }
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authType === "login") {
      const success = await SignIn(loginUser.email, loginUser.password);
      if (success) {
        toast.success(t("loginSuccess"));
      }
    } else {
      const success = await SignUp(
        newUser.username,
        newUser.email,
        newUser.password1,
        newUser.password2
      );
      if (success) {
        toast.success(t("signupSuccess"));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (authType === "login") {
      setLoginUser({ ...loginUser, [e.target.name]: e.target.value });
    } else {
      setNewUser({ ...newUser, [e.target.name]: e.target.value });
    }
  };

  useEffect(() => {
    setLoginUser({ email: "", password: "" });
    setNewUser({
      username: "",
      email: "",
      password1: "",
      password2: "",
    });
  }, [currUser, authType]);

  const backButton = () => {
    router.back();
  };

  const profileButton = () => {
    return;
  };

  return (
    <>
      <Head>
        <title>Profil Sayfası</title>
        <meta
          name="description"
          content="Coğrafi işaretlere kolaylıkla ulaşın"
        />
        <link rel=" icon" href="/vercel.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <header className={styles.header}>
        <button onClick={backButton} className={styles.header_button}>
          <img src="/back_icon.png" alt="" />
        </button>
        {/* <img src="/YemekCi.png" alt="yemekci" className={styles.logo} /> */}
        <h2>Gastro Keşif</h2>
        <button className={styles.header_button} onClick={profileButton}>
          <img src="/person_icon.png" alt="" />
        </button>
      </header>
      <main className={styles.container}>
        {currUser ? (
          <div className={styles.profile}>
            <h1>{t("welcome", { name: userData?.Username })}</h1>
            <p>{t("userEmail", { email: currUser.email })}</p>
            <button
              onClick={() => {
                router.push("/favourites");
              }}
              className={styles.button}
            >
              {t("goFavs")}
            </button>
            <button
              onClick={() => {
                SignOut();
                toast.success(t("logoutSuccess"));
              }}
              className={styles.button}
            >
              {t("logout")}
            </button>
          </div>
        ) : (
          <div className={styles.authForm}>
            <form onSubmit={submit}>
              <div className={styles.title}>
                <h1>{authType === "login" ? t("login") : t("signup")}</h1>
              </div>
              {authType === "login" ? (
                <>
                  <input
                    type="text"
                    name="email"
                    value={loginUser.email}
                    placeholder={t("email")}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <input
                    type="password"
                    name="password"
                    value={loginUser.password}
                    placeholder={t("password")}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <button className={styles.button}>{t("login")}</button>
                  <p>
                    {t("noAccount")}
                    <button
                      type="button"
                      onClick={() => setAuthType("signup")}
                      className={styles.switchButton}
                    >
                      {t("signup")}
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    name="username"
                    value={newUser.username}
                    placeholder={t("username")}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    placeholder={t("email")}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <input
                    type="password"
                    name="password1"
                    value={newUser.password1}
                    placeholder={t("password")}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <input
                    type="password"
                    name="password2"
                    value={newUser.password2}
                    placeholder={t("confirmPassword")}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <button className={styles.button}>{t("signup")}</button>
                  <p>
                    {t("alreadyHaveAccount")}
                    <button
                      type="button"
                      onClick={() => setAuthType("login")}
                      className={styles.switchButton}
                    >
                      {t("login")}
                    </button>
                  </p>
                </>
              )}
            </form>
          </div>
        )}
      </main>
    </>
  );
};

export default Profile;

export async function getStaticProps(context: any) {
  let messages;
  try {
    messages = (await import(`@public/locales/${context.locale}.json`)).default;
  } catch (error) {
    console.error(error);
    messages = {};
  }
  return {
    props: {
      messages,
    },
  };
}
