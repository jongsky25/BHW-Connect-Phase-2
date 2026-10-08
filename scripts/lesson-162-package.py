"""Freeze an exact-head, self-contained offline review without duplicating raw evidence."""
import pathlib,json,hashlib,zipfile,base64,subprocess
r=pathlib.Path('.');out=r/'.preview/lesson162-deliverables';html=out/'lesson-1.6.2-gibs-review.html'
sha=lambda b:hashlib.sha256(b).hexdigest();head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
v=json.loads((out/'lesson-1.6.2-verification.json').read_text());assert v['status']=='passed' and v['source_commit']==head and v['normal_CI']['head_sha']==head
media=json.loads((out/'lesson-162-inline-media.json').read_text());text=html.read_text()
for p,rec in media.items():
 b=(r/'public'/p.lstrip('/')).read_bytes();assert sha(b)==rec['sha256'] and len(b)==rec['bytes'] and base64.b64encode(b).decode() in text,p
readme=out/'README.txt'
readme.write_text("Lesson 1.6.2 — Gibs draft review\n\nOpen lesson-1.6.2-gibs-review.html in a recent Chromium browser. All lesson images, Read audio, stories, posters and captions are embedded. Select Filipino/English and Read/Slides. The guide, indicator and evidence panels are available in the same file. Saves and completion use explicit local fixtures; this is not an authenticated production session.\n\nreview/ contains the five-page practice PDF for each language, print sources, screenshots and technical receipts. content/ contains both private facilitator guides and the bilingual observation indicator. docs/ contains source, scene, narration and model-review provenance; evidence/source/ contains inspected source-page images and primary passages.\n\nHuman listening, owner art/package review and local-policy/SME signoff remain pending. Model observations can disagree and do not grant approval. Raw requests/responses and earlier attempts are separately retained in the hash-pinned Actions evidence archives identified in docs/lesson-162-evidence-origins.json and the PR's artifact links. review/lesson-162-raw-evidence-verification.json matches all 70 selected judgments to their exact raw audio request/response bytes.\n")
paths={html,readme}
patterns=['docs/lesson-162-*','scripts/lesson-162-*','scripts/tests/lesson-162*','scripts/remotion-communication-clarify-narrate.mjs','scripts/lib/communication-clarify-voice.mjs','content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/*','remotion/src/communication-clarify/*','remotion/public/communication-clarify/*','.preview/lesson162-source/*-p*','.preview/lesson162-source/privacy-irr.html','.preview/lesson162-source/tesda-filter.html','.preview/lesson162-source/primary-fetch-receipt.json','.preview/lesson162-deliverables/*.json','.preview/lesson162-deliverables/*.png','.preview/lesson162-deliverables/*.pdf','.preview/lesson162-deliverables/lesson-162-print-kit.*.html']
for pattern in patterns:paths.update(p for p in r.glob(pattern) if p.is_file())
paths.update(r/'public'/p.lstrip('/') for p in media)
paths.update(r/p for p in ['content/training/day1-basic-competencies/narration.json','content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx'])
# Published authenticated snapshot is separately retained, not presented as offline auth.
paths.discard(out/'lesson-162-package-integrity.json')
report={'status':'passed','source_commit':head,'inline_media_exact_matches':len(media),'human_review':'pending','files':[]};target=out/'lesson-1.6.2-gibs-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(paths):
  source=p.as_posix()
  name='lesson-1.6.2-gibs-review.html' if p==html else 'README.txt' if p==readme else 'review/'+p.name if p.parent==out else 'evidence/source/'+p.name if p.parent==r/'.preview/lesson162-source' else source
  assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  b=p.read_bytes();z.writestr(name,b);report['files'].append({'member':name,'source_path':source,'bytes':len(b),'sha256':sha(b)})
with zipfile.ZipFile(target) as z:
 assert len(z.namelist())==len(set(z.namelist())) and z.testzip() is None
 for f in report['files']:assert sha(z.read(f['member']))==f['sha256'] and len(z.read(f['member']))==f['bytes']
assert target.stat().st_size<512*1024*1024
report.update(zip_bytes=target.stat().st_size,zip_sha256=sha(target.read_bytes()),safe_unique_members=True,CRC_checks=True,source_byte_matches=True)
(out/'lesson-162-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified ZIP:',len(paths),'members;',len(media),'inline media matches')
