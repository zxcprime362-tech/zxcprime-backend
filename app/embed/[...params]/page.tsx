"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import "ldrs/react/Ring.css";
import { Tailspin } from "ldrs/react";
import "ldrs/react/Tailspin.css";
import { useAdStore } from "@/store/ad-store";
export default function ZXCPlayer() {
  const { params } = useParams() as { params?: string[] };
  const [isLoading, setIsLoading] = useState(true);
  const [showAd, setShowAd] = useState(true);
  const media_type = params?.[0];
  const id = params?.[1];
  const season = params?.[2];
  const episode = params?.[3];

  const query = new URLSearchParams({
    type: media_type || "",
    id: id || "",
    ...(media_type === "tv" && season && episode ? { season, episode } : {}),
  }).toString();
  const path = `/api/backup?${query}`;
  console.log(path);

  useEffect(() => {
    if (!showAd) {
      const timer = setTimeout(() => {
        setShowAd(true);
      }, 300000);

      return () => clearTimeout(timer);
    }
  }, [showAd]);
  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      {showAd && (
        <a
          href="https://robotbagpipe.com/m1n8h68e?key=a640607f30762b7dd7189c135c77afcd"
          target="_blank"
          className="fixed inset-0 z-50"
          onClick={() => setShowAd(false)}
        ></a>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Tailspin size="80" stroke="7" speed="0.9" color="white" />
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={path}
        className="absolute inset-0 w-full h-screen"
        frameBorder={0}
        allowFullScreen
        // Hide iframe until it's fully loaded
        style={{ opacity: isLoading ? 0 : 1 }}
        onLoad={() => setIsLoading(false)}
        // Optional: handle errors
        onError={() => setIsLoading(false)}
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  );
}
