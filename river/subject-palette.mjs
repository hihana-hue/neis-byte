// Notion exposes color names, not exact theme-dependent UI hex values.
export const palette={default:['#E9E9E7','#37352F'],gray:['#E3E2E0','#454340'],brown:['#EEE0DA','#64473A'],orange:['#FADEC9','#854C1D'],yellow:['#FDECC8','#71551A'],green:['#DBEDDB','#2B593F'],blue:['#D3E5EF','#284F6C'],purple:['#E8DEEE','#694A7A'],pink:['#F5E0E9','#7D3C60'],red:['#FFE2DD','#8A382E']};
const initialColors={"동아리 아트인더박스":"default","행특/봉사":"default","자율":"default","진로":"default","공통과학2":"purple","공통영어2":"red","공통수학2":"green","통합사회2":"orange","공통국어1":"blue","공통수학1":"blue","공통영어1":"blue","통합사회1":"blue","공통과학1":"blue","한국사":"blue","정보":"blue","과탐실":"yellow","음악":"yellow","미술":"yellow","체육":"yellow","종교학":"yellow"};
export function fallbackSubject(subject){return initialColors[subject]||'default';}
export function paintSubject(el,color,subject){const pair=palette[color]||palette[fallbackSubject(subject)];el.style.backgroundColor=pair[0];el.style.color=pair[1];}
