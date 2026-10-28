'use strict';
const $=id=>document.getElementById(id);let file=null,controller=null,busy=false,ocrWorker=null;
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
function status(s){$('status').textContent=s}
function update(){const t=$('output').value;$('count').textContent=t.length.toLocaleString()+'자';$('copy').disabled=$('download').disabled=!t;$('empty').hidden=!!t;$('output').hidden=!t}
function selectFile(f){if(busy||!f)return;if(!/\.(pdf|pptx|hwpx|jpe?g|png|webp)$/i.test(f.name)){status('PDF·PPTX·HWPX 또는 JPG·PNG·WEBP를 선택해 주세요.');return}if(f.size>30*1024*1024){status('30MB 이하 파일을 선택해 주세요.');return}file=f;$('ocrOptions').hidden=!/\.(jpe?g|png|webp)$/i.test(f.name);$('filename').textContent=f.name;$('filemeta').textContent=(f.size/1024/1024).toFixed(2)+' MB · 클릭하여 다른 파일 선택';$('convert').disabled=false;status('파일이 준비됐습니다.');$('output').value='';update()}
$('file').onchange=e=>selectFile(e.target.files[0]);const drop=$('drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');selectFile(e.dataTransfer.files[0])};
$('help').onclick=()=>$('guide').showModal();$('closeGuide').onclick=()=>$('guide').close();$('output').oninput=update;
try{['gemini','openai','claude'].forEach(p=>sessionStorage.removeItem('mari-key-'+p))}catch{}
function checkAbort(){if(controller.signal.aborted)throw new DOMException('중지됨','AbortError')}

