import React, { useState, useEffect, useRef } from "react";
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

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation as SwiperNavigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

type DocumentData = {
  id: string;
  name: string;
  province: string;
  img: string;
};
const Favourites = () => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [desc, setDesc] = useState("");

  const [loading, setLoading] = useState<boolean>(true);
  const [position, setPosition] = useState<[number, number]>([0, 0]); // [lat, lng
  const [selectedProduct, setSelectedProduct] = useState<number>(-1);
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<number>(-1);
  const router = useRouter();
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [startNav, setStartNav] = useState(false);
  const t = useTranslations("Favourites");
  const mainRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (selectedProduct !== -1) {
      (async () => {
        const { Place } = (await google.maps.importLibrary(
          "places"
        )) as google.maps.PlacesLibrary;

        const request = {
          textQuery:
            "restaurant with " +
            data[selectedProduct].name +
            " in " +
            data[selectedProduct].province,
          fields: [
            "displayName",
            "id",
            "location",
            "photos",
            "rating",
            "userRatingCount",
            "reviews",
          ],
          includedType: "restaurant",
        };

        const { places } = await Place.searchByText(request);
        //console.log(places);
        setPlaces(places);
      })();
    } else {
      //console.log("Selected product is -1, skipping Places API call.");
    }
  }, [selectedProduct]);

  useEffect(() => {
    getProducts();
  }, [userData]);

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

  const getDistanceInKm = (
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral
  ) => {
    const fromLatLng = new google.maps.LatLng(from.lat, from.lng);
    const toLatLng = new google.maps.LatLng(to.lat, to.lng);
    const distanceInMeters =
      google.maps.geometry.spherical.computeDistanceBetween(
        fromLatLng,
        toLatLng
      );
    return distanceInMeters / 1000; // in kilometers
  };

  const productButton = async (product: number) => {
    await setSelectedProduct(product);
    setDesc("");
    setSelectedPlace(-1);
    setStartNav(false);
    await fetchDescription(product);
  };

  const placeButton = (index: number) => {
    setSelectedPlace(index);
    setStartNav(false);
  };

  const navButton = () => {
    setStartNav(true);
  };

  const backButton = () => {
    if (selectedPlace === -1 && selectedProduct === -1) {
      router.back();
    }
    if (startNav) {
      setStartNav(false);
    } else if (selectedPlace !== -1) {
      setSelectedPlace(-1);
    } else {
      setSelectedProduct(-1);
      setDesc("");
    }
  };

  const profileButton = () => {
    router.push("/profile");
  };

  const fetchDescription = async (product: number) => {
    const res = await fetch("/api/getOpenai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data[product].name,
        lang: router.locale,
        city: data[product].province,
      }),
    });
    const desc = await res.json();
    setDesc(desc.description);
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
        <h2>GastroKeşif</h2>
        <button className={styles.header_button} onClick={profileButton}>
          <img src="/person_icon.png" alt="" />
        </button>
      </header>
      <main className={styles.main} ref={mainRef}>
        {selectedProduct === -1 && selectedPlace === -1 && !startNav && (
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
            {data.length === 0 && !loading && !startNav && (
              <h1 className={styles.title}>{t("noFavourites")}</h1>
            )}
            {selectedProduct === -1 && !loading && !startNav && (
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
            {selectedProduct !== -1 &&
              selectedPlace === -1 &&
              !loading &&
              !startNav && (
                <>
                  <h2 className={styles.title}>
                    <span>{data[selectedProduct].name}</span>
                    <br />
                    {data[selectedProduct].province}
                  </h2>
                  <div className={styles.ai}>
                    <h3>
                      {t("aboutProduct", {
                        product: data[selectedProduct].name,
                      })}
                    </h3>
                    <br />
                    {desc === "" ? (
                      <div className={styles.loaderWhite}>&nbsp;</div>
                    ) : (
                      <p>{desc}</p>
                    )}
                  </div>
                  <hr />
                  <div className={styles.places_container}>
                    {places.map((p, i) => (
                      <PlaceCard
                        key={i}
                        name={p.displayName! || "Unknown Place"}
                        img={
                          typeof p.photos?.[0]?.getURI === "function"
                            ? p.photos[0].getURI()
                            : "/noImg.svg"
                        }
                        stars={p.rating || 0}
                        reviews={p.userRatingCount || 0}
                        distance={
                          Math.round(
                            getDistanceInKm(
                              { lat: position[0], lng: position[1] },
                              {
                                lat: p.location?.lat() || 0,
                                lng: p.location?.lng() || 0,
                              }
                            ) * 10
                          ) / 10
                        }
                        on_click={() => placeButton(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            {selectedPlace !== -1 && !startNav && (
              <>
                <div className={styles.place_preview}>
                  <h2 className={styles.place_title}>
                    <span>{places[selectedPlace].displayName}</span>
                    <br />
                  </h2>
                  <div className={styles.place_info}>
                    {
                      <div className={styles.carouselWrapper}>
                        <Swiper
                          modules={[SwiperNavigation, Pagination]}
                          spaceBetween={10}
                          slidesPerView={1}
                          loop={true}
                          autoplay={{
                            delay: 3000,
                            disableOnInteraction: false,
                          }}
                          navigation
                          pagination={{ clickable: true }}
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                          }}
                        >
                          {places[selectedPlace].photos?.map((photo, idx) => {
                            const src = photo.getURI();
                            return (
                              <SwiperSlide key={idx}>
                                <div className={styles.slide}>
                                  <img
                                    src={src}
                                    alt={`Place photo ${idx + 1}`}
                                    className={styles.slideImage}
                                  />
                                </div>
                              </SwiperSlide>
                            );
                          })}
                        </Swiper>
                      </div>
                    }
                    <div className={styles.place_info_text}>
                      <div className={styles.place_info_row}>
                        <div className={styles.place_distance_info}>
                          <img src="/direction_icon.svg" alt="" />
                          <span className={styles.place_distance_text}>
                            {Math.round(
                              getDistanceInKm(
                                { lat: position[0], lng: position[1] },
                                {
                                  lat:
                                    places[selectedPlace].location?.lat() || 0,
                                  lng:
                                    places[selectedPlace].location?.lng() || 0,
                                }
                              ) * 10
                            ) / 10}{" "}
                            km
                          </span>
                        </div>
                        <div className={styles.place_rating_info}>
                          <img src="/fullstar_icon.svg" alt="" />
                          <span className={styles.place_rating_value}>
                            {places[selectedPlace].rating}
                          </span>
                          <span className={styles.place_rating_count}>
                            ({places[selectedPlace].userRatingCount})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.reviews_container}>
                      <h2 className={styles.reviews_title}>{t("reviews")}</h2>
                      <div className={styles.custom_scroll_area}>
                        <div className={styles.reviews_list}>
                          {places[selectedPlace].reviews?.map(
                            (review, index) => (
                              <div key={index} className={styles.review_card}>
                                <div className={styles.review_content}>
                                  <div className={styles.review_avatar}>
                                    {review.authorAttribution?.photoURI ? (
                                      <img
                                        src={
                                          review.authorAttribution.photoURI ||
                                          "/placeholder.svg"
                                        }
                                        alt={"User Avatar"}
                                        width={40}
                                        height={40}
                                        className={styles.avatar_image}
                                      />
                                    ) : null}
                                  </div>
                                  <div className={styles.review_details}>
                                    <div className={styles.review_header}>
                                      <span className={styles.reviewer_name}>
                                        {review.authorAttribution
                                          ?.displayName || "Unknown User"}
                                      </span>
                                      <span className={styles.review_date}>
                                        {review.relativePublishTimeDescription ||
                                          "Unknown Date"}
                                      </span>
                                    </div>
                                    <div className={styles.review_stars}>
                                      {[...Array(5)].map((_, i) => (
                                        <img
                                          key={i}
                                          src={
                                            i < (review.rating ?? 0)
                                              ? "/fullstar_icon.svg"
                                              : "/fullstar_white_icon.svg"
                                          }
                                          alt="Star"
                                          className={styles.star_icon}
                                        />
                                      ))}
                                    </div>
                                    <p className={styles.review_text}>
                                      {review.text}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      className={styles.place_nav_button}
                      onClick={navButton}
                    >
                      <img src="/nav_icon.svg" alt="" />
                      {t("startNav")}
                    </button>
                  </div>
                </div>
              </>
            )}
            {startNav && selectedPlace !== -1 && (
              <Map
                origin={{
                  lat: position[0],
                  lng: position[1],
                }}
                destination={{
                  lat: places[selectedPlace].location?.lat() || 0,
                  lng: places[selectedPlace].location?.lng() || 0,
                }}
              />
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
