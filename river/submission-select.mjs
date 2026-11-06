// Keep Notion option names and order; never replace an existing saved value.
export function fillSubmissionSelect(select,names,current='리로스쿨'){
 const values=[...new Set(names.filter(name=>typeof name==='string'&&name))];
 if(current&&!values.includes(current))values.unshift(current);
 select.replaceChildren();
 if(!current){const option=document.createElement('option');option.value='';option.textContent='미지정';select.append(option);}
 for(const name of values){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}
 select.value=current;
}
