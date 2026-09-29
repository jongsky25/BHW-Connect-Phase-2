// Delete page comments and their private screenshots after 24 months.
// Requires a service-role key. DRY_RUN=true only counts candidates.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const dryRun = process.env.DRY_RUN !== 'false';
const cutoff = new Date();
cutoff.setUTCMonth(cutoff.getUTCMonth() - 24);
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let scanned = 0;
let removed = 0;
let offset = 0;

for (;;) {
  const query = supabase.from('spot_feedback')
    .select('id, screenshot_path')
    .lt('created_at', cutoff.toISOString())
    .order('created_at', { ascending: true })
    .range(dryRun ? offset : 0, (dryRun ? offset : 0) + 99);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) break;
  scanned += rows.length;
  if (dryRun) {
    offset += rows.length;
    continue;
  }
  const paths = rows.map((row) => row.screenshot_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('spot-feedback').remove(paths);
    if (storageError) throw storageError;
  }
  const { error: deleteError } = await supabase.from('spot_feedback')
    .delete().in('id', rows.map((row) => row.id));
  if (deleteError) throw deleteError;
  removed += rows.length;
}

console.log(JSON.stringify({ cutoff: cutoff.toISOString(), dry_run: dryRun, candidates: scanned, removed }));
