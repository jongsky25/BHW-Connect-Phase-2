"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { childLevel, levelIndex, type OrgLevel, type OrgUnitNode } from "@/lib/org-units";

const selectClass =
  "rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60";

type Props = {
  /** The widest unit the actor may pick (their own org unit). */
  root: OrgUnitNode;
  /** Units below the root that start selected, outermost first (see loadOrgChain). */
  initialChain?: OrgUnitNode[];
  /** Deepest level offered, e.g. "city_municipal" for an assessor catchment. */
  maxLevel?: OrgLevel;
  /** Whether the root itself is an acceptable answer ("All of …"). */
  allowRoot?: boolean;
  /** Emits the deepest selected unit (the root when nothing below it is chosen). */
  onChange?: (unit: OrgUnitNode) => void;
  /** Renders a hidden input so the picker works inside a plain GET/POST form. */
  name?: string;
  disabled?: boolean;
};

const LEVEL_KEY: Record<OrgLevel, string> = {
  national: "levelNational",
  regional: "levelRegional",
  provincial: "levelProvincial",
  city_municipal: "levelCityMunicipal",
  barangay: "levelBarangay",
};

// Children are cached per parent for the life of the page: the PSGC tree
// doesn't change while an admin is filling in a form.
const childCache = new Map<string, Promise<OrgUnitNode[]>>();

function loadChildren(parentId: string): Promise<OrgUnitNode[]> {
  let pending = childCache.get(parentId);
  if (!pending) {
    pending = Promise.resolve(
      createClient()
        .from("org_units")
        .select("id, name, level")
        .eq("parent_id", parentId)
        .order("name")
        .returns<OrgUnitNode[]>(),
    ).then(({ data, error }) => {
      if (error) {
        childCache.delete(parentId);
        throw error;
      }
      return data ?? [];
    });
    childCache.set(parentId, pending);
  }
  return pending;
}

/**
 * Cascading PSGC picker: region → province → city/municipality → barangay,
 * starting below `root` and loading each level's options only when its parent
 * is chosen.
 */
export function OrgUnitPicker({
  root,
  initialChain = [],
  maxLevel = "barangay",
  allowRoot = true,
  onChange,
  name,
  disabled,
}: Props) {
  const t = useTranslations("orgPicker");
  const baseId = useId();
  const [chain, setChain] = useState<OrgUnitNode[]>(initialChain);
  const [options, setOptions] = useState<Record<string, OrgUnitNode[]>>({});
  const [failed, setFailed] = useState(false);

  // One select per level from the root's child level down to maxLevel, shown
  // once the level above it has a selection.
  const parents = [root, ...chain].filter(
    (unit) => childLevel(unit.level) && levelIndex(childLevel(unit.level)!) <= levelIndex(maxLevel),
  );
  const parentKey = parents.map((unit) => unit.id).join(",");

  useEffect(() => {
    let cancelled = false;
    for (const parent of parents) {
      if (options[parent.id]) continue;
      loadChildren(parent.id)
        .then((children) => {
          if (!cancelled) setOptions((current) => ({ ...current, [parent.id]: children }));
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    }
    return () => {
      cancelled = true;
    };
    // parentKey captures the parents list; options is read only to skip work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentKey]);

  const selected = chain[chain.length - 1] ?? root;

  function choose(depth: number, id: string) {
    const parent = depth === 0 ? root : chain[depth - 1];
    const next = chain.slice(0, depth);
    const unit = options[parent.id]?.find((child) => child.id === id);
    if (unit) next.push(unit);
    setChain(next);
    onChange?.(next[next.length - 1] ?? root);
  }

  return (
    <div className="flex flex-col gap-2">
      {name ? <input type="hidden" name={name} value={selected.id === root.id && !allowRoot ? "" : selected.id} /> : null}
      <p className="text-xs text-ink/60">{t("within", { name: root.name })}</p>
      {parents.map((parent, depth) => {
        const level = childLevel(parent.level)!;
        const list = options[parent.id];
        const id = `${baseId}-${depth}`;
        const stopLabel = depth === 0 && !allowRoot ? t("choose") : t("allOf", { name: parent.name });
        return (
          <div key={parent.id} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-xs font-medium text-ink/80">
              {t(LEVEL_KEY[level])}
            </label>
            <select
              id={id}
              value={chain[depth]?.id ?? ""}
              onChange={(event) => choose(depth, event.target.value)}
              disabled={disabled || !list}
              className={selectClass}
            >
              <option value="">{list ? stopLabel : t("loading")}</option>
              {list?.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("loadError")}
        </p>
      ) : null}
    </div>
  );
}
