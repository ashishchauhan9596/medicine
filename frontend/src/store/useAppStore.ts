import { create } from "zustand";
import type { Lang } from "../i18n/translations";
import { tFor } from "../i18n/translations";

export type MedicalResponse = {
  medicine_name: string | null;
  summary: string;
  uses: string[];
  common_dosage_note: string;
  safety_tips: string[];
  side_effects: string[];
  when_to_see_doctor: string[];
  red_flag: boolean;
  red_flag_message: string | null;
  disclaimer: string;
  language: Lang;
};

export type MedicineEntry = {
  name: string;
  summary: string;
  uses: string[];
  dosage_note: string;
  safety_tips: string[];
};

export type MultiMedicineResponse = {
  medicines: MedicineEntry[];
  interactions: string[];
  combined_safety: string[];
  when_to_see_doctor: string[];
  red_flag: boolean;
  red_flag_message: string | null;
  disclaimer: string;
  language: Lang;
};

type State = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;

  // Single-response (image / text / voice → single medicine)
  lastResponse: MedicalResponse | null;
  setLastResponse: (r: MedicalResponse | null) => void;

  // Multi-medicine response
  lastMultiResponse: MultiMedicineResponse | null;
  setLastMultiResponse: (r: MultiMedicineResponse | null) => void;

  lastInputLabel: string | null;
  setLastInputLabel: (s: string | null) => void;

  // Loading state shared across screens (skeleton)
  isLoadingResponse: boolean;
  setIsLoadingResponse: (b: boolean) => void;

  loadError: string | null;
  setLoadError: (s: string | null) => void;

  // Reset before a new request
  beginRequest: (label: string) => void;
};

export const useAppStore = create<State>((set, get) => ({
  lang: "en",
  setLang: (l) => set({ lang: l }),
  t: (key) => tFor(get().lang, key),

  lastResponse: null,
  setLastResponse: (r) => set({ lastResponse: r, isLoadingResponse: false }),

  lastMultiResponse: null,
  setLastMultiResponse: (r) =>
    set({ lastMultiResponse: r, isLoadingResponse: false }),

  lastInputLabel: null,
  setLastInputLabel: (s) => set({ lastInputLabel: s }),

  isLoadingResponse: false,
  setIsLoadingResponse: (b) => set({ isLoadingResponse: b }),

  loadError: null,
  setLoadError: (s) => set({ loadError: s }),

  beginRequest: (label) =>
    set({
      lastResponse: null,
      lastMultiResponse: null,
      lastInputLabel: label,
      isLoadingResponse: true,
      loadError: null,
    }),
}));
