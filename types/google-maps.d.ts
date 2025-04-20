/// <reference types="google.maps" />

declare global {
  interface Window {
    google: typeof google;
  }
}

// This makes TS pick it up automatically if you have "typeRoots" or "include" covering config/types
export {};
