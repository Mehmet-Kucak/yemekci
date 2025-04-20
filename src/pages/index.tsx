"use client";

import React, { useState, useEffect, useRef } from "react";
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

const Home = () => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [desc, setDesc] = useState("");
  const [position, setPosition] = useState<[number, number]>([0, 0]); // [lat, lng
  const [city, setCity] = useState<[string, string, string]>(["", "", ""]); // [id, province, error]
  const [searchType, setSearchType] = useState<number>(0); // 0: not searchType, 1: searchType with location, 2: searcing without location
  const [searchState, setSearchState] = useState<number>(0); // 0: not searching, 1: searching location, 2: searching products, 3: searching images
  const [selectedProduct, setSelectedProduct] = useState<number>(-1);
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<number>(-1);
  const [startNav, setStartNav] = useState(false);
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const t = useTranslations("Index");
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
            "restaurant with " + data[selectedProduct].name + " in " + city[1],
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
          locationBias: { lat: position[0], lng: position[1] },
        };

        const { places } = await Place.searchByText(request);
        //console.log(places);
        setPlaces(places);
      })();
    } else {
      //console.log("Selected product is -1, skipping Places API call.");
    }
  }, [selectedProduct]);

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

  const getProducts = async () => {
    function getAccuratePosition(
      threshold = 30, // target accuracy in meters
      maxWait = 20000 // maximum wait time in ms
    ): Promise<GeolocationPosition> {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error("Geolocation not supported"));
        }

        let bestPosition: GeolocationPosition | null = null;
        let watchId: number;

        const timeoutId = setTimeout(() => {
          navigator.geolocation.clearWatch(watchId);
          if (bestPosition) {
            console.warn("Returning best available position (timeout).");
            resolve(bestPosition);
          } else {
            reject(new Error("Timeout and no position available"));
          }
        }, maxWait);

        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            console.log(`Accuracy: ${pos.coords.accuracy} m`);
            if (
              !bestPosition ||
              pos.coords.accuracy < bestPosition.coords.accuracy
            ) {
              bestPosition = pos;
            }

            if (pos.coords.accuracy <= threshold) {
              clearTimeout(timeoutId);
              navigator.geolocation.clearWatch(watchId);
              resolve(pos);
            }
          },
          (err) => {
            clearTimeout(timeoutId);
            navigator.geolocation.clearWatch(watchId);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: maxWait,
          }
        );
      });
    }

    if (navigator.geolocation) {
      try {
        const position = await getAccuratePosition(100, 10000);
        const { latitude: lat, longitude: lng } = position.coords;

        console.log(lat, lng);
        setPosition([lat, lng]);

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
    setStartNav(false);
    setDesc("");
    setSearchType(1);
    setSearchState(1);
    getProducts();
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
        <h2>GastroKeşif</h2>
        <button className={styles.header_button} onClick={profileButton}>
          <img src="/person_icon.png" alt="" />
        </button>
      </header>
      <main className={styles.main} ref={mainRef}>
        {selectedProduct === -1 && selectedPlace === -1 && !startNav && (
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
        {selectedProduct !== -1 && selectedPlace === -1 && !startNav && (
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
                      autoplay={{ delay: 3000, disableOnInteraction: false }}
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
                              lat: places[selectedPlace].location?.lat() || 0,
                              lng: places[selectedPlace].location?.lng() || 0,
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
                      {places[selectedPlace].reviews?.map((review, index) => (
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
                                  {review.authorAttribution?.displayName ||
                                    "Unknown User"}
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
                      ))}
                    </div>
                  </div>
                </div>

                <button className={styles.place_nav_button} onClick={navButton}>
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
