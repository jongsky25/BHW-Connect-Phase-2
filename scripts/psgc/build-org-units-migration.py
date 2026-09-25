#!/usr/bin/env python3
"""Build the PSGC org_units seed migration from the BHW Connect Dashboard's geography.

The org hierarchy (national -> regional -> provincial -> city_municipal -> barangay) is
loaded from the Philippine Standard Geographic Code (PSGC), on the same vintage the
BHW Connect Dashboard's `dim_geo` is fixed on ("2023 series, >=2024 release, includes
NIR"). Using the dashboard's codes verbatim is deliberate: when legitimate BHW records
from BHW Connect are later matched to accounts here, the barangay join is on identical
10-digit PSGC codes with no crosswalk.

Sources (all inside a checkout of jongsky25/BHW-Connect-Dashboard):
  * ingestion/data/dataset.parquet — only its REGION/PROVINCE/CITY-MUN/BARANGAY code and
    name columns are read; no personal columns are loaded. This is exactly what the
    dashboard's `build_dim_geo()` (ingestion/ingest.py) builds dim_geo from.
  * supabase/migrations/20260720100000_patch_stepzero_psgc_gap.sql — the 12 citymuns and
    2,682 barangays the dashboard patched into dim_geo from the StepZero headcount.
  * ingestion/data/nhfr_2026_09_cleaned.csv — barangays a licensed DOH facility sits in
    that neither source above carries, added only when their city/municipality is already
    in the tree. Sulu's '09066…' (Region IX) recodes are skipped: dim_geo still files Sulu
    under region 19, and this tree follows dim_geo.

Usage:
  python3 scripts/psgc/build-org-units-migration.py \
    --dashboard ../BHW-Connect-Dashboard \
    --out supabase/migrations/20261002000000_psgc_org_units.sql
"""

import argparse
import re
from pathlib import Path

import pandas as pd

LEVELS = {"region": "regional", "province": "provincial", "citymun": "city_municipal", "barangay": "barangay"}
SMALL_WORDS = {"of", "de", "del", "ng", "sa", "y", "and", "in"}
# Official acronyms that PSGC names carry (mostly in parentheses) and must stay upper case.
ACRONYMS = {"HUC", "NCR", "CAR", "NIR", "BARMM", "SGA", "CALABARZON", "MIMAROPA", "SOCCSKSARGEN", "ICC"}
ROMAN = re.compile(r"^(X{0,3})(IX|IV|V?I{0,3})(-[A-Z])?$")
BATCH = 1000


def pad(value, width):
    return f"{int(value):0{width}d}"


def title_word(word, first):
    if not word:
        return word
    # Keep Roman numerals (Region IV-A, Balut I) and dotted abbreviations (Pob.) readable.
    if (ROMAN.match(word) and any(c.isalpha() for c in word)) or word.upper() in ACRONYMS:
        return word.upper()
    lower = word.lower()
    if not first and lower in SMALL_WORDS:
        return lower
    return "-".join(part[:1].upper() + part[1:] for part in lower.split("-"))


def title_case(name):
    tokens = re.split(r"(\s+|\(|\))", re.sub(r"\s+", " ", name.strip()))
    out, first = [], True
    for token in tokens:
        if not token or token.isspace() or token in "()":
            out.append(token)
            continue
        out.append(title_word(token, first))
        first = False
    return "".join(out)


def display_name(level, name):
    return title_case(name)


def load(dashboard):
    cols = [
        "REGION CODE", "REGION NAME", "PROVINCE CODE", "PROVINCE NAME",
        "CITY/MUN CODE", "CITY/MUN NAME", "BARANGAY CODE", "BARANGAY NAME",
    ]
    df = pd.read_parquet(dashboard / "ingestion/data/dataset.parquet", columns=cols).drop_duplicates()
    rows = {}

    def add(code, level, name, parent):
        rows.setdefault(code, (code, level, name, parent))

    for _, r in df.iterrows():
        region, province = pad(r["REGION CODE"], 2), pad(r["PROVINCE CODE"], 5)
        citymun, barangay = pad(r["CITY/MUN CODE"], 7), pad(r["BARANGAY CODE"], 10)
        add(region, "region", r["REGION NAME"], None)
        add(province, "province", r["PROVINCE NAME"], region)
        add(citymun, "citymun", r["CITY/MUN NAME"], province)
        add(barangay, "barangay", r["BARANGAY NAME"], citymun)

    patch = dashboard / "supabase/migrations/20260720100000_patch_stepzero_psgc_gap.sql"
    pattern = re.compile(r"^\('(\d+)', '(\w+)', '((?:[^']|'')*)', '(\d+)'")
    for line in patch.read_text(encoding="utf-8").splitlines():
        m = pattern.match(line)
        if m:
            add(m.group(1), m.group(2), m.group(3).replace("''", "'"), m.group(4))

    nhfr = pd.read_csv(dashboard / "ingestion/data/nhfr_2026_09_cleaned.csv", dtype=str)
    nhfr = nhfr.dropna(subset=["barangay_code", "citymun_code", "source_barangay_name"])
    for _, r in nhfr.iterrows():
        code, citymun = r["barangay_code"], r["citymun_code"]
        if code.startswith("09066") or code in rows or citymun not in rows:
            continue
        add(code, "barangay", r["source_barangay_name"], citymun)

    # Every parent must resolve inside the tree; drop anything orphaned (reported, not guessed).
    orphans = [c for c, (_, lvl, _, p) in rows.items() if lvl != "region" and p not in rows]
    for code in orphans:
        del rows[code]
    return rows, orphans


