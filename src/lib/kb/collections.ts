import manual from "../../../content/training/day1-basic-competencies/categories.json";
import program from "../../../content/training/day1-basic-competencies/program.json";
import hhp from "../../../content/kb/hhp-ncd/categories.json";
import philhealth from "../../../content/kb/philhealth-gabay/categories.json";

export const collectionIds = ["manual", "hhp", "philhealth", "other"] as const;
export type CollectionId = typeof collectionIds[number];
const chapter = program.chapters.find(item => item.delivery_course === "day1-basic-competencies")!;

/** Exact authored category membership only: a slug prefix or sort order never establishes a course sequence. */
export function kbCollection(slug: string) {
  const basic = manual.categories.find(item => item.slug === slug);
  if (basic) return { id: "manual" as CollectionId, module: basic.module, total: manual.categories.length, chapter: chapter.position + 1 };
  const screening = hhp.categories.find(item => item.slug === slug);
  if (screening) return { id: "hhp" as CollectionId, module: screening.module, total: hhp.categories.length, chapter: null };
  return { id: (philhealth.categories.some(item => item.slug === slug) ? "philhealth" : "other") as CollectionId,
    module: null, total: null, chapter: null };
}

/** Module numbers are presented in the verified collection context, separately from the topic title. */
export function kbTopicTitle(name: string) {
  return name.replace(/^(?:Module|Modyul)\s+\d+\s*[—–:\-]\s*/i, "");
}

export function kbCollectionTitle(id: CollectionId, locale: string) {
  const en = locale === "en";
  return {
    manual: `BHW Reference Manual · ${en ? "Chapter" : "Kabanata"} ${chapter.position + 1}`,
    hhp: "HHP+ / PhilPEN",
    philhealth: en ? "PhilHealth guidance" : "Gabay sa PhilHealth",
    other: en ? "Additional health topics" : "Iba pang paksa sa kalusugan",
  }[id];
}

export function kbTopicContext(slug: string, locale: string) {
  const context = kbCollection(slug), en = locale === "en";
  if (context.module !== null) {
    const prefix = context.chapter ? `${en ? "Chapter" : "Kabanata"} ${context.chapter} · ` : "HHP+ / PhilPEN · ";
    return prefix + (en ? `Module ${context.module} of ${context.total}` : `Modyul ${context.module} sa ${context.total}`);
  }
  return context.id === "philhealth" ? kbCollectionTitle("philhealth", locale) : en ? "Reference topic" : "Paksang sanggunian";
}

export function kbTopicIdentity(slug: string, locale: string) {
  const collection = kbCollection(slug);
  return collection.id === "manual" ? `BHW Reference Manual · ${kbTopicContext(slug, locale)}`
    : collection.id === "hhp" ? kbTopicContext(slug, locale)
      : `${kbCollectionTitle(collection.id, locale)} · ${kbTopicContext(slug, locale)}`;
}
