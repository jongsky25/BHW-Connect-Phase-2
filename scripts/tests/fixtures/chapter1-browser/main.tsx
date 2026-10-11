import React from "react";
import { createRoot } from "react-dom/client";
import { Chapter1Assessment } from "../../../../src/components/elearning/chapter1-assessment";
import { Chapter1MajorIntroduction } from "../../../../src/components/elearning/chapter1-major-introduction";
import { createClient } from "./client";

const root = createRoot(document.getElementById("app")!);
const intro = { id: "chapter1-major-1-introduction", major_lesson: 1,
  body_en: "Read this introduction before the lesson.", body_fil: "Basahin ang panimula bago ang aralin." };
const orientation = { expectations: { en: "Before we begin", fil: "Bago magsimula" },
  overview: { en: "Chapter overview", fil: "Buod ng kabanata" },
  recap: { en: "Chapter recap", fil: "Buod sa pagtatapos" } };

async function render() {
  if (window.location.hash === "#intro") {
    root.render(<Chapter1MajorIntroduction intro={intro} courseId="course" learnerId="learner" language="en" />);
    return;
  }
  const { data } = await createClient().rpc("rpc_learner_assessment_state", {});
  root.render(<Chapter1Assessment courseId="course" chapterHref="#intro" locale="en" sessionId={null}
    completed initialState={data as React.ComponentProps<typeof Chapter1Assessment>["initialState"]}
    orientation={orientation} contentApproved />);
}
void render();
