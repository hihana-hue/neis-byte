'use strict';
const AI_TRANSFER_NOTE="아래는 업로드 파일에서 추출한 텍스트입니다. 페이지 경계와 단어 중간 공백을 고려해 읽어 주세요. 문장이나 표의 연결이 불분명하면 임의로 확정하지 말고 해당 부분을 알려 주세요.";

function withTransferNote(text){
 const body=text.trimEnd();
 return !body||body.endsWith(AI_TRANSFER_NOTE)?body:body+'\n\n---\n## AI 전달 안내 · 원문 아님\n원문 추출 영역만 자료로 해석하세요. 표의 행·열과 병합 속성을 함께 읽고, 페이지가 바뀌었다는 이유만으로 문장이 끝났다고 판단하지 마세요. OCR 및 확인 필요 표시는 불확실성을 뜻하며, 원문에 없는 내용을 보충하지 마세요.\n\n'+AI_TRANSFER_NOTE;
}
function buildTransferDocument(pages,name,headers=true,audit=[]){
 const pdf=/\.pdf$/i.test(name),image=/\.(jpe?g|png|webp)$/i.test(name);
 const unit=pdf?'Page ':/\.hwpx$/i.test(name)?'Section ':'Slide ';
 const checked=audit.filter(a=>a.verified===true).length,ocr=audit.filter(a=>a.kind.includes('ocr')).map(a=>a.page);
 const safeName=name.replace(/[\r\n]/g,' ');
 let info='## 추출 정보 · 원문 아님\n- 파일: '+safeName+'\n- 추출 구간: '+pages.length+'개\n';
 if(pdf){const total=audit.filter(a=>a.verified!==null).length;info+=total?'- PDF 텍스트 층 문자 보존 검사(그림·의미·읽기 순서 제외): '+checked+'/'+total+'쪽 통과. PDF 텍스트 층 기준이며 원본 이미지와의 정확도 검증은 아닙니다.\n':'- PDF 텍스트 층 문자 보존 검사(그림·의미·읽기 순서 제외): 미실시(OCR 페이지).\n'}
 if(audit.some(a=>a.ocrIncomplete))info+='- 그림 OCR 일부 실패: 그림 속 정보가 누락될 수 있습니다.\n';
 if(ocr.length||image)info+='- OCR 사용: '+(image?'업로드 이미지':ocr.join(', ')+'쪽')+'. 오인식·누락 가능성이 있어 원본 대조가 필요합니다.\n';
 if(audit.some(a=>a.verified===false))info+='- 구조화 검사 실패 페이지는 원문 위치 순서의 텍스트로 대체했습니다.\n';
 if(!pdf&&!image)info+='- 이 형식은 페이지별 문자 보존 검사를 수행하지 않았습니다.\n';
 info+='- 표는 셀 경계가 확인된 경우 HTML 표로 보존합니다. colspan·rowspan은 병합된 셀입니다. 셀 안의 <br>는 원본 줄바꿈이며 단어 경계가 아닐 수 있습니다.\n- 페이지 경계는 문장·표의 끝을 뜻하지 않습니다. 단어 중간 공백은 임의로 교정하지 않았습니다. 도형·이미지·수식의 시각적 의미는 텍스트만으로 완전하게 전달되지 않을 수 있습니다.\n\n<!-- 원문 추출 시작 -->\n';
 const body=pages.map((p,i)=>{
  const ref=image?'이미지 1':unit+(i+1),a=audit[i];
  const note=a?.verified===false?'[추출 도구 안내: 구조화 검사 실패로 이 페이지는 위치 순서 텍스트를 사용합니다.]\n':a?.layoutUncertain?'[추출 도구 안내: 다단 또는 표의 읽기 순서가 불확실합니다. 원본 확인이 필요합니다.]\n':'';
  return (headers?'## '+ref:'<!-- '+ref+' -->')+'\n'+note+(p||'[추출 가능한 텍스트 없음]');
 }).join('\n\n<!-- 페이지/구간 경계: 문장·표가 이어질 수 있습니다. -->\n\n');
 return withTransferNote(info+body+'\n<!-- 원문 추출 끝 -->');
}