def sql_text(value):
    return "null" if value is None else "'" + value.replace("'", "''") + "'"


def render(rows):
    order = ["region", "province", "citymun", "barangay"]
    ordered = sorted(rows.values(), key=lambda r: (order.index(r[1]), r[0]))
    counts = {lvl: sum(1 for r in ordered if r[1] == lvl) for lvl in order}
    out = [
        "-- PSGC org hierarchy. GENERATED by scripts/psgc/build-org-units-migration.py — do not edit",
        "-- by hand; re-run the script against a BHW-Connect-Dashboard checkout instead.",
        "--",
        "-- Loads the Philippine Standard Geographic Code into public.org_units on the BHW Connect",
        "-- Dashboard's dim_geo vintage (2023 series, >=2024 release, includes NIR), so a barangay",
        "-- here and a barangay in BHW Connect share one 10-digit code:",
        f"--   {counts['region']} regions, {counts['province']} provinces, "
        f"{counts['citymun']} cities/municipalities, {counts['barangay']} barangays.",
        "--",
        "-- The existing pilot units keep their UUIDs (every user, course and e2e fixture points at",
        "-- them) and are given their PSGC code and official name. Every other unit gets a UUID",
        "-- derived from its code (md5('psgc:' || code)), so all environments agree on ids.",
        "-- Idempotent: rows already present (by psgc_code) are left alone.",
        "",
        "alter table public.org_units add column if not exists psgc_code text;",
        "",
        "do $$",
        "begin",
        "  if not exists (",
        "    select 1 from pg_constraint where conname = 'org_units_psgc_code_key'",
        "  ) then",
        "    alter table public.org_units add constraint org_units_psgc_code_key unique (psgc_code);",
        "  end if;",
        "end;",
        "$$;",
        "",
        "comment on column public.org_units.psgc_code is",
        "  'Philippine Standard Geographic Code (10-digit barangay, 7-digit city/municipality, 5-digit '",
        "  'province, 2-digit region; national has none). Same vintage as BHW Connect Dashboard dim_geo.';",
        "",
        "create index if not exists org_units_parent_name_idx on public.org_units (parent_id, name);",
        "",
    ]
    pilot = [
        ("00000000-0000-0000-0000-000000000002", "04"),
        ("00000000-0000-0000-0000-000000000003", "04034"),
        ("00000000-0000-0000-0000-000000000004", "0403411"),
        ("00000000-0000-0000-0000-000000000005", "0403411004"),
        ("00000000-0000-0000-0000-000000000006", "0403411001"),
    ]
    out.append("-- Pilot units -> their PSGC identity.")
    for uuid, code in pilot:
        _, level, name, _ = rows[code]
        out.append(
            f"update public.org_units set psgc_code = '{code}', name = {sql_text(display_name(level, name))}"
            f" where id = '{uuid}' and psgc_code is null;"
        )
    out += [
        "",
        "create temporary table psgc_seed (",
        "  code text primary key,",
        "  level text not null,",
        "  name text not null,",
        "  parent_code text",
        ") on commit drop;",
        "",
    ]
    for i in range(0, len(ordered), BATCH):
        chunk = ordered[i : i + BATCH]
        out.append("insert into psgc_seed (code, level, name, parent_code) values")
        values = [
            f"({sql_text(c)},'{lvl}',{sql_text(display_name(lvl, n))},{sql_text(p)})"
            for c, lvl, n, p in chunk
        ]
        out.append(",\n".join(values) + ";")
        out.append("")

    out += [
        "-- Regions hang off the national root (Department of Health).",
        "insert into public.org_units (id, name, level, parent_id, path, psgc_code)",
        "select md5('psgc:' || s.code)::uuid, s.name, 'regional', root.id, '', s.code",
        "  from psgc_seed s",
        "  cross join lateral (",
        "    select id from public.org_units where level = 'national'",
        "    order by (id = '00000000-0000-0000-0000-000000000001') desc, created_at limit 1",
        "  ) root",
        " where s.level = 'region'",
        " order by s.code",
        "on conflict (psgc_code) do nothing;",
        "",
    ]
    for level in ("province", "citymun", "barangay"):
        out += [
            "insert into public.org_units (id, name, level, parent_id, path, psgc_code)",
            f"select md5('psgc:' || s.code)::uuid, s.name, '{LEVELS[level]}', p.id, '', s.code",
            "  from psgc_seed s",
            "  join public.org_units p on p.psgc_code = s.parent_code",
            f" where s.level = '{level}'",
            " order by s.code",
            "on conflict (psgc_code) do nothing;",
            "",
        ]
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dashboard", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()
    rows, orphans = load(args.dashboard)
    args.out.write_text(render(rows) + "\n", encoding="utf-8")
    levels = {}
    for _, lvl, _, _ in rows.values():
        levels[lvl] = levels.get(lvl, 0) + 1
    print(f"wrote {args.out}: {levels}; dropped {len(orphans)} orphaned codes {orphans[:10]}")


if __name__ == "__main__":
    main()
