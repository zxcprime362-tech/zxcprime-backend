import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface Subtitle {
  id: string;
  url: string;
  language: string;
  display: string;
  format: "srt";
  isHearingImpaired?: boolean;
  flagUrl?: string;
  source?: string;
  label: string;
  file: string;
}

interface UseSubtitlesParams {
  tmdbId?: number;
  imdbId?: string;
  season?: number; // optional for movies
  episode?: number; // optional for movies
  media_type: string;
}

export function useSubtitles({
  tmdbId,
  imdbId,
  season,
  episode,
  media_type,
}: UseSubtitlesParams) {
  return useQuery<Subtitle[], Error>({
    queryKey: ["libreSubs", imdbId, season, episode],
    queryFn: async () => {
      const { data } = await axios.get(
        `https://sub.wyzie.ru/search?id=${tmdbId}${
          season ? `&season=${season}&episode=${episode}` : ""
        }`,
        {
          params: { imdbId, season, episode },
        },
      );
      data.sort((a: Subtitle, b: Subtitle) =>
        a.language.localeCompare(b.language),
      );

      return data;
    },
    enabled: !!imdbId || !!tmdbId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