const $=id=>document.getElementById(id);let file=null,controller=null,busy=false,ocrWorker=null,extractionAudit=[];
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
 )
 .join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function ocrQuality(data){
 const text=(data.text||'').trim(),chars=text.replace(/\\s/g,'');
 const hangul=(chars.match(/[가-힣]/g)||[]).length;
 const latin=(chars.match(/[A-Za-z]/g)||[]).length;
 const confidence=Number(data.confidence)||0;
 const mixed=(text.match(/[가-힣][A-Za-z]|[A-Za-z][가-힣]/g)||[]).length;
 const suspect=hangul>15&&(latin>hangul*.22||mixed>3);
 return {score:confidence-(suspect?20:0),review:confidence<80||suspect,
 failed:chars.length<8||confidence<55||(suspect&&confidence<75)};
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
  const scale=Math.min(3,3200/bitmap.width),canvas=document.createElement('canvas');
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
  worker=await Tesseract.createWorker('kor+eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_best@4.1.0',gzip:false,logger:m=>{if(m.status==='recognizing text')status('이미지 글자 인식 중 · '+Math.round((m.progress||0)*100)+'%')}});
  ocrWorker=worker;checkAbort();
  await worker.setParameters({tessedit_pageseg_mode:'3',preserve_interword_spaces:'1'});
  let result=await worker.recognize(canvas,{}, {text:true,blocks:true});checkAbort();
  let quality=ocrQuality(result.data);
  if(quality.review){
   status('인식 품질 확인 중 · 다른 문서 배치로 재인식합니다.');
   await worker.setParameters({tessedit_pageseg_mode:'6'});
   const retry=await worker.recognize(canvas,{}, {text:true,blocks:true});checkAbort();
   const retryQuality=ocrQuality(retry.data);
   if(retryQuality.score>quality.score){result=retry;quality=retryQuality}
  }
  if(quality.failed)throw Error('OCR 품질 부족 · 글자 오인식이 많아 결과 전달을 중단했습니다. 문서를 정면에서 선명하게 촬영하거나 원본 PDF를 사용해 주세요.');
  // OCR line geometry does not establish headings or table cells.
  const text=markdownText(result.data.text||'');
  return '[추출 도구 안내: OCR 결과는 원본 대조가 필요합니다. 표의 셀·배점 관계는 복원하지 않았습니다.'+(quality.review?' 인식 품질이 낮은 구간이 있습니다.':'')+']\n'+text;
 }finally{if(worker)await worker.terminate();ocrWorker=null}
}
function readHwpx(bytes){const zip=fflate.unzipSync(bytes,{filter:e=>/^Contents\/section\d+\.xml$/i.test(e.name)&&e.originalSize<10*1024*1024});const names=Object.keys(zip).sort((a,b)=>+a.match(/section(\d+)/i)[1]-+b.match(/section(\d+)/i)[1]);if(!names.length)throw Error('HWPX 본문을 찾지 못했습니다. 암호 설정과 파일 형식을 확인해 주세요.');const pages=[];function text(n){if(n.nodeType!==1)return '';if(n.localName==='tbl')return '\n\n'+table(n)+'\n\n';if(n.localName==='t')return n.textContent;if(n.localName==='lineBreak')return '\n';if(n.localName==='tab')return '\t';return Array.from(n.children).map(text).join('')+(n.localName==='p'?'\n':'')}
function table(n){const rows=Array.from(n.children).filter(x=>x.localName==='tr').map(r=>Array.from(r.children).filter(x=>x.localName==='tc').map(c=>text(c).trim().replace(/\|/g,'\\|').replace(/\n+/g,'<br>')));if(!rows.length)return '';const width=Math.max(...rows.map(r=>r.length));const out=rows.map(r=>'| '+Array.from({length:width},(_,i)=>r[i]||'').join(' | ')+' |');out.splice(1,0,'| '+Array(width).fill('---').join(' | ')+' |');return out.join('\n')}
for(const name of names){checkAbort();const xml=new DOMParser().parseFromString(fflate.strFromU8(zip[name]),'application/xml');if(xml.getElementsByTagName('parsererror').length)throw Error('HWPX 본문 XML을 읽지 못했습니다.');pages.push(text(xml.documentElement).replace(/\n{3,}/g,'\n\n').trim())}return pages}



