import React, { useState, useEffect } from "react";
import Head from "next/head";
import styles from "@styles/home.module.css";
import BottomNavbar from "@components/BottomNavbar";
import StaticMap from "@/components/StaticMap";
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
import PlaceCard from "@/components/PlaceCard";
import Map from "@/components/DynamicMap";
import { useRouter } from "next/router";
import { User, onAuthStateChanged } from "firebase/auth";
import { useTranslations } from "next-intl";

type DocumentData = {
  id: string;
  name: string;
  province: string;
  img: string;
};

const Home = () => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [position, setPosition] = useState<[number, number]>([0, 0]); // [lat, lng
  const [city, setCity] = useState<[string, string, string]>(["", "", ""]); // [id, province, error]
  const [searchType, setSearchType] = useState<number>(0); // 0: not searchType, 1: searchType with location, 2: searcing without location
  const [searchState, setSearchState] = useState<number>(0); // 0: not searching, 1: searching location, 2: searching products, 3: searching images
  const [selectedProduct, setSelectedProduct] = useState<number>(-1);
  const [selectedPlace, setSelectedPlace] = useState<number>(-1);
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const t = useTranslations("Index");

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
        const response = await fetch(`/api/getLocation?lat=${lat}&lng=${lng}`);
        const responseData = await response.json();

        if (response.ok) {
          await setCity([responseData.id, responseData.province, "success"]);
          await setSearchState(2);
          await setData([]);
          await setSelectedProduct(-1);
          await setSelectedPlace(-1);

          const excludedProductGroups = [
            "Diğer ürünler",
            "Dokumalar",
            "Halılar ve kilimler",
            "Halılar, kilimler ve dokumalar dışında kalan el sanatı ürünleri",
          ];

          try {
            const q = query(
              collection(db, responseData.id),
              where("productGroup", "not-in", excludedProductGroups)
            );

            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: data.registrationNumber,
                name: data.name,
                province: data.province,
                img: data.img,
              };
            });

            setData(docs);
          } catch (error) {
            console.error("Error fetching documents: ", error);
          }
        } else {
          await setCity(["", "", responseData.error]);
          await console.error(responseData.error);
          await toast.error(responseData.error);
        }
      } catch (err: any) {
        await setCity(["", "", err.message]);
        await console.error(err.message);
        await toast.error(err.message);
      }
    } else {
      setCity(["", "", "Geolocation is not supported"]);
      console.error("Geolocation is not supported by this browser.");
      toast.error("Geolocation is not supported by this browser.");
    }

    await setSearchState(0);
    await setSearchType(0);
  };

  const searchButton = () => {
    setSelectedProduct(-1);
    setSelectedPlace(-1);
    setSearchType(1);
    setSearchState(1);
    getProducts();
  };

  const productButton = (product: number) => {
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

  const favButton = async () => {
    if (currUser && data[selectedProduct]) {
      const favourite = { city: city[0], id: data[selectedProduct].id };
      await AddToFavourites(currUser.uid, favourite);
      const updatedUserData = await GetUserData(currUser.uid);
      setUserData(updatedUserData);
    }
  };

  const unfavButton = async () => {
    if (currUser && data[selectedProduct]) {
      const favourite = { city: city[0], id: data[selectedProduct].id };
      await RemoveFromFavourites(currUser.uid, favourite);
      const updatedUserData = await GetUserData(currUser.uid);
      setUserData(updatedUserData);
    }
  };

  return (
    <>
      <Head>
        <title>Ana Sayfa</title>
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
        {/**<img src="/YemekCi.png" alt="yemekci" className={styles.logo} />**/}
        <h2>Gastro Keşif</h2>
        <button className={styles.header_button} onClick={profileButton}>
          <img src="/person_icon.png" alt="" />
        </button>
      </header>
      <main className={styles.main}>
        {selectedProduct === -1 && selectedPlace === -1 && (
          <>
            {data.length === 0 ? (
              <h2 className={styles.title}>
                <span>{t("title")}</span>
                <br />
                {t("description")}
              </h2>
            ) : (
              <h2 className={styles.title}>
                <span>{city[1]}</span>
                <br />
                {t("found", { number: data.length })}
              </h2>
            )}
            <div className={styles.bracket_container}>
              <div className={styles.bracket1} />
              <StaticMap city={city[0].toString()} />
              <div className={styles.bracket2} />
            </div>

            {searchType === 0 && (
              <button className={styles.search_button} onClick={searchButton}>
                {t("search")}
              </button>
            )}
            {searchType !== 0 && <div className={styles.loader}>&nbsp;</div>}
            {searchType === 1 && searchState === 1 && (
              <h3 className={styles.loader_text}>{t("searchingLocation")}</h3>
            )}
            {searchType === 1 && searchState === 2 && (
              <h3 className={styles.loader_text}>{t("searchingProducts")}</h3>
            )}
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
        {selectedProduct !== -1 && selectedPlace === -1 && (
          <>
            <h2 className={styles.title}>
              <span>{data[selectedProduct].name}</span>
              <br />
              {data[selectedProduct].province}
            </h2>
            {userData?.Favourites.some(
              (fav: any) => fav.id === data[selectedProduct].id
            ) ? (
              <button className={styles.add_to_fav} onClick={unfavButton}>
                <img src="/fullstar_icon.svg" alt="Remove from Favourites" />
                {t("removeFav")}
              </button>
            ) : (
              <button className={styles.add_to_fav} onClick={favButton}>
                <img src="/star_yellow_icon.svg" alt="Add to Favourites" />
                {t("addFav")}
              </button>
            )}

            <div className={styles.ai}>
              <h3>
                {t("aboutProduct", { product: data[selectedProduct].name })}
              </h3>
              <br />
              <p>
                Ortaklar Çöpşiş, Türk mutfağının sevilen lezzetlerinden biridir.
                Kökeni Anadolu&apos;ya dayanan bu yemek, genellikle dana eti
                veya tavuk eti kullanılarak hazırlanır. Et parçaları, önceden
                hazırlanan bir marinasyon karışımına batırılarak şişlere dizilir
                ve ardından mangalda pişirilir. Marinasyon karışımı genellikle
                yoğurt, zeytinyağı, sarımsak ve çeşitli baharatlardan oluşur.
                Pişirme sırasında etlerin arası zaman zaman tereyağı ile
                yağlanır, bu da lezzetini ve suluğunu artırır. Çöpşiş,
                genellikle közlenmiş domates, biber ve soğanla servis edilirken,
                yanında pilav, lavaş veya ekmek gibi ek lezzetler de
                sunulabilir. Bu nefis yemek, Türk mutfağının zengin
                lezzetlerinden biri olarak mangal partilerinde ve özel günlerde
                sıkça tercih edilir.
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
        {selectedPlace !== -1 && (
          <>
            <div className={styles.map_container}>
              <Map
                start={[position[1], position[0]]}
                end={[27.5065, 37.8839]}
              />
            </div>
          </>
        )}
      </main>
      <BottomNavbar
        active={0}
        onHomeClick={() => {
          setSelectedProduct(-1);
          setSelectedPlace(-1);
        }}
        onSearchClick={() => {
          router.push("/search");
        }}
        onLocationClick={searchButton}
        onFavsClick={() => {
          router.push("/favourites");
        }}
        onIntClick={() => {
          router.push("/int");
        }}
      />
    </>
  );
};

export default Home;

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
