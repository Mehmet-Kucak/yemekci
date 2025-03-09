import React, { useState, useEffect } from "react";
import Head from "next/head";
import BottomNavbar from "@components/BottomNavbar";
import { useRouter } from "next/router";
import styles from "@styles/Int.module.css";
import { useTranslations } from "next-intl";

const Int = () => {
  const router = useRouter();
  const t = useTranslations("Other");

  useEffect(() => {
    const storedLocale = localStorage.getItem("locale");
    if (storedLocale && storedLocale !== router.locale) {
      router.replace(router.pathname, undefined, { locale: storedLocale });
    }
  }, [router]);

  const backButton = () => {
    localStorage.setItem("locale", router.locale || "");
    router.back();
  };

  const profileButton = () => {
    router.push("/profile");
  };

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLocale = event.target.value;
    localStorage.setItem("locale", newLocale);
    router.replace(router.pathname, undefined, { locale: newLocale });
  };

  return (
    <>
      <Head>
        <title>Dil Seç</title>
        <meta
          name="description"
          content="Coğrafi işaretlere kolaylıkla ulaşın"
        />
        <link rel="icon" href="/vercel.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <header className={styles.header}>
        <button onClick={backButton} className={styles.header_button}>
          <img src="/back_icon.png" alt="" />
        </button>
        {/* <img src="/YemekCi.png" alt="yemekci" className={styles.logo} /> */}
        <h2>GastroKeşif</h2>
        <button className={styles.header_button} onClick={profileButton}>
          <img src="/person_icon.png" alt="" />
        </button>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>Choose Apps Language</h1>
        <br />

        <select
          id="Languages"
          name="Languages"
          className={styles.city_dropdown}
          value={router.locale}
          onChange={handleLanguageChange}
        >
          <option value={"tr"}>Türkçe</option>
          <option value={"en"}>English</option>
          <option value={"de"}>Deutsch</option>
          <option value={"fr"}>Français</option>
          <option value={"it"}>Italiano</option>
          <option value={"nl"}>Nederlands</option>
          <option value={"sv"}>Svenska</option>
          <option value={"es"}>Español</option>
          <option value={"el"}>Ελληνικά</option>
          <option value={"ru"}>Русский</option>
          <option value={"ja"}>日本語</option>
          <option value={"zh"}>中国人</option>
        </select>
        <h3>{t("appLang")}</h3>
      </main>
      <BottomNavbar
        active={4}
        onHomeClick={() => {
          router.push("/");
        }}
        onSearchClick={() => {
          router.push("/search");
        }}
        onLocationClick={() => {
          router.push("/");
        }}
        onFavsClick={() => {
          router.push("/favourites");
        }}
        onIntClick={() => {}}
      />
    </>
  );
};

export default Int;

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
