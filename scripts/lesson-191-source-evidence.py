"""Recreate the exact checked excerpts; downloaded originals are private evidence."""
import pathlib,json,hashlib,subprocess,shutil,fitz
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'.preview/lesson191-source';out.mkdir(parents=True,exist_ok=True)
report=json.loads((root/'docs/lesson-191-source-audit.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for source in report['sources']:
    if not source.get('retrieved'):continue
    if source['id']=='who-facilities':
        for key,expected in [('retained_original_html','sha256'),('retained_inspected_text','text_sha256')]:
            p=root/source[key];assert sha(p)==source[expected];shutil.copyfile(p,out/p.name)
        continue
    name=source['id'];p=out/(name+'.pdf')
    if not p.exists():subprocess.run(['curl','-fLsS','--max-time','55',source['url'],'-o',str(p)],check=True)
    assert sha(p)==source['sha256'],name+' source changed; requires fresh inspection'
    doc=fitz.open(p)
    for excerpt in source.get('excerpts',[]):
        page=doc[excerpt['pdf_page']-1];text=out/excerpt['text'];text.write_text(page.get_text())
        assert sha(text)==excerpt['text_sha256'],name+' excerpt changed'
        if 'image' in excerpt:page.get_pixmap(dpi=100).save(str(out/excerpt['image']))
    if name=='nwpc-7s':
        text=out/'nwpc-7s.txt';text.write_text(doc[0].get_text());assert sha(text)==source['text_sha256'];doc[0].get_pixmap(dpi=110).save(str(out/'nwpc-7s.png'))
print('Restored hash-pinned original excerpts; unresolved circular and local review remain explicit.')
