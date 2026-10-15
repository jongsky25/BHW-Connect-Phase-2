import type {FlowIdentity} from './flow';

// Preparation UI identity only; this draft grants no chapter authority.
export const CHAPTER1_BRIEFING_VERSION = 'chapter-1:briefing.v1';
export const CHAPTER1_REQUIREMENTS_VERSION = 'chapter-1:c1af.draft-1';
export const CHAPTER1_PILOT_REQUIREMENTS_VERSION = 'chapter-1:c1af25.pilot-1';
export const isChapter1RequirementsVersion = (value: unknown): value is string =>
  value === CHAPTER1_REQUIREMENTS_VERSION || value === CHAPTER1_PILOT_REQUIREMENTS_VERSION;
export function chapter1BriefingIdentity(programId: string): FlowIdentity {
  return {programInstanceId: programId, programKey: 'bhw-reference-manual',
    chapterKey: 'chapter-1', requirementsVersion: CHAPTER1_REQUIREMENTS_VERSION};
}

export type BriefingState = {actorId: string; programInstanceId: string; chapterKey: 'chapter-1';
  requirementsVersion: string; briefingVersion: string; acknowledgedAt: string | null};
export function parseBriefingState(data: unknown, programId: string, actorId: string): BriefingState | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (value.actorId !== actorId || value.programInstanceId !== programId || value.chapterKey !== 'chapter-1'
    || !isChapter1RequirementsVersion(value.requirementsVersion) || value.briefingVersion !== CHAPTER1_BRIEFING_VERSION
    || !(value.acknowledgedAt === null || (typeof value.acknowledgedAt === 'string' && Number.isFinite(Date.parse(value.acknowledgedAt))))) return null;
  return value as BriefingState;
}
