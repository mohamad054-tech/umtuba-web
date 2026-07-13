export type LivingCity = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  color: string;
};

export type LivingRoute = {
  id: string;
  from: LivingCity;
  to: LivingCity;
  color: string;
  duration: number;
};
