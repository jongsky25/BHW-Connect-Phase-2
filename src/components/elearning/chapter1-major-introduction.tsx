"use client";

import { useEffect, useState } from "react";
import { NotesMarkdown } from "@/components/elearning/notes-markdown";
import { createClient } from "@/lib/supabase/client";

type Intro = { id: string; major_lesson: number; body_en: string; body_fil: string };

export function Chapter1MajorIntroduction({ intro, courseId, learnerId, language }: {
  intro: Intro; courseId: string; learnerId: string; language: "en" | "fil";
}) {
  const key = `chapter1-intro:v1:${learnerId}:${courseId}:${intro.id}`;
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.resolve(createClient().rpc("rpc_chapter_intro_open", { p_course_id: courseId, p_intro_id: intro.id }))
      .then(({ data, error }) => {
        if (!active) return;
        let wasSeen = !error && data === false;
        if (error) {
          try { wasSeen = window.localStorage.getItem(key) === "seen"; }
          catch { wasSeen = false; }
        }
        setSeen(wasSeen);
        setOpen(!wasSeen);
        try { window.localStorage.setItem(key, "seen"); } catch { /* Storage is optional. */ }
        setReady(true);
      }).catch(() => {
        if (!active) return;
        let wasSeen = false;
        try { wasSeen = window.localStorage.getItem(key) === "seen"; } catch { /* Storage is optional. */ }
        setSeen(wasSeen);
        setOpen(!wasSeen);
        setReady(true);
      });
    return () => { active = false; };
  }, [courseId, intro.id, key]);

  const title = language === "en" ? `Introduction to Major Lesson ${intro.major_lesson}` :
    `Panimula sa Aralin ${intro.major_lesson}`;
  if (!ready) return null;
  return <section className="rounded-xl border border-ink/15 p-5" aria-label={title}>
    {seen && <button type="button" className="text-sm underline" aria-expanded={open}
      onClick={() => setOpen(value => !value)}>
      {open ? (language === "en" ? "Hide introduction" : "Itago ang panimula") :
        (language === "en" ? "Review introduction" : "Balikan ang panimula")}
    </button>}
    {open && <div className="mt-2">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <NotesMarkdown markdown={language === "en" ? intro.body_en : intro.body_fil} />
    </div>}
  </section>;
}
