import type { IconType } from "react-icons";
import {
  FaDumbbell, FaUserTie, FaAppleWhole, FaSnowflake, FaShower, FaSquareParking,
  FaHeartPulse, FaWifi, FaBolt, FaMedal, FaPersonSwimming, FaSpa,
} from "react-icons/fa6";

// Feature icons in the dashboard are picked from these keys
export const FEATURE_ICONS: Record<string, IconType> = {
  dumbbell: FaDumbbell,
  trainer: FaUserTie,
  diet: FaAppleWhole,
  ac: FaSnowflake,
  shower: FaShower,
  parking: FaSquareParking,
  cardio: FaHeartPulse,
  wifi: FaWifi,
  energy: FaBolt,
  medal: FaMedal,
  pool: FaPersonSwimming,
  spa: FaSpa,
};