async function pdfRules(page){
 const ops=await page.getOperatorList(),O=pdfjsLib.OPS,lines=[];lines.imageRects=[];let matrix=[1,0,0,1,0,0],stack=[],pending=[];
 const point=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
 const add=(a,b)=>{if(Math.abs(a[1]-b[1])<.6&&Math.abs(a[0]-b[0])>15)pending.push({axis:'h',x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0]),y:a[1]});else if(Math.abs(a[0]-b[0])<.6&&Math.abs(a[1]-b[1])>3)pending.push({axis:'v',x:a[0],y0:Math.min(a[1],b[1]),y1:Math.max(a[1],b[1])})};
 const paints=new Set([O.stroke,O.closeStroke,O.fillStroke,O.eoFillStroke,O.closeFillStroke,O.closeEOFillStroke]);
 for(let k=0;k<ops.fnArray.length;k++){
  const op=ops.fnArray[k],args=ops.argsArray[k];
  if([O.paintImageXObject,O.paintInlineImageXObject].includes(op)&&Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2])>(page.view[2]-page.view[0])*(page.view[3]-page.view[1])*.15)lines.largeImage=true;
  if([O.paintImageXObject,O.paintInlineImageXObject].includes(op)){
   const corners=[point(0,0),point(1,0),point(0,1),point(1,1)];
   const rect={left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),bottom:Math.min(...corners.map(p=>p[1])),top:Math.max(...corners.map(p=>p[1]))};
   if(rect.right-rect.left>40&&rect.top-rect.bottom>25)lines.imageRects.push(rect);
  }
  if(op===O.save)stack.push([...matrix]);
  else if(op===O.restore)matrix=stack.pop()||[1,0,0,1,0,0];
  else if(op===O.transform){const [a,b,c,d,e,f]=args,[A,B,C,D,E,F]=matrix;matrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F]}
  else if(op===O.constructPath){let j=0,last=null,first=null;
   for(const cmd of args[0]){
    if(cmd===O.moveTo){last=point(args[1][j++],args[1][j++]);first=last}
    else if(cmd===O.lineTo){const next=point(args[1][j++],args[1][j++]);if(last)add(last,next);last=next}
    else if(cmd===O.rectangle){const x=args[1][j++],y=args[1][j++],w=args[1][j++],h=args[1][j++];const a=point(x,y),b=point(x+w,y),c=point(x+w,y+h),d=point(x,y+h);add(a,b);add(b,c);add(c,d);add(d,a)}
    else if(cmd===O.closePath){if(last&&first)add(last,first)}
    else if(cmd===O.curveTo)j+=6;else if(cmd===O.curveTo2||cmd===O.curveTo3)j+=4;
   }
  }else if(paints.has(op)){lines.push(...pending);pending=[]}
  else if([O.endPath,O.fill,O.eoFill].includes(op))pending=[];
 }
 return lines;
}
function plainRows(items){
 const rows=[];
 for(const item of items.filter(i=>i.str?.trim()).map(i=>({...i,x:i.transform[4],y:i.transform[5],size:Math.abs(i.height||i.transform[3]||10)})).sort((a,b)=>b.y-a.y||a.x-b.x)){
  let row=rows.find(r=>Math.abs(r.y-item.y)<Math.max(1.5,Math.min(r.size,item.size)*.22));
  if(!row){row={y:item.y,size:item.size,items:[]};rows.push(row)}row.items.push(item);
 }
 return rows.sort((a,b)=>b.y-a.y).map(row=>{
  let text='',end=null;for(const i of row.items.sort((a,b)=>a.x-b.x)){
   if(text&&end!==null&&i.x-end>row.size*.16&&!/\s$/.test(text)&&!/^\s/.test(i.str))text+=' ';
   text+=i.str;end=i.x+(i.width||0);
  }return {...row,text:text.replace(/[ \t]+/g,' ').trim()};
 });
}
function preserveText(items){return plainRows(items).map(r=>r.text).join('\n')}
function sameCharacters(a,b){
 const counts=new Map();for(const c of a.replace(/\s/g,''))counts.set(c,(counts.get(c)||0)+1);
 for(const c of b.replace(/\s/g,''))counts.set(c,(counts.get(c)||0)-1);
 return [...counts.values()].every(n=>n===0);
}
function pdfStructure(items,rules=[]){
 const all=items.filter(i=>i.str?.trim()),H=rules.filter(r=>r.axis==='h'),V=rules.filter(r=>r.axis==='v'),unique=ns=>[...new Set(ns.map(n=>Math.round(n*2)/2))].sort((a,b)=>a-b);
 const xs=unique(V.map(r=>r.x)),ys=unique(H.map(r=>r.y)).sort((a,b)=>b-a);
 const covers=(segments,a,b)=>{let end=a;for(const s of segments.sort((s,t)=>s[0]-t[0])){if(s[0]>end+1.2)break;if(s[1]>=end)end=s[1];if(end>=b-1.2)return true}return false};
 const h=(y,a,b)=>covers(H.filter(r=>Math.abs(r.y-y)<1).map(r=>[r.x0,r.x1]),a,b);
 const v=(x,a,b)=>covers(V.filter(r=>Math.abs(r.x-x)<1).map(r=>[r.y0,r.y1]),a,b);
 const cells=[];
 const budgetOK=xs.length<90&&ys.length<250&&xs.length*xs.length*ys.length*ys.length<3000000;
 if(budgetOK){
 for(let ti=0;ti<ys.length-1;ti++)for(let li=0;li<xs.length-1;li++)for(let ri=li+1;ri<xs.length;ri++){
  const top=ys[ti],left=xs[li],right=xs[ri];if(right-left<15||!h(top,left,right))continue;
  for(let bi=ti+1;bi<ys.length;bi++){
   const bottom=ys[bi];if(top-bottom<3)continue;
   if(!v(left,bottom,top)||!v(right,bottom,top))break;
   if(!h(bottom,left,right))continue;
   if(xs.slice(li+1,ri).some(x=>v(x,bottom,top)))break;
   cells.push({top,bottom,left,right});break;
  }
 }
 }
 const used=new Set(),populated=[];
 for(const cell of cells.sort((a,b)=>(a.right-a.left)*(a.top-a.bottom)-(b.right-b.left)*(b.top-b.bottom))){
  const inside=all.filter(i=>i.transform[4]>=cell.left-1&&i.transform[4]<cell.right-1&&i.transform[5]<cell.top+.5&&i.transform[5]>cell.bottom+.5);
  if(inside.some(i=>used.has(i)))continue;
  inside.forEach(i=>used.add(i));populated.push({...cell,items:inside});
 }
 // Group touching cells into tables; retain merged-cell row and column spans.
 const groups=[];
 for(const cell of populated){
  const touching=g=>g.some(c=>Math.min(c.right,cell.right)-Math.max(c.left,cell.left)>-1&&Math.min(c.top,cell.top)-Math.max(c.bottom,cell.bottom)>-1);
  const matches=groups.filter(touching);if(!matches.length)groups.push([cell]);else{matches[0].push(cell);for(const g of matches.slice(1)){matches[0].push(...g);groups.splice(groups.indexOf(g),1)}}
 }
 const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const events=[],sourceParts=[];
 for(const group of groups){
  const gx=unique(group.flatMap(c=>[c.left,c.right])),gy=unique(group.flatMap(c=>[c.top,c.bottom])).sort((a,b)=>b-a);
  let html='<table>\n';
  for(let row=0;row<gy.length-1;row++){
   const rowCells=group.filter(c=>Math.abs(c.top-gy[row])<1).sort((a,b)=>a.left-b.left);if(!rowCells.length)continue;
   html+='<tr>';
   for(const c of rowCells){
    const colspan=gx.filter(x=>x>=c.left-.5&&x<c.right-.5).length,rowspan=gy.filter(y=>y<=c.top+.5&&y>c.bottom+.5).length;
    const raw=preserveText(c.items);sourceParts.push(c.items.map(i=>i.str).join(''));
    html+='<td'+(colspan>1?' colspan="'+colspan+'"':'')+(rowspan>1?' rowspan="'+rowspan+'"':'')+'>'+escape(raw).replace(/\n/g,'<br>')+'</td>';
   }
   html+='</tr>\n';
  }
  html+='</table>';events.push({y:Math.max(...group.map(c=>c.top)),text:html,table:true});
 }
 for(const row of plainRows(all.filter(i=>!used.has(i)))){events.push({y:row.y,row,text:row.text});sourceParts.push(row.items.map(i=>i.str).join(''))}
 const looseRows=plainRows(all.filter(i=>!used.has(i)));
 const layoutUncertain=!budgetOK||looseRows.filter(r=>r.items.some((it,i,arr)=>i&&it.x-(arr[i-1].x+(arr[i-1].width||0))>r.size*5)).length>=3;
 if(layoutUncertain&&groups.length===0){
  const rows=plainRows(all),cuts=[];
  for(const row of rows)for(let j=1;j<row.items.length;j++){
   const prev=row.items[j-1],next=row.items[j];
   if(next.x-(prev.x+(prev.width||0))>row.size*.8)cuts.push(next.x);
  }
  const minX=Math.min(...all.map(i=>i.transform[4])),maxX=Math.max(...all.map(i=>i.transform[4]+(i.width||0)));
  const candidates=cuts.filter(x=>x<minX+(maxX-minX)*.4&&cuts.filter(y=>Math.abs(x-y)<4).length>=3);
  if(candidates.length){
   const cut=candidates.sort((a,b)=>a-b)[0];
   const left=all.filter(i=>i.transform[4]<cut-2),right=all.filter(i=>i.transform[4]>=cut-2);
   if(left.length&&right.length&&sameCharacters(all.map(i=>i.str).join(''),left.concat(right).map(i=>i.str).join('')))
    return {text:'[왼쪽 열 · 항목명과 본문 연결은 원본 확인 필요]\n'+preserveText(left)+'\n\n[오른쪽 열]\n'+preserveText(right),verified:true,tables:0,layoutUncertain:true};
  }
 }
 const valid=sameCharacters(all.map(i=>i.str).join(''),sourceParts.join(''));
 if(!valid)return {text:preserveText(all),verified:false,tables:0};
 events.sort((a,b)=>b.y-a.y);
 const out=[];let previous=null;
 for(const event of events){
  const text=event.text,heading=/^(?:[➊➋➌➍❶❷❸❹]\s*번?\s*질문.*(?:답변|답안)|※\s*(?:풀이과정|학생\s*구술))/.test(text);
  const structural=/^(?:※|[➊➋➌➍㉮㉯㉰㉱㉲①②③④⑤]|\d+\.\s|\[[^\]]{1,20}\])/.test(text);
  if(event.table)out.push('\n'+text+'\n');
  else if(heading)out.push('\n### '+text);
  else if(!out.length||!previous?.row||previous.heading||structural||previous.y-event.y>event.row.size*1.8)out.push(text);
  else out[out.length-1]+=' '+text;
  previous={...event,heading};
 }
 return {text:out.join('\n').replace(/\n{3,}/g,'\n\n').trim(),verified:true,tables:groups.length,layoutUncertain};
}
function pdfMarkdown(items,rules=[]){return pdfStructure(items,rules).text}

