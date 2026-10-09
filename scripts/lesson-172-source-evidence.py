"""Verify and retain only the inspected original source pages for private review."""
import hashlib
import json
import subprocess
from pathlib import Path
import fitz
out = Path('.preview/lesson172-source')
out.mkdir(parents=True, exist_ok=True)
audit = json.loads(Path('docs/lesson-172-source-audit.json').read_text())
for source in audit['sources']:
    file = out / (source['name'] + '.pdf')
    if not file.exists():
        subprocess.run(['curl', '-fsSL', '--max-time', '90', source['url'], '-o', str(file)], check=True)
    assert hashlib.sha256(file.read_bytes()).hexdigest() == source['sha256'], file
    document = fitz.open(file)
    for excerpt in source['excerpts']:
        page = document[excerpt['pdf_page'] - 1]
        target = Path(excerpt['text_path'])
        target.write_text(page.get_text())
        assert hashlib.sha256(target.read_bytes()).hexdigest() == excerpt['sha256'], target
        page.get_pixmap(dpi=90).save(str(target.with_suffix('.png')))
for image in audit['visual_inspections']:
    assert hashlib.sha256(Path(image['path']).read_bytes()).hexdigest() == image['sha256']
print('Verified inspected original PDF bytes, excerpts and diagram/table images. Private review only.')
