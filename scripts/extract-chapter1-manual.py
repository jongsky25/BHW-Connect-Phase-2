# Reproduce the reviewed Chapter 1 passages from the pinned original PDF.
# Run from repository root: python scripts/extract-chapter1-manual.py /path/to/manual.pdf
# Requires PyMuPDF. No network, database access, or lesson publication.
import fitz,json,re,hashlib,pathlib,sys
source=pathlib.Path(sys.argv[1])
assert hashlib.sha256(source.read_bytes()).hexdigest() == 'e79248b6be4c6a5f871cb338f54fd867210d599302075d9650bc5aa04ba82296', 'Manual source differs; review before extracting'
pdf=fitz.open(source)
blocks={n:pdf[n-1].get_text('blocks',sort=True) for n in range(11,24)}
def clean(t):return re.sub(r'\s+',' ',t.replace('ﬁ','fi').replace('ﬂ','fl')).strip()
def b(n,i,kind='paragraph',heading_lines=0):
 t=blocks[n][i][4];lines=t.splitlines()
 if heading_lines:return [{'kind':'heading','text':clean(' '.join(lines[:heading_lines]))},{'kind':'paragraph','text':clean(' '.join(lines[heading_lines:]))}]
 if kind=='list':return [{'kind':'list','ordered':bool(re.match(r'\d+\.',t.strip())),'items':[clean(s) for s in re.split(r'(?m)[●○]|^\d+\.\s*$',t) if clean(s)]}]
 return [{'kind':kind,'text':clean(t)}]
def cat(*args):return sum(args,[])
def group(key,title,pages,body):return {'id':key,'title':title,'pdfPages':pages,'printedPages':[n-8 for n in pages],'blocks':body}
def img(page,rect,key):
 pix=pdf[page-1].get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(rect));data=pix.tobytes('png');h=hashlib.sha256(data).hexdigest();path=f'/training/manual-2022/{key}-{h[:12]}.png';pathlib.Path('public'+path).write_bytes(data);return {'src':path,'sha256':h,'width':pix.width,'height':pix.height,'pdfPage':page}
# Table cells are visually transcribed; retain the original figure for comparison.
def table(caption,headers,rows,page,rect,key):return {'kind':'table','caption':caption,'headers':headers,'rows':rows,'figure':img(page,rect,key)}
communication=table('Open questions / Closed questions',['OPEN QUESTIONS','CLOSED QUESTIONS'],[
 ['“Kumusta ka ngayon?”','“Malungkot ka ba?”'],['“Paano mo ilalarawan ang pagtulog mo?”','“May problema ka ba sa pagtulog?”'],['“Paano nakakaapekto ang sakit mo sa trabaho mo?”','“Nakakapagtrabaho ka pa ba?”']],19,[125,275,465,486],'communication-questions')
whys=table('Halimbawa ng Five Why’s',['LIMANG BAKIT?','POSIBLENG DAHILAN','POSIBLENG DAHILAN'],[
 ['Bakit?','Pagtatae','Nakainom ng maruming tubig'],['Bakit?','Hindi alam ng ina kung paano ang wastong pagpapakulo ng tubig','Hindi naitinuro ng mga BHW sa komunidad kung paano magpakulo ng tubig'],['Bakit?','Pagtatae','Kulang sa training ang mga BHW kung paano maiwasan ang diarrhea sa komunidad.'],['Bakit?','Hindi komunsulta agad sa health center','Walang pera para sa pamasahe'],['Bakit?','Walang permanenteng trabaho ang ama','Hindi nakatapos ng elementary ang Ama']],20,[50,123,548,425],'five-whys')
ranking=table('Mga problema at prayoridad',['MGA PROBLEMA','MAGNITUDE?','SERIOUS?','FEASIBLE?','URGENT?','SCORE','PRIORITY'],[
 ['Hindi alam ng ina kung paano ang wastong pagpapakulo ng tubig','3','3','5','5','16','3'],['Hindi naitinuro ng mga BHW sa komunidad kung paano magpakulo ng tubig.','4','3','5','5','17','2'],['Kulang sa training ang mga BHW','4','5','5','5','19','1'],['Walang pera ang pamilya para sa pamasahe','5','3','3','4','15','4'],['Walang permanenteng trabaho ang ama','5','3','2','2','12','5'],['Hindi nakatapos ng pag-aaral ang ama.','4','3','2','1','10','6']],21,[50,65,548,505],'priority-table')
