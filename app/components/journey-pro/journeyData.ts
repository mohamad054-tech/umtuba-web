import type { City } from "./CityMarker";
import type { Route } from "./JourneyRoute";

export type JourneyCity = City & {
  country: string;
  views: number;
  likes: number;
  comments: number;
  language: string;
};

export const journeyCities: JourneyCity[] = [
  {
    name: "Jerusalem",
    country: "Palestine",
    lat: 31.7683,
    lng: 35.2137,
    color: "#ffffff",
    views: 1200,
    likes: 284,
    comments: 41,
    language: "Arabic",
  },
  {
    name: "Amman",
    country: "Jordan",
    lat: 31.9539,
    lng: 35.9106,
    color: "#67e8f9",
    views: 2600,
    likes: 612,
    comments: 88,
    language: "Arabic",
  },
  {
    name: "Istanbul",
    country: "Türkiye",
    lat: 41.0082,
    lng: 28.9784,
    color: "#a78bfa",
    views: 4100,
    likes: 1032,
    comments: 136,
    language: "Turkish",
  },
  {
    name: "Berlin",
    country: "Germany",
    lat: 52.52,
    lng: 13.405,
    color: "#34d399",
    views: 3700,
    likes: 905,
    comments: 119,
    language: "German",
  },
];

export const journeyRoutes: Route[] = [
  {
    from: journeyCities[0],
    to: journeyCities[1],
    color: "#67e8f9",
  },
  {
    from: journeyCities[1],
    to: journeyCities[2],
    color: "#a78bfa",
  },
  {
    from: journeyCities[2],
    to: journeyCities[3],
    color: "#34d399",
  },
];