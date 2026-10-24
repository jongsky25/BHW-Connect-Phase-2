export type PlantAid = {
  key: string;
  name: string;
  botanicalName: string;
  part: { en: string; fil: string };
};

export const plantAidVersion = "pilot-1 · 2026-10-24";
export const plantAidOwner = "Ray Justin Ventura";
export const plantAidSource = "https://pitahc.gov.ph/herbs-directory/";

// Names checked against the PITAHC directory on 2026-10-24. Parts reproduce
// the corresponding Chapter 2 lesson's action section. This pilot adds no
// dose, preparation, prescribing instruction or identification certification.
export const plantAids: PlantAid[] = [
  { key: "akapulko", name: "Akapulko", botanicalName: "Senna alata", part: { en: "Leaves", fil: "Dahon" } },
  { key: "ampalaya", name: "Ampalaya", botanicalName: "Momordica charantia", part: { en: "Leaves", fil: "Dahon" } },
  { key: "bawang", name: "Bawang", botanicalName: "Allium sativum", part: { en: "Bulb", fil: "Bulbo" } },
  { key: "bayabas", name: "Bayabas", botanicalName: "Psidium guajava", part: { en: "Leafy tops", fil: "Talbos/dahon" } },
  { key: "lagundi", name: "Lagundi", botanicalName: "Vitex negundo", part: { en: "Leaves", fil: "Dahon" } },
  { key: "niyog-niyogan", name: "Niyog-niyogan", botanicalName: "Quisqualis indica", part: { en: "Seeds", fil: "Buto" } },
  { key: "sambong", name: "Sambong", botanicalName: "Blumea balsamifera", part: { en: "Leaves", fil: "Dahon" } },
  { key: "tsaang-gubat", name: "Tsaang-gubat", botanicalName: "Carmona retusa", part: { en: "Leaves", fil: "Dahon" } },
  { key: "ulasimang-bato", name: "Ulasimang bato / Pansit-pansitan", botanicalName: "Peperomia pellucida", part: { en: "Leafy tops", fil: "Talbos/dahon" } },
  { key: "yerba-buena", name: "Yerba buena", botanicalName: "Mentha cordifolia", part: { en: "Leaves", fil: "Dahon" } },
];
