import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// --------------------------
// In-memory mappings
// --------------------------
const urlToIdMap = new Map<string, string>(); // real URL -> internal ID
const idToUrlMap = new Map<string, string>(); // internal ID -> real URL
let nextId = 1;

// --------------------------
// Helper functions
// --------------------------
// function getInternalId(url: string) {
//   if (urlToIdMap.has(url)) return urlToIdMap.get(url)!;
//   const id = String(nextId++);
//   urlToIdMap.set(url, id);
//   idToUrlMap.set(id, url);
//   return id;
// }
function getInternalId(url: string) {
  // generate a short hash of the URL
  const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 8);
  // store in maps (optional, keeps resolveUrl working)
  urlToIdMap.set(url, hash);
  idToUrlMap.set(hash, url);
  return hash;
}
function resolveUrl(id: string) {
  return idToUrlMap.get(id);
}

// --------------------------
// Main GET handler
// --------------------------
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return new NextResponse("Missing ID", { status: 400 });

    // block direct /api access
    const referer = req.headers.get("referer") || "";
    if (
      !referer.includes("/api/") &&
      !referer.includes("localhost") &&
      !referer.includes("http://192.168.1.6:3000/") &&
      !referer.includes("https://www.zxcprime.icu/")
    ) {
      return NextResponse.json(
        { success: true, type: "hls", link: "www.zxcprime.icu" },
        { status: 403 },
      );
    }

    // let target: string;

    // // Numeric internal ID
    // if (/^\d+$/.test(id)) {
    //   const resolved = resolveUrl(id);
    //   if (!resolved) return new NextResponse("Unknown ID", { status: 404 });
    //   target = resolved;
    // } else {
    //   // Original ID scheme: movie-ttXXXX or tv-ttXXXX-s-e
    //   const parts = id.split("-");
    //   const type = parts[0];
    //   const imdbId = parts[1];
    //   const season = parts[2];
    //   const episode = parts[3];

    //   if (!type || !imdbId)
    //     return new NextResponse("Invalid ID", { status: 400 });

    //   target =
    //     type === "tv"
    //       ? `https://scrennnifu.click/serial/${imdbId}/${season}/${episode}/playlist.m3u8`
    //       : `https://scrennnifu.click/movie/${imdbId}/playlist.m3u8`;
    // }
    let target: string;

    if (idToUrlMap.has(id)) {
      // Internal ID
      const resolved = resolveUrl(id)!;
      target = resolved;
    } else {
      // Original ID scheme: movie-ttXXXX or tv-ttXXXX-s-e
      const parts = id.split("-");
      const type = parts[0];
      const imdbId = parts[1];
      const season = parts[2];
      const episode = parts[3];

      if (!type || !imdbId)
        return new NextResponse("Invalid ID", { status: 400 });

      target =
        type === "tv"
          ? `https://scrennnifu.click/serial/${imdbId}/${season}/${episode}/playlist.m3u8`
          : `https://scrennnifu.click/movie/${imdbId}/playlist.m3u8`;
    }
    // Fetch the playlist
    const upstream = await fetchWithTimeout(
      target,
      {
        headers: {
          Referer: "https://screenify.fun/",
          Origin: "https://screenify.fun/",
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
        },
        cache: "no-store",
      },
      5000,
    );

    if (!upstream.ok)
      return new NextResponse(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });

    const contentType = upstream.headers.get("content-type") || "";
    const isPlaylist =
      contentType.includes("mpegurl") || target.endsWith(".m3u8");

    const corsHeaders = {
      "Access-Control-Allow-Origin": req.nextUrl.origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    // If it's a playlist, rewrite internal IDs
    if (isPlaylist) {
      const playlist = await upstream.text();
      const rewritten = rewriteM3U8(
        playlist,
        target,
        req.nextUrl.origin + req.nextUrl.pathname,
      );

      return new NextResponse(rewritten, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=10, s-maxage=10",
        },
      });
    }

    // If it's a video segment (.ts, .m4s), **do NOT proxy** — redirect client directly
    return NextResponse.redirect(target);
  } catch (err) {
    console.error(err);
    return new NextResponse("Server error", { status: 500 });
  }
}

// --------------------------
// Rewrite playlist function
// --------------------------
function rewriteM3U8(text: string, baseUrl: string, proxyBase: string) {
  return text
    .replace(/^([^#\s][^\n]*)$/gm, (line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return line;

      let url: string;
      try {
        url = new URL(line, baseUrl).toString();
      } catch {
        return line;
      }

      // If it ends with .m3u8, replace with internal ID
      if (url.endsWith(".m3u8")) {
        const internalId = getInternalId(url);
        return `${proxyBase}?id=${internalId}`;
      }

      // Otherwise, leave segment URLs as-is (client fetches directly)
      return url;
    })
    .replace(/URI=["']?([^"'\n]+)["']?/g, (m, uri) => {
      try {
        const url = new URL(uri, baseUrl).toString();
        if (!url.endsWith(".m3u8")) return `URI="${url}"`;
        const internalId = getInternalId(url);
        return `URI="${proxyBase}?id=${internalId}"`;
      } catch {
        return m;
      }
    });
}
