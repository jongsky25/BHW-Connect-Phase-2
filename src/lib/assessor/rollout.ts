import type {FeatureFlags} from '@/lib/flags/types';
import {assessorPermission, type ActionScope, type FlowContext, type FlowIdentity, type FlowRequirements, type OfficialAction} from './flow';

export type CohortPolicy = FlowIdentity & {
  cohortId: string; actorId: string;
  uiEnabled: boolean; writesEnabled: boolean; awardsEnabled: boolean;
  // Stored independently, never derived from a display switch or client state.
  authorityCutoverAt: string | null;
};
export type RolloutDecision = {
  uiVisible: boolean; writesEnabled: boolean; awardsEnabled: boolean;
  legacyWritesAllowed: boolean; reasons: string[];
};

/** Shared server/client projection. Null means unknown, not pre-cutover.
 * Only a successful authenticated policy RPC may establish legacy eligibility.
 * Presentation receives this summary; database writes independently recheck it.
 */
export function assessorRollout(flags: FeatureFlags, identity: FlowIdentity, context: Pick<FlowContext, 'actor'>,
  policy: CohortPolicy | null): RolloutDecision {
  const reasons: string[] = [];
  const actor = context.actor;
  if (!actor.id) reasons.push('signed_out');
  if (!actor.active) reasons.push('actor_inactive');
  if (actor.role !== 'assessor') reasons.push('role_ineligible');
  if (actor.preview) reasons.push('preview_read_only');
  if (!policy) reasons.push('rollout_policy_unavailable');
  else if (!policy.cohortId || policy.actorId !== actor.id || !identity.programInstanceId
    || policy.programInstanceId !== identity.programInstanceId || policy.programKey !== identity.programKey
    || policy.chapterKey !== identity.chapterKey || policy.requirementsVersion !== identity.requirementsVersion) reasons.push('rollout_identity_mismatch');
  if (policy && policy.authorityCutoverAt !== null && !Number.isFinite(Date.parse(policy.authorityCutoverAt))) reasons.push('rollout_policy_invalid');
  const eligible = reasons.length === 0;
  const cutover = !!policy?.authorityCutoverAt;
  return {
    uiVisible: eligible && flags.elearning && flags.assessor_flow_ui && policy!.uiEnabled,
    writesEnabled: eligible && flags.elearning && flags.assessor_flow_writes && policy!.writesEnabled && cutover,
    awardsEnabled: eligible && flags.elearning && flags.assessor_flow_awards && policy!.awardsEnabled && cutover,
    legacyWritesAllowed: eligible && !cutover,
    reasons,
  };
}

export function revisedAssessorPermission(action: OfficialAction, requirements: FlowRequirements, context: FlowContext,
  scope: ActionScope, rollout: RolloutDecision) {
  const permission = assessorPermission(action, requirements, context, scope);
  const reasons = [...permission.reasons, ...rollout.reasons];
  const personal = action === 'private_plan' || action === 'candidate_progress';
  if (personal && !rollout.uiVisible) reasons.push('revised_ui_disabled');
  if (action === 'issue_staff_award' && !rollout.awardsEnabled) reasons.push('revised_awards_disabled');
  if (!personal && action !== 'issue_staff_award' && !rollout.writesEnabled) reasons.push('revised_writes_disabled');
  return {allowed: reasons.length === 0, reasons: [...new Set(reasons)],
    nextAction: reasons.some(reason => reason.endsWith('_disabled')) ? 'review_rollout' : permission.nextAction};
}
