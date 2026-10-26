/** Explains formative completion; browsing is deliberately separate from saving. */
export function LessonCompletionGuide({locale}:{locale:string}) {
  const en=locale==='en';
  return <details className="rounded-xl border border-ink/20 bg-canvas p-4">
    <summary className="min-h-11 cursor-pointer content-center font-semibold">{en?'How to finish and save this lesson':'Paano tapusin at i-save ang araling ito'}</summary>
    <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
      <li>{en?'Use Read or Slides to work through the lesson. Answer every practice check in the view you choose, then reach its final section. Read and Slides keep separate practice answers.':'Gamitin ang Basahin o Slides sa pag-aaral. Sagutin ang bawat tanong sa pinili mong view, saka pumunta sa huling bahagi nito. Hiwalay ang mga sagot sa Basahin at Slides.'}</li>
      <li>{en?'Read the feedback after each answer and try again when needed. Your first answer does not have to be correct. After reloading the page, unfinished practice checks need fresh answers.':'Basahin ang feedback pagkatapos sumagot at subukang muli kung kailangan. Hindi kailangang tama ang unang sagot. Kapag ni-reload ang pahina, sagutin muli ang mga tanong sa hindi pa tapos na aralin.'}</li>
      <li>{en?'Select Mark lesson complete when it becomes available. Wait for Completed and the saved-progress message before using Next lesson or returning to the lesson list. If saving fails, check your connection and retry.':'Piliin ang Markahang tapos ang aralin kapag maaari na. Hintayin ang Natapos at ang mensaheng na-save ang progreso bago pumunta sa Susunod na aralin o bumalik sa listahan. Kung hindi ma-save, suriin ang koneksiyon at subukang muli.'}</li>
    </ol>
    <p className="mt-3 text-sm leading-relaxed">{en?'You can browse ahead or revisit sections and lessons. Opening a topic or finishing audio or video does not mark it complete. Practice checks support learning; they are separate from the chapter assessment.':'Maaari kang tumingin sa susunod o bumalik sa mga bahagi at aralin. Hindi namamarkahang tapos ang paksa sa pagbukas nito o pagtatapos ng audio o video. Tulong sa pag-aaral ang mga tanong; hiwalay ang mga ito sa pagsusulit ng kabanata.'}</p>
  </details>;
}
