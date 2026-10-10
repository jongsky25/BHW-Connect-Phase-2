"""Re-fetch pinned primary PDFs and verify the retained inspected excerpts.
Never overwrite the checked audit or infer facility approval from retrieval.
"""
import pathlib, hashlib, json, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
out = root / '.preview/lesson192-source'
out.mkdir(parents=True, exist_ok=True)
report = json.loads((root / 'docs/lesson-192-source-audit.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for source in report['sources']:
 if source.get('excerpt_file'):
  assert sha(root / 'docs/lesson-192-source-excerpts' / source['excerpt_file']) == source['excerpt_sha256'], 'Inspected excerpt changed: ' + source['id']
 if source['id'] not in ['facilitator', 'manual', 'tesda', 'deck', 'nwpc-7s']:
  continue
 p = out / (source['id'] + '.pdf')
 if not p.exists():
  subprocess.run(['curl', '-fLsS', '--retry', '2', '--max-time', '90', source['url'], '-o', str(p)], check=True)
 assert sha(p) == source['sha256'], 'Primary source bytes changed: ' + source['id']
 for e in source.get('excerpts', []):
  for kind in ['text', 'image']:
   retained = root / 'docs/lesson-192-source-excerpts' / e[kind + '_file']
   assert sha(retained) == e[kind + '_sha256'], 'Inspected excerpt changed: ' + retained.name
print('Five pinned primary PDFs and inspected excerpt hashes verified; original audit retained.')
