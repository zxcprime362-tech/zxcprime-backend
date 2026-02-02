import { encodeBase64Url } from "@/lib/base64";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/token";

type Source = {
  file: string;
  type: string;
  label: string;
};

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("a");
    const media_type = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putanginamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!id || !media_type || !ts || !token) {
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 }
      );
    }

    // ⏱ expire after 8 seconds
    if (
      Date.now() - ts > 8000 ||
      !validateBackendToken(id, f_token, ts, token)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 }
      );
    }

    // block direct /api access
    const referer = req.headers.get("referer") || "";
    if (
      !referer.includes("/api/") &&
      !referer.includes("localhost") &&
      !referer.includes("http://192.168.1.6:3000/") &&
      !referer.includes("https://www.zxcstream.xyz/")
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Xpass playlist URL
    const sourceLink =
      media_type === "tv"
        ? `https://play.xpass.top/meg/tv/${id}/${season}/${episode}/playlist.json`
        : `https://play.xpass.top/meg/movie/${id}/0/0/playlist.json`;

    const res = await fetchWithTimeout(
      sourceLink,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          Referer: "https://play.xpass.top/",
          Origin: "https://play.xpass.top",
        },
      },
      8000
    );
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          status: res.status,
          body: text.slice(0, 300),
        },
        { status: res.status }
      );
    }
    const data = await res.json();
    if (!Array.isArray(data.playlist) || data.playlist.length === 0) {
      return NextResponse.json(
        { success: false, error: "No sources found" },
        { status: 404 }
      );
    }
    const lastSource = data.playlist.at(-1);
    const finalSource = lastSource.sources.at(-1);

    if (!finalSource) {
      return NextResponse.json(
        { success: false, error: "No final source found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      link: finalSource.file,
      type: finalSource.type,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