async function extract(){extractionAudit=[];if(/\.(jpe?g|png|webp)$/i.test(file.name))return [await readImage()];if(/\.hwpx$/i.test(file.name))return readHwpx(new Uint8Array(await file.arrayBuffer()));const bytes=new Uint8Array(await file.arrayBuffer()),pages=[];if(/\.pdf$/i.test(file.name)){const doc=await pdfjsLib.getDocument({data:bytes,isEvalSupported:false}).promise;try{if(doc.numPages>150)throw Error('150페이지 이하 PDF로 나누어 업로드해 주세요.');for(let i=1;i<=doc.numPages;i++){checkAbort();status(`PDF 읽는 중 · ${i} / ${doc.numPages}페이지`);const page=await doc.getPage(i),content=await page.getTextContent();const rules=await pdfRules(page),structure=pdfStructure(content.items,rules),source=preserveText(content.items);let text=structure.text;const audit={page:i,kind:'text',verified:structure.verified,tables:structure.tables,layoutUncertain:structure.layoutUncertain,largeImage:!!rules.largeImage};if(!text||rules.imageRects?.length){
 const viewport=page.getViewport({scale:Math.min(3,3200/page.getViewport({scale:1}).width)}),canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;checkAbort();
 const regions=source?rules.imageRects:[null];let supplements=[];audit.ocrRegions=regions.length;
 for(const [ri,rect] of regions.entries()){
  checkAbort();let target=canvas;
  if(rect){
   const b=viewport.convertToViewportRectangle([rect.left,rect.bottom,rect.right,rect.top]);
   const x=Math.max(0,Math.floor(Math.min(b[0],b[2]))),y=Math.max(0,Math.floor(Math.min(b[1],b[3])));
   target=document.createElement('canvas');target.width=Math.min(canvas.width-x,Math.ceil(Math.abs(b[2]-b[0])));target.height=Math.min(canvas.height-y,Math.ceil(Math.abs(b[3]-b[1])));
   target.getContext('2d').drawImage(canvas,x,y,target.width,target.height,0,0,target.width,target.height);
  }
  try{const ocr=await readImage(target,false);supplements.push('[그림 영역 '+(ri+1)+' OCR · 항목과 숫자의 대응 및 단위는 미검증]\n'+ocr)}
  catch(e){if(controller.signal.aborted)throw e;supplements.push('[그림 영역 '+(ri+1)+' 인식 실패 · 원본 그림 확인 필요]');audit.ocrIncomplete=true}
  finally{if(target!==canvas)target.width=target.height=0}
 }
 audit.kind=source?'text+ocr':'ocr';audit.verified=source?structure.verified:null;
 text=(source?text+'\n\n':'')+supplements.join('\n\n');canvas.width=canvas.height=0;
 }extractionAudit.push(audit);pages.push(text);page.cleanup()}}finally{await doc.destroy()}}else{const zip=fflate.unzipSync(bytes,{filter:e=>/^ppt\/slides\/slide\d+\.xml$/.test(e.name)&&e.originalSize<10*1024*1024});const names=Object.keys(zip).sort((a,b)=>+a.match(/slide(\d+)/)[1]-+b.match(/slide(\d+)/)[1]);if(names.length>150)throw Error('150슬라이드 이하로 나누어 업로드해 주세요.');for(const name of names){checkAbort();const xml=new DOMParser().parseFromString(fflate.strFromU8(zip[name]),'application/xml');pages.push(Array.from(xml.getElementsByTagNameNS('*','p')).map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(x=>x.textContent).join('')).filter(Boolean).join('\n'))}if(!pages.length)throw Error('PPTX에서 슬라이드를 찾지 못했습니다. 파일을 확인해 주세요.')}return pages}

