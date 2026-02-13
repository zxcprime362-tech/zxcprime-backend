import { create } from "zustand";
interface AdStore {
  lastAdTime: number; // timestamp in ms
  triggerAd: () => void;
}

export const useAdStore = create<AdStore>((set, get) => ({
  lastAdTime: 0,
  triggerAd: () => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const minutesPassed = (now - get().lastAdTime) / 1000 / 60; // convert ms to minutes

    console.log(
      `Minutes passed since last ad: ${minutesPassed.toFixed(2)} min`,
    );
    if (now - get().lastAdTime >= fiveMinutes) {
      console.log("Opening ad popup...");
      window.open(
        "https://robotbagpipe.com/m1n8h68e?key=a640607f30762b7dd7189c135c77afcd",
        "_blank",
      );
      set({ lastAdTime: now });
    } else {
      console.log("Not enough time has passed. Ad will not open.");
    }
  },
}));
