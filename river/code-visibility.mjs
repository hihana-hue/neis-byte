const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOff='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.3 6.3A20 20 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.1-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
for(const button of document.querySelectorAll('[data-code-visibility]')){
 const input=document.getElementById(button.dataset.codeVisibility);if(!input)continue;
 function show(visible){input.type=visible?'text':'password';button.innerHTML=visible?eyeOff:eye;button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?'연결코드 숨기기':'연결코드 보기');button.title=visible?'연결코드 숨기기':'연결코드 보기';}
 show(false);button.addEventListener('click',()=>show(input.type==='password'));
 input.closest('dialog')?.addEventListener('close',()=>show(false));
 input.form?.addEventListener('submit',()=>show(false));
}
