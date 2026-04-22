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

type State = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  lastResponse: MedicalResponse | null;
  setLastResponse: (r: MedicalResponse | null) => void;
  lastInputLabel: string | null;
  setLastInputLabel: (s: string | null) => void;
};

export const useAppStore = create<State>((set, get) => ({
  lang: "en",
  setLang: (l) => set({ lang: l }),
  t: (key) => tFor(get().lang, key),
  lastResponse: null,
  setLastResponse: (r) => set({ lastResponse: r }),
  lastInputLabel: null,
  setLastInputLabel: (s) => set({ lastInputLabel: s }),
}));