headers=['MGA PANGANIB SA BHW WORKPLACE','POSIBLENG EPEKTO SA KATAWAN AT KALUSUGAN','PAANO IWASAN']
safety1=table('Mga panganib sa BHW workplace (1)',headers,[
 ['Needlestick injuries / Pagkatusok ng karayom ng heringgilya','Ang mga needles o karayom ng heringgilya na ginamit sa pasyente na may mga nakakahawang sakit tulad ng HIV at hepatitis B ay maaaring makatusok sa mga BHWs na puwedeng maging dahilan ng pagkahawa ng mga ito.','Itapon kaagad ang anumang karayom, syringe, o hiringgilya sa tamang container / safety collector box pagkatapos gamitin.\n\nIwasan ang pagtatapon ng karayom o hiringgilya kasama ang ibang basura. Ihiwalay ang pagtatapon ng mga ito.\n\nI-report kaagad sa midwife o health center staff ang anumang kaso ng needlestick injury.'],
 ['Pagkahawa sa mga sakit ng pasyente','Ang mga BHWs ay maaaring mahawa sa kanilang pakikisalamuha sa pasyente na may infectious diseases tulad ng tuberculosis, COVID-19, at influenza.\n\nAng mga BHWs ay maaari ring makakuha ng vector-borne diseases, gaya ng dengue, malaria, chikungunya, at filariasis sa paggawa ng kanilang mga tungkulin sa komunidad.','Alamin kung paano maaaring makuha ang mga nakakahawang sakit.\n\nSundin ang mga polisiya at hakbang sa pag-iwas sa mga sakit.\n\nTiyakin ang magandang bentilasyon ng BHS at sa mga lugar kung saan nakakasalamuha ang mga kasapi ng komunidad.\n\nTiyakin ang sapat na supply ng PPEs (face masks) at disinfectants (70% alcohol at povidone iodine).\n\nIwasan ang vectors na maaaring magdala ng diseases. Halimbawa, para maiwasan ang kagat ng lamok, maaaring magsuot ng mahahabang damit na natatakpan ang kanilang mga braso at binti.\n\nMaghugas ng kamay bago at pagkatapos hawakan ang isang pasyente.'],
 ['Ngalay at pananakit ng mga kalamnan','Dulot ng matagal na paglalakad, pagtayo, at paggawa ng mga tungkulin bilang BHW.','Iwasan ang matagal na pagtayo o pag-upo.\n\nGumamit ng angkop na upuan na may magandang sandalan para maiwasan ang pananakit ng likod.\n\nGumamit ng komportableng sapatos, footwear, at pananamit tuwing may house visits.\n\nRegular na mag-ehersisyo.']],22,[50,111,548,793],'safety-table-1')
safety2=table('Mga panganib sa BHW workplace (2)',headers,[
 ['Stress sa mahaba at boluntaryong pagtatrabaho','Nangyayari kapag ang ipinapagawa at inaasahan sa trabaho ay sobra sa kapasidad, kakayanan, at inilaang oras ng BHW. Ang stress ay maaaring makaapekto sa kanilang performance.','Magtakda ng boundaries sa pagitan ng personal na buhay at sa buhay bilang BHW. Ang mga BHW, kahit na nakakatanggap ng insentibo at honorarium, ay ikinokonsiderang volunteers at hindi bayad na empleyado.\n\nMas nakakabawas ng stress kung naiintindihan ang dahilan ng bakit kinakailangan pagpaguran at gawin ang mga inaatas na trabaho. Magandang alamin kung para saan at paano makakabuti sa komunidad ang bawat ipinapagawa ng mga gawain.'],
 ['Mga disgrasya at aksidente habang nagtatrabaho','Mga sakit at pinsala (injuries) habang ginagawa ang trabaho bilang BHW. Ilan sa mga halimbawa nito ay:\n\n· Kagat ng aso o ibang hayop\n· Aksidente tulad ng pagkadulas at pagkahulog\n· Sunburn o pagkasunog ng balat sa matagal na pagbibilad sa araw\n· Heat stroke\n· Pisikal na atake ng ibang tao','Tukuyin ang mga karaniwang panganib (hazards) sa komunidad at magsagawa ng mga pagplano kung paano maiwasan ang mga ito.\n\nIpagbigay-alam agad sa kapitan ng barangay at sa health center sa pamamagitan ng midwife kung sakaling nagkaroon ng sakit o aksidente habang ginagawa ang trabaho bilang BHW.\n\nLaging maghanda ng mga impormasyon sa social insurance (SSS/GSIS, Philhealth, private insurance) at contact information ng health facilities na magagamit sa oras na magkaroon ng injuries at sakit.\n\nHumingi ng tulong sa health center staff o kapwa BHWs na maaaring magsagawa ng first aid.\n\nIwasan ang mabilad sa sikat ng araw at manatili sa mga lugar na malilim. Magsuot ng mahabang damit, magpahid ng sunscreen, at gumamit ng payong.\n\nMagbaon at regular na uminom ng tubig.\n\nTiyakin na malinis at organisado ang lugar ng pinagtatrabahuan.']],23,[50,65,548,806],'safety-table-2')
