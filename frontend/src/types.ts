export type Priority = "save_water" | "build_soil" | "income_forage";
export type SoilAnswer = "bare" | "stubble" | "other";

export interface CropOption {
  crop: string;
  label: string;
  labels?: Record<"en" | "de" | "el", string>;
  climate: string;
  sow_month: number;
  harvest_month: number;
}

export interface CropRow {
  id: number;
  crop: string;
  sow_month: number;
  harvest_month: number;
}

export interface TimelineItem {
  year: number;
  month: number;
  crop: string | null;
  crop_label?: string | null;
  cover_crop: boolean;
  protected: boolean;
  seen_from_space?: "covered" | "bare" | "no_image";
  crop_months_say_bare?: boolean;
}

export interface RotationResult {
  id: "current" | "soil_building" | "water_saving";
  name: string;
  crops: { crop: string; sow_month: number; harvest_month: number; cover_crop: boolean }[] | null;
  reason?: string;
  months_covered_per_year?: number;
  rain_on_open_soil_pct?: number;
  extra_water_mm_per_year?: number;
  earning_months_per_year?: number;
  timeline: TimelineItem[];
}

export interface RotationWords {
  id: RotationResult["id"];
  available: boolean;
  decision: string | null;
  reason?: string;
  changes?: string[];
  better?: string[];
  warnings?: string[];
  ask_advisor?: string[];
}

export interface Analysis {
  result: {
    field: { area_ha: number; green_cover_source: string };
    rotations: RotationResult[];
    ranking: string[];
    priority: Priority;
  };
  words: {
    shared_warnings: string[];
    weather: { topic: string; trend: "up" | "down" | "same"; text: string }[];
    weather_period: string;
    soil: { open_months: number[]; text: string; covered: string; rain: string; slope?: string | null };
    satellite?: { agreement: string; blind: string | null } | null;
    water: string;
    sources: string[];
    rotations: RotationWords[];
    summary: string;
  };
  weather_note: string | null;
  climate_zone: string;
}

export interface AnalyseRequest {
  field: GeoJSON.Polygon;
  crops: { crop: string; sow_month: number; harvest_month: number }[];
  irrigated: boolean;
  priority: Priority;
  soil_answer: SoilAnswer;
  lang: "en" | "de" | "el";
}

export const PRIORITIES: { id: Priority; label: "p_save_water" | "p_build_soil" | "p_income_forage";
  hint: "p_save_water_hint" | "p_build_soil_hint" | "p_income_forage_hint" }[] = [
  { id: "save_water", label: "p_save_water", hint: "p_save_water_hint" },
  { id: "build_soil", label: "p_build_soil", hint: "p_build_soil_hint" },
  { id: "income_forage", label: "p_income_forage", hint: "p_income_forage_hint" },
];
