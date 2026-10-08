"""Canonical primary passages: compare content while retaining fresh raw-byte hashes."""
import re,hashlib,json
from html.parser import HTMLParser
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,data):self.parts.append(data)
def plain(html):
 p=Text();p.feed(html);return ' '.join(' '.join(p.parts).split())
def passages(name,html):
 if name=='privacy-irr.html':
  start=re.search(r'<span[^>]+id="18"[^>]*>',html);end=re.search(r'<span[^>]+id="21"[^>]*>',html)
  assert start and end and end.start()>start.start()
  text=plain(html[start.start():end.start()]);assert all(p in text for p in ['Section 18.','Transparency','Legitimate','Proportionality','Section 19.','Section 20.']);return text
 if name=='tesda-filter.html':
  rows=[]
  for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',html,re.S|re.I):
   if 'Barangay Health Services NC II' not in row:continue
   title=re.search(r'<td[^>]*>(.*?)</td>',row,re.S|re.I);download=re.search(r'data-id\s*=\s*"(\d+)"',row)
   assert title and download;rows.append({'title':plain(title.group(1)),'download_id':int(download.group(1))})
  assert rows==[{'title':'Barangay Health Services NC II','download_id':1886},{'title':'Barangay Health Services NC II (Superseded)','download_id':1887}];return json.dumps(rows,ensure_ascii=False,separators=(',',':'))
 raise ValueError(name)
def digest(text):return hashlib.sha256(text.encode()).hexdigest()
