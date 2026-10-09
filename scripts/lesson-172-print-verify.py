"""Check A4 pagination and bounds, and export the actual last-page task aid."""
import hashlib
import json
from pathlib import Path
import fitz
out = Path('.preview/lesson172-deliverables')
records = []
for language in ['fil', 'en']:
    file = out / f'lesson-172-print-kit.{language}.pdf'
    document = fitz.open(file)
    assert len(document) == 4, 'Four separate usable kit pages required'
    pages = []
    for page in document:
        assert abs(page.rect.width - 595.28) < 1 and abs(page.rect.height - 841.89) < 1
        blocks = [b for b in page.get_text('blocks') if b[4].strip()]
        assert all(b[0] >= 40 and b[1] >= 40 and b[2] <= page.rect.width - 40 and b[3] <= page.rect.height - 40 for b in blocks)
        fonts = [s['size'] for b in page.get_text('dict')['blocks'] if 'lines' in b for line in b['lines'] for s in line['spans']]
        pages.append({'words': len(page.get_text().split()), 'minimum_font_size': min(fonts)})
    aid_path = out / f'lesson-172-one-page-aid.{language}.pdf'
    aid = fitz.open()
    aid.insert_pdf(document, from_page=3, to_page=3)
    if aid_path.exists():
        aid_path.unlink()
    aid.save(aid_path)
    records.append({'language': language, 'pages': 4, 'A4': True, 'inside_margins': True, 'pages_details': pages, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'one_page_aid_pages': 1})
(out / 'lesson-172-print-verification.json').write_text(json.dumps({'status': 'passed', 'records': records}, indent=2) + '\n')
print('Verified two four-page A4 kits and two actual one-page aids.')
