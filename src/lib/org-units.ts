import type { SupabaseClient } from "@supabase/supabase-js";

// The org hierarchy is the PSGC tree (20261002000000_psgc_org_units.sql):
// national -> region -> province -> city/municipality -> barangay. It is far
// too large (~44k units) to load whole, so screens load one unit's children
// at a time (OrgUnitPicker) and only the chain they need to display.

export type OrgLevel = "national" | "regional" | "provincial" | "city_municipal" | "barangay";

export type OrgUnitNode = {
  id: string;
  name: string;
  level: OrgLevel;
};

export const ORG_LEVELS: OrgLevel[] = ["national", "regional", "provincial", "city_municipal", "barangay"];

export function levelIndex(level: OrgLevel): number {
  return ORG_LEVELS.indexOf(level);
}

export function childLevel(level: OrgLevel): OrgLevel | null {
  return ORG_LEVELS[levelIndex(level) + 1] ?? null;
}

// Mirrors public.org_level_allowed_for_role (20261002000100): assessors hold a
// region / province / city-municipality catchment; a BHW belongs to a barangay
// (or is provisioned at their city/municipality and picks the barangay on
// first sign-in).
export const ROLE_LEVELS: Record<"bhw" | "assessor" | "admin" | "designer", OrgLevel[]> = {
  bhw: ["city_municipal", "barangay"],
  assessor: ["regional", "provincial", "city_municipal"],
  admin: ORG_LEVELS,
  designer: ORG_LEVELS,
};

// org_units.path is "<root id>.<child id>.….<self id>." — the unit's ancestors
// (itself included), outermost first.
export function pathIds(path: string): string[] {
  return path.split(".").filter(Boolean);
}

/**
 * The units from `rootId` (exclusive) down to `selectedId` (inclusive), as the
 * picker's initial selection. Empty when nothing below the root is selected or
 * the selection is outside the root.
 */
export async function loadOrgChain(
  supabase: SupabaseClient,
  rootId: string,
  selectedId: string | null | undefined,
): Promise<OrgUnitNode[]> {
  if (!selectedId || selectedId === rootId) return [];
  const { data: selected } = await supabase
    .from("org_units")
    .select("id, name, level, path")
    .eq("id", selectedId)
    .maybeSingle<OrgUnitNode & { path: string }>();
  if (!selected) return [];
  const ids = pathIds(selected.path);
  const below = ids.slice(ids.indexOf(rootId) + 1);
  if (!ids.includes(rootId) || below.length === 0) return [];
  const { data } = await supabase
    .from("org_units")
    .select("id, name, level")
    .in("id", below)
    .returns<OrgUnitNode[]>();
  const byId = new Map((data ?? []).map((unit) => [unit.id, unit]));
  return below.map((id) => byId.get(id)).filter((unit): unit is OrgUnitNode => Boolean(unit));
}

/** The actor's own org unit — the root every picker on their screens starts from. */
export async function loadOrgUnit(supabase: SupabaseClient, id: string): Promise<OrgUnitNode | null> {
  const { data } = await supabase
    .from("org_units")
    .select("id, name, level")
    .eq("id", id)
    .maybeSingle<OrgUnitNode>();
  return data ?? null;
}