roles=cat(b(11,1),b(11,2),b(11,3,heading_lines=1),b(11,4,heading_lines=1),[{'kind':'paragraph','text':clean(blocks[11][5][4]+blocks[12][0][4])}],b(12,1,heading_lines=1),b(12,2),b(12,3,heading_lines=1),b(12,4))
sections=[
 group('roles','ANG MGA TUNGKULIN NG ISANG BHW',[11,12],roles),
 group('uhc','MGA POLISIYA SA BARANGAY HEALTH STATION — R.A. 11223 o Universal Health Care Act of 2019',[13],cat(b(13,1),b(13,2,heading_lines=2),b(13,3),b(13,4,'list'))),
 group('policies','MGA POLISIYA SA BARANGAY HEALTH STATION — Iba pang polisiya',[13,14],cat(b(13,1),b(13,8,'heading'),b(14,0,'list'),b(14,1,'heading'),b(14,2,'list'),b(14,3,'heading'),b(14,4,'list'),b(14,5,'heading'),b(14,6,'list'),b(14,7,'list'))),
 group('benefits','MGA POLISIYA SA BARANGAY HEALTH STATION — R.A. 7883; BHWE',[13],cat(b(13,1),b(13,5,heading_lines=3),b(13,6,heading_lines=2))),
 group('partners','ANG BHW AT ANG KANYANG BARANGAY',[15,16,17],cat(b(15,1),*[b(15,i,heading_lines=1) for i in range(2,6)],*[b(16,i,heading_lines=1) for i in range(3)],b(16,3,'list'),*[b(16,i,heading_lines=1) for i in range(4,7)],b(16,7,heading_lines=1),b(17,0))),
 group('teamwork','Team Work',[17],cat(b(17,2),b(17,3),b(17,4,'list'))),
 group('self-management','SELF MANAGEMENT',[17,18],cat(b(17,6),b(18,0),b(18,1,'list'),b(18,2),b(18,3,'list'))),
 group('communication','EPEKTIBONG PAKIKIPAGKOMUNIKASYON',[18,19],cat(b(18,5),b(18,6,'list'),b(19,0,'list'),[communication])),
 group('problems','PAGKILALA SA MGA PROBLEMA AT PAGPAPLANO NG MGA SOLUSYON',[19,20,21],cat(b(19,2),b(19,3),b(20,0),[whys],b(20,1),b(20,2,'list'),b(20,3),[ranking],b(21,0))),
 group('safety','OCCUPATIONAL SAFETY AND HEALTH',[21,22,23],cat(b(21,2),b(22,0),[safety1,safety2])),
 group('plastics','Pagbabawal sa paggamit ng single-use plastics sa mga health facilities',[14],cat(b(14,6,'list'),b(14,7,'list')))
]
import csv
mapping={}
for r in csv.DictReader(open('docs/chapter-1-assessment-plan/lesson-assessment-map.csv')):
 k=r['lesson_key'];n=int(r['major_lesson_number']);ids={1:['roles'],2:['uhc'],3:['policies'],4:['roles','benefits'],5:['partners'],6:['communication'],7:['problems'],8:['safety'],9:['plastics']}[n]
 if k=='bhw-teamwork':ids=['teamwork']
 if k=='bhw-self-management':ids=['self-management']
 if k=='communication-record':ids=['roles','communication']
 mapping[k]={'sections':ids,'partialSupport':n==9}
body={'version':'2022-c1-v1','source':{'title':"Barangay Health Workers’ Reference Manual",'edition':'2022','publisher':'Department of Health — Bureau of Local Health Systems Development, with WHO Philippines','url':'https://drive.google.com/file/d/13auqmQNRLevwxTm3lkMRHX13U1_d0TYs/view','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reviewedOn':'2026-11-20'},'lessons':mapping,'sections':sections}
pathlib.Path('content/training/day1-basic-competencies/manual-references/chapter1.json').write_text(json.dumps(body,ensure_ascii=False,indent=2)+'\n')
print('Created',len(mapping),'lesson mappings and',len(sections),'shared passages')
