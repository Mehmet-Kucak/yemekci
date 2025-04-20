import React from "react";
import { AppProps } from "next/app";
import "@styles/globals.css";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import Script from "next/script";

const MyApp = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const { locale } = router;

  return (
    <NextIntlClientProvider
      locale={router.locale}
      timeZone="Europe/Istanbul"
      messages={pageProps.messages}
    >
      <Toaster />
      <Component {...pageProps} />
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_GOOGLE_MAPS_API_KEY}&&libraries=places,geometry&v=weekly`}
        strategy="beforeInteractive"
        onLoad={() => console.log("Google Maps API loaded successfully!")}
        onError={() => console.error("Failed to load Google Maps API.")}
      />
    </NextIntlClientProvider>
  );
};

export default MyApp;
