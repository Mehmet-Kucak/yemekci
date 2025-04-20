"use client";

import React, { use, useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";
import styles from "@styles/DynamicMap.module.css";
import { useTranslations } from "next-intl";
import { useRouter } from "next/router";

interface CoordsDirectionsProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode?: google.maps.TravelMode;
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
}

export default function CoordsDirections({
  origin,
  destination,
  travelMode = google.maps.TravelMode.DRIVING,
  mapCenter = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  },
  mapZoom = 7,
}: CoordsDirectionsProps) {
  const router = useRouter();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_GOOGLE_MAPS_API_KEY!,
    libraries: ["places", "geometry"],
  });

  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [showPanel, setShowPanel] = useState(false);
  const t = useTranslations("Other");

  const onDirectionsCallback = useCallback(
    (
      result: google.maps.DirectionsResult | null,
      status: google.maps.DirectionsStatus
    ) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        setDirections(result);
      } else {
        console.error("Directions request failed:", status);
      }
    },
    []
  );

  if (!isLoaded) return <p>Loading map…</p>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button
          className={styles.toggleButton}
          onClick={() => setShowPanel((prev) => !prev)}
        >
          {showPanel ? t("hideDir") : t("showDir")}
        </button>
      </div>

      <div
        ref={panelRef}
        className={`${styles.dropdown} ${showPanel ? styles.open : ""}`}
      />

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={mapCenter}
        zoom={mapZoom}
        mapContainerClassName="mapContainer"
        options={{
          gestureHandling: "greedy",
          disableDefaultUI: true,
        }}
      >
        {!directions && (
          <DirectionsService
            options={{ origin, destination, travelMode }}
            callback={onDirectionsCallback}
          />
        )}
        {directions && panelRef.current && (
          <DirectionsRenderer
            options={{ directions, panel: panelRef.current! }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
