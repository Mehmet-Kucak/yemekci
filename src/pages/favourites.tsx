import React, { useState, useEffect } from "react";
import Head from "next/head";
import BottomNavbar from "@components/BottomNavbar";
import ProductCard from "@/components/ProductCard";
import toast from "react-hot-toast";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  GetUserData,
  auth,
  db,
  AddToFavourites,
  RemoveFromFavourites,
} from "@/config/firebaseConfig";
import { useRouter } from "next/router";
import { User, onAuthStateChanged } from "firebase/auth";
import styles from "@styles/Favourites.module.css";
import PlaceCard from "@/components/PlaceCard";
import Map from "@components/DynamicMap";
import { useTranslations } from "next-intl";

type DocumentData = {
  id: string;
  name: string;
  province: string;
  img: string;
};
const Favourites = () => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [position, setPosition] = useState<[number, number]>([0, 0]); // [lat, lng
  const [selectedProduct, setSelectedProduct] = useState<number>(-1);
  const [selectedPlace, setSelectedPlace] = useState<number>(-1);
  const router = useRouter();
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const t = useTranslations("Favourites");

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

  const getProducts = async () => {
    setLoading(true);
    setData([]);
    setSelectedProduct(-1);
    setSelectedPlace(-1);

    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }
        );
        const lat = await position.coords.latitude;
        const lng = await position.coords.longitude;

        await setPosition([lat, lng]);
      } catch (error) {
        console.error(error);
      }
    }

    if (userData) {
      const products = userData.Favourites;
      const productData: DocumentData[] = [];
      for (const product of products) {
        const q = query(
          collection(db, product.city),
          where("registrationNumber", "==", product.id)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          productData.push(doc.data() as DocumentData);
        });
      }
      setData(productData);
    }
    setLoading(false);
  };

  useEffect(() => {
    getProducts();
  }, [userData]);

  const productButton = (product: number) => {
    console.log(product);
    setSelectedProduct(product);
  };

  const placeButton = (index: number) => {
    setSelectedPlace(index);
  };

  const backButton = () => {
    if (selectedPlace === -1 && selectedProduct === -1) {
      router.back();
    }
    if (selectedPlace !== -1) {
      setSelectedPlace(-1);
    } else {
      setSelectedProduct(-1);
    }
  };

  const profileButton = () => {
    router.push("/profile");
  };

  return (
    <>
      <Head>
        <title>Favoriler</title>
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
        <h2>Gastro Keşif</h2>
        <button className={styles.header_button} onClick={profileButton}>
          <img src="/person_icon.png" alt="" />
        </button>
      </header>
      <main className={styles.main}>
        {selectedProduct === -1 && selectedPlace === -1 && (
          <h1>{t("title")}</h1>
        )}
        <br />
        {!userData ? (
          <>
            <h1 className={styles.title}>{t("loginToAccess")}</h1>
            <button
              type="button"
              onClick={() => router.push("profile")}
              className={styles.switch_button}
            >
              {t("loginOrSignup")}
            </button>
          </>
        ) : (
          <>
            {loading && (
              <>
                <div className={styles.loader}>&nbsp;</div>
                <h1 className={styles.loader_text}>{t("loading")}</h1>
              </>
            )}
            {data.length === 0 && !loading && (
              <h1 className={styles.title}>{t("noFavourites")}</h1>
            )}
            {selectedProduct === -1 && !loading && (
              <>
                <div className={styles.product_container}>
                  {data.map((product, index) => {
                    return (
                      <ProductCard
                        img={product.img}
                        name={product.name}
                        key={index}
                        on_click={() => {
                          productButton(index);
                        }}
                      />
                    );
                  })}
                </div>
              </>
            )}
            {selectedProduct !== -1 && selectedPlace === -1 && !loading && (
              <>
                <h2 className={styles.title}>
                  <span>{data[selectedProduct].name}</span>
                  <br />
                  {data[selectedProduct].province}
                </h2>
                <div className={styles.ai}>
                  <h3>
                    {t("aboutProduct", { product: data[selectedProduct].name })}
                  </h3>
                  <br />
                  <p>
                    Ortaklar Çöpşiş, Türk mutfağının sevilen lezzetlerinden
                    biridir. Kökeni Anadolu&apos;ya dayanan bu yemek, genellikle
                    dana eti veya tavuk eti kullanılarak hazırlanır. Et
                    parçaları, önceden hazırlanan bir marinasyon karışımına
                    batırılarak şişlere dizilir ve ardından mangalda pişirilir.
                    Marinasyon karışımı genellikle yoğurt, zeytinyağı, sarımsak
                    ve çeşitli baharatlardan oluşur. Pişirme sırasında etlerin
                    arası zaman zaman tereyağı ile yağlanır, bu da lezzetini ve
                    suluğunu artırır. Çöpşiş, genellikle közlenmiş domates,
                    biber ve soğanla servis edilirken, yanında pilav, lavaş veya
                    ekmek gibi ek lezzetler de sunulabilir. Bu nefis yemek, Türk
                    mutfağının zengin lezzetlerinden biri olarak mangal
                    partilerinde ve özel günlerde sıkça tercih edilir.
                  </p>
                </div>
                <hr />
                <div className={styles.places_container}>
                  <PlaceCard
                    name="Kalyon Lazutti Çöpşiş"
                    img="/restaurant_placeholder.jpg"
                    stars={4.4}
                    reviews={1292}
                    distance={2.6}
                    on_click={() => {
                      placeButton(3);
                    }}
                  />
                  <PlaceCard
                    name="Efe Çöp Şiş"
                    img="/restaurant_placeholder.jpg"
                    stars={4.3}
                    reviews={1349}
                    distance={2.6}
                    on_click={() => {
                      placeButton(2);
                    }}
                  />
                  <PlaceCard
                    name="Meşhur ortaklar çöp şiş servet usta"
                    img="/restaurant_placeholder.jpg"
                    stars={4.3}
                    reviews={467}
                    distance={2.6}
                    on_click={() => {
                      placeButton(1);
                    }}
                  />
                  <PlaceCard
                    name="Park Çöp Şiş"
                    img="/restaurant_placeholder.jpg"
                    stars={4.0}
                    reviews={110}
                    distance={1.2}
                    on_click={() => {
                      placeButton(4);
                    }}
                  />
                  <PlaceCard
                    name="Ortaklar Cop Sis Kofte Kahvalti Gozleme"
                    img="/restaurant_placeholder.jpg"
                    stars={3.9}
                    reviews={13}
                    distance={2.7}
                    on_click={() => {
                      placeButton(0);
                    }}
                  />
                  <PlaceCard
                    name="Yörük Ali Baba Çöp Şiş"
                    img="/restaurant_placeholder.jpg"
                    stars={3.6}
                    reviews={46}
                    distance={0.8}
                    on_click={() => {
                      placeButton(5);
                    }}
                  />
                </div>
              </>
            )}
            {selectedPlace !== -1 && !loading && (
              <>
                <div className={styles.map_container}>
                  <Map
                    start={[position[1], position[0]]}
                    end={[27.5065, 37.8839]}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
      <BottomNavbar
        active={3}
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
          setSelectedProduct(-1);
          setSelectedPlace(-1);
        }}
        onIntClick={() => {
          router.push("/int");
        }}
      />
    </>
  );
};

export default Favourites;

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
