type Item = { item_id: string; slot: string; stem: { en: string; fil: string };
  options: { id: string; label: { en: string; fil: string } }[]; lesson_keys: string[] };
type Response = { item_id: string; kind: string; option_id: string | null; marked: boolean };
type Attempt = { attempt_id: string; phase: "pretest" | "posttest"; state: "draft" | "submitted";
  revision: number; position: number; language: "en" | "fil"; items: Item[]; responses: Response[];
  score_percent: number | null; legacy_attempt_id: string | null };
type Store = { attempts: Attempt[]; final_attempts: { id: string; phase: string; score_percent: number }[] };
const key = "chapter1-browser-fixture";
const items: Item[] = Array.from({ length: 30 }, (_, i) => ({
  item_id: `item-${i + 1}`, slot: `T${String(i + 1).padStart(2, "0")}`,
  stem: { en: `Question ${i + 1}`, fil: `Tanong ${i + 1}` }, lesson_keys: ["bhw-roles-hepo"],
  options: ["a", "b", "c"].map(id => ({ id, label: { en: `Option ${id}`, fil: `Pagpipilian ${id}` } })),
}));
const read = (): Store => JSON.parse(window.localStorage.getItem(key) ?? '{"attempts":[],"final_attempts":[]}');
const write = (store: Store) => window.localStorage.setItem(key, JSON.stringify(store));
const summary = (attempt: Attempt) => ({ attempt_id: attempt.attempt_id, phase: attempt.phase,
  state: attempt.state, score_percent: attempt.score_percent, legacy_attempt_id: attempt.legacy_attempt_id });

export function createClient() {
  return { rpc: async (name: string, args: Record<string, unknown>) => {
    const store = read();
    const id = args.p_attempt_id as string;
    const attempt = store.attempts.find(row => row.attempt_id === id);
    let data: unknown;
    if (name === "rpc_chapter_intro_open") {
      const introKey = `server-intro:${args.p_course_id}:${args.p_intro_id}`;
      data = window.sessionStorage.getItem(introKey) !== "seen";
      window.sessionStorage.setItem(introKey, "seen");
    } else if (name === "rpc_learner_assessment_state") data = {
      attempts: store.attempts.map(summary), final_attempts: store.final_attempts,
    };
    else if (name === "rpc_learner_assessment_start") {
      const phase = args.p_phase as "pretest" | "posttest";
      const existing = store.attempts.find(row => row.phase === phase);
      data = existing ?? { attempt_id: `attempt-${phase}`, phase, state: "draft", revision: 0, position: 0,
        language: "en", items, responses: [], score_percent: null, legacy_attempt_id: null } satisfies Attempt;
      if (!existing) { store.attempts.push(data as Attempt); write(store); }
    } else if (name === "rpc_learner_assessment_get") data = attempt;
    else if (name === "rpc_learner_assessment_save" && attempt) {
      if (attempt.revision !== args.p_expected_revision) return { data: null, error: new Error("stale revision") };
      for (const change of args.p_changes as Response[]) {
        attempt.responses = [...attempt.responses.filter(row => row.item_id !== change.item_id), change];
      }
      attempt.revision++; attempt.position = args.p_position as number;
      attempt.language = args.p_language as "en" | "fil";
      write(store); data = attempt;
    } else if (name === "rpc_learner_assessment_submit" && attempt) {
      if (attempt.responses.length !== 30) return { data: null, error: new Error("missing responses") };
      attempt.state = "submitted"; attempt.score_percent = 80;
      attempt.legacy_attempt_id = `final-${attempt.phase}`;
      store.final_attempts.push({ id: attempt.legacy_attempt_id, phase: attempt.phase, score_percent: 80 });
      write(store); data = { legacy_attempt_id: attempt.legacy_attempt_id, score_percent: 80 };
    } else return { data: null, error: new Error(`unhandled RPC ${name}`) };
    return { data, error: null };
  } };
}