function markdownText(text){
 return text.replace(/\r/g,'').split('\n').map(line=>line.trim()
 .replace(/^[•●▪◦·]\s*/, '- ')
 .replace(/^([0-9]+)[)．]\s+/, '$1. ')
 .replace(/\bWhy am [|l] receiving\b/g,'Why am I receiving'))
 .join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function layoutMarkdown(data){
 const blocks=data.blocks||[];
 if(!blocks.length)return markdownText(data.text||'');
 const lines=blocks.flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[])).filter(l=>l.text?.trim());
 if(!lines.length)return markdownText(data.text||'');
 const heights=lines.map(l=>l.bbox.y1-l.bbox.y0).sort((a,b)=>a-b),median=heights[Math.floor(heights.length/2)]||1;
 const out=[];let previous=null;
 for(const line of lines){
  let text=markdownText(line.text),height=line.bbox.y1-line.bbox.y0;
  const heading=height>median*1.18&&text.length<100&&!/^[-\d]/.test(text);
  const list=/^(?:- |\d+\. )/.test(text);
  const gap=previous?line.bbox.y0-previous.bbox.y1:0;
  if(heading){out.push('\n\n### '+text+'\n')}
  else if(list){out.push('\n'+text)}
  else if(!previous||gap>median*.8||out[out.length-1]?.endsWith('\n'))out.push('\n'+text);
  else out[out.length-1]+=' '+text;
  previous=line;
 }
 return out.join('').replace(/\n{3,}/g,'\n\n').trim();
}
async function prepareImage(source,crop=false){
 const bitmap=source instanceof HTMLCanvasElement?source:await createImageBitmap(source);
 try{
  const top=crop?Number($('cropTop').value)||0:0,bottom=crop?Number($('cropBottom').value)||0:0;
  if(top+bottom>=80)throw Error('위·아래 제외 영역의 합계를 80% 미만으로 설정해 주세요.');
  const sy=Math.round(bitmap.height*top/100),sh=Math.round(bitmap.height*(100-top-bottom)/100);
  const scale=Math.min(2,2400/bitmap.width),canvas=document.createElement('canvas');
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(sh*scale);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,sy,bitmap.width,sh,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  let dark=0,total=0;
  for(let i=0;i<d.length;i+=64){if((d[i]+d[i+1]+d[i+2])/3<110)dark++;total++}
  const invert=dark/total>.55;
  for(let i=0;i<d.length;i+=4){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(invert)g=255-g;d[i]=d[i+1]=d[i+2]=g}
  ctx.putImageData(pixels,0,0);return canvas;
 }finally{bitmap.close?.()}
}
async function readImage(source=file,crop=true){
 status('이미지 인식 준비 중 · 첫 실행은 언어 자료 다운로드로 시간이 걸립니다.');
 if(!window.Tesseract)throw Error('OCR 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
 let worker;
 try{
  const canvas=await prepareImage(source,crop);checkAbort();
  worker=await Tesseract.createWorker('kor+eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@4.1.0',gzip:false,logger:m=>{if(m.status==='recognizing text')status('이미지 글자 인식 중 · '+Math.round((m.progress||0)*100)+'%')}});
  ocrWorker=worker;checkAbort();
  const result=await worker.recognize(canvas,{}, {text:true,blocks:true});checkAbort();
  return layoutMarkdown(result.data);
 }finally{if(worker)await worker.terminate();ocrWorker=null}
}
function readHwpx(bytes){const zip=fflate.unzipSync(bytes,{filter:e=>/^Contents\/section\d+\.xml$/i.test(e.name)&&e.originalSize<10*1024*1024});const names=Object.keys(zip).sort((a,b)=>+a.match(/section(\d+)/i)[1]-+b.match(/section(\d+)/i)[1]);if(!names.length)throw Error('HWPX 본문을 찾지 못했습니다. 암호 설정과 파일 형식을 확인해 주세요.');const pages=[];function text(n){if(n.nodeType!==1)return '';if(n.localName==='tbl')return '\n\n'+table(n)+'\n\n';if(n.localName==='t')return n.textContent;if(n.localName==='lineBreak')return '\n';if(n.localName==='tab')return '\t';return Array.from(n.children).map(text).join('')+(n.localName==='p'?'\n':'')}
function table(n){const rows=Array.from(n.children).filter(x=>x.localName==='tr').map(r=>Array.from(r.children).filter(x=>x.localName==='tc').map(c=>text(c).trim().replace(/\|/g,'\\|').replace(/\n+/g,'<br>')));if(!rows.length)return '';const width=Math.max(...rows.map(r=>r.length));const out=rows.map(r=>'| '+Array.from({length:width},(_,i)=>r[i]||'').join(' | ')+' |');out.splice(1,0,'| '+Array(width).fill('---').join(' | ')+' |');return out.join('\n')}
for(const name of names){checkAbort();const xml=new DOMParser().parseFromString(fflate.strFromU8(zip[name]),'application/xml');if(xml.getElementsByTagName('parsererror').length)throw Error('HWPX 본문 XML을 읽지 못했습니다.');pages.push(text(xml.documentElement).replace(/\n{3,}/g,'\n\n').trim())}return pages}
async function extract(){if(/\.(jpe?g|png|webp)$/i.test(file.name))return [await readImage()];if(/\.hwpx$/i.test(file.name))return readHwpx(new Uint8Array(await file.arrayBuffer()));const bytes=new Uint8Array(await file.arrayBuffer()),pages=[];if(/\.pdf$/i.test(file.name)){const doc=await pdfjsLib.getDocument({data:bytes,isEvalSupported:false}).promise;try{if(doc.numPages>150)throw Error('150페이지 이하 PDF로 나누어 업로드해 주세요.');for(let i=1;i<=doc.numPages;i++){checkAbort();status(`PDF 읽는 중 · ${i} / ${doc.numPages}페이지`);const page=await doc.getPage(i),content=await page.getTextContent();let lines=[],line='',y=null;for(const item of content.items){if(!('str'in item))continue;const ny=item.transform[5];if(y!==null&&Math.abs(y-ny)>4){lines.push(line);line=''}line+=(line&&!line.endsWith(' ')?' ':'')+item.str;y=ny;if(item.hasEOL){lines.push(line);line='';y=null}}if(line)lines.push(line);let text=markdownText(lines.join('\n'));if(!text){status(`스캔 PDF 인식 중 · ${i} / ${doc.numPages}페이지`);const viewport=page.getViewport({scale:Math.min(2,2400/page.getViewport({scale:1}).width)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;checkAbort();text=await readImage(canvas,false);canvas.width=canvas.height=0}pages.push(text);page.cleanup()}}finally{await doc.destroy()}}else{const zip=fflate.unzipSync(bytes,{filter:e=>/^ppt\/slides\/slide\d+\.xml$/.test(e.name)&&e.originalSize<10*1024*1024});const names=Object.keys(zip).sort((a,b)=>+a.match(/slide(\d+)/)[1]-+b.match(/slide(\d+)/)[1]);if(names.length>150)throw Error('150슬라이드 이하로 나누어 업로드해 주세요.');for(const name of names){checkAbort();const xml=new DOMParser().parseFromString(fflate.strFromU8(zip[name]),'application/xml');pages.push(Array.from(xml.getElementsByTagNameNS('*','p')).map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(x=>x.textContent).join('')).filter(Boolean).join('\n'))}if(!pages.length)throw Error('PPTX에서 슬라이드를 찾지 못했습니다. 파일을 확인해 주세요.')}return pages}

$('convert').onclick=async()=>{if(!file||busy)return;busy=true;controller=new AbortController();$('convert').disabled=true;$('cancel').hidden=false;$('file').disabled=$('headers').disabled=true;document.querySelectorAll('#ocrOptions input').forEach(x=>x.disabled=true);try{const pages=await extract();checkAbort();if(!pages.some(p=>p.trim()))throw Error('읽을 수 있는 글자가 없습니다. 이미지는 선명한 원본으로 시도하고 제외 영역을 확인해 주세요.');const image=/\.(jpe?g|png|webp)$/i.test(file.name),label=/\.pdf$/i.test(file.name)?'Page ':/\.hwpx$/i.test(file.name)?'Section ':'Slide ';$('output').value=pages.map((p,i)=>($('headers').checked?(image?'## '+file.name:'## '+label+(i+1))+'\n\n':'')+(p||'[추출 가능한 텍스트 없음]')).join('\n\n---\n\n');update();status('변환 완료 · 원문과 비교해 표·수식·누락 여부를 확인해 주세요.')}catch(e){status(controller.signal.aborted?'변환을 중지했습니다.':e.name==='PasswordException'?'암호가 설정된 PDF입니다. 암호를 해제한 파일을 사용해 주세요.':e.message||'파일을 읽지 못했습니다.')}finally{busy=false;$('convert').disabled=false;$('cancel').hidden=true;$('file').disabled=$('headers').disabled=false;document.querySelectorAll('#ocrOptions input').forEach(x=>x.disabled=false)}};
$('cancel').onclick=()=>{controller?.abort();if(ocrWorker)ocrWorker.terminate().catch(()=>{})};$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('output').value);status('결과를 복사했습니다.')}catch{$('output').focus();$('output').select();status('결과를 선택했습니다. Ctrl+C 또는 복사를 눌러 주세요.')}};
$('download').onclick=()=>{const blob=new Blob([$('output').value],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(file?.name.replace(/\.[^.]+$/,'')||'document')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