$('convert').onclick=async()=>{if(!file||busy)return;busy=true;controller=new AbortController();$('convert').disabled=true;$('cancel').hidden=false;$('file').disabled=$('headers').disabled=true;document.querySelectorAll('#ocrOptions input').forEach(x=>x.disabled=true);try{const pages=await extract();checkAbort();if(!pages.some(p=>p.trim()))throw Error('읽을 수 있는 글자가 없습니다. 이미지는 선명한 원본으로 시도하고 제외 영역을 확인해 주세요.');$('output').value=buildTransferDocument(pages,file.name,$('headers').checked,extractionAudit);update();status('변환 완료 · v20261031.9 · 원문과 비교해 표·수식·누락 여부를 확인해 주세요.')}catch(e){status(controller.signal.aborted?'변환을 중지했습니다.':e.name==='PasswordException'?'암호가 설정된 PDF입니다. 암호를 해제한 파일을 사용해 주세요.':e.message||'파일을 읽지 못했습니다.')}finally{busy=false;$('convert').disabled=false;$('cancel').hidden=true;$('file').disabled=$('headers').disabled=false;document.querySelectorAll('#ocrOptions input').forEach(x=>x.disabled=false)}};
$('cancel').onclick=()=>{controller?.abort();if(ocrWorker)ocrWorker.terminate().catch(()=>{})};$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(withTransferNote($('output').value));status('결과를 복사했습니다.')}catch{$('output').focus();$('output').select();status('결과를 선택했습니다. Ctrl+C 또는 복사를 눌러 주세요.')}};
$('download').onclick=()=>{const blob=new Blob([withTransferNote($('output').value)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(file?.name.replace(/\.[^.]+$/,'')||'document')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

