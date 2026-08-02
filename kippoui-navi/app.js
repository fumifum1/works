(() => {
"use strict";

const $=id=>document.getElementById(id);
const STARS=["一白水星","二黒土星","三碧木星","四緑木星","五黄土星","六白金星","七赤金星","八白土星","九紫火星"];
const STAR_TRAITS={
 1:{summary:"冷静で慎重。環境に合わせる柔軟さと、内側に秘めた芯の強さを持つ傾向があります。",strength:"相手の気持ちをくみ取り、粘り強く進めること。",caution:"考え込みすぎたり、本音を抱え込みやすいところ。"},
 2:{summary:"温和で堅実。目立つよりも、周囲を支えながら着実に積み重ねる傾向があります。",strength:"継続力、気配り、生活や仕事の土台づくり。",caution:"慎重になりすぎたり、変化への対応が遅くなるところ。"},
 3:{summary:"明るく行動的。好奇心が強く、新しいことを素早く始める傾向があります。",strength:"発信力、決断の速さ、場を動かすエネルギー。",caution:"先走りや言葉の強さで、周囲との歩調がずれるところ。"},
 4:{summary:"柔和で社交的。人と人の間をつなぎ、調整することを得意とする傾向があります。",strength:"信頼関係づくり、交渉、細やかな配慮。",caution:"周囲を優先しすぎて、決断が揺れやすいところ。"},
 5:{summary:"自立心と存在感が強く、物事の中心で責任を引き受ける傾向があります。",strength:"突破力、統率力、困難な状況を立て直す力。",caution:"意志の強さが、強引さや対立として表れやすいところ。"},
 6:{summary:"責任感と実行力があり、高い目標に向けて自分を律する傾向があります。",strength:"判断力、リーダーシップ、最後までやり抜く姿勢。",caution:"理想を求めすぎたり、率直さが厳しく伝わるところ。"},
 7:{summary:"親しみやすく話し上手。人を楽しませ、場を明るくする傾向があります。",strength:"会話力、表現力、人との縁を広げること。",caution:"楽しさを優先しすぎたり、詰めが甘くなるところ。"},
 8:{summary:"粘り強く実直。守るべきものを大切にし、節目で大きく変化する傾向があります。",strength:"継続力、再建力、家族や仲間を守る姿勢。",caution:"自分のやり方に固執したり、急に方針を変えるところ。"},
 9:{summary:"感性が鋭く華やか。知性と直感を使って、物事の本質を見抜く傾向があります。",strength:"美的感覚、理解の速さ、魅力的に伝える力。",caution:"感情の波が表に出たり、熱しやすく冷めやすいところ。"}
};
const ELEMENT={1:"水",2:"土",3:"木",4:"木",5:"土",6:"金",7:"金",8:"土",9:"火"};
const DIRS=["北","北東","東","南東","南","南西","西","北西"];
const PALACE={"北":1,"北東":8,"東":3,"南東":4,"南":9,"南西":2,"西":7,"北西":6};
const BRANCH=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BD={"子":"北","丑":"北東","寅":"北東","卯":"東","辰":"南東","巳":"南東","午":"南","未":"南西","申":"南西","酉":"西","戌":"北西","亥":"北西"};
const TERMS=[
 ["小寒",285,12,1,5,"丑"],["立春",315,1,2,4,"寅"],["啓蟄",345,2,3,6,"卯"],["清明",15,3,4,5,"辰"],
 ["立夏",45,4,5,5,"巳"],["芒種",75,5,6,6,"午"],["小暑",105,6,7,7,"未"],["立秋",135,7,8,7,"申"],
 ["白露",165,8,9,8,"酉"],["寒露",195,9,10,8,"戌"],["立冬",225,10,11,7,"亥"],["大雪",255,11,12,7,"子"]
].map(x=>({name:x[0],lon:x[1],monthIndex:x[2],month:x[3],day:x[4],branch:x[5]}));
const TERM_BY_INDEX=Object.fromEntries(TERMS.map(t=>[t.monthIndex,t]));
const termCache=new Map();

function mod9(n){return ((n-1)%9+9)%9+1}
function norm(n){return ((n%360)+360)%360}
function opp(d){return {"北":"南","北東":"南西","東":"西","南東":"北西","南":"北","南西":"北東","西":"東","北西":"南東"}[d]}
function jst(d,t="12:00"){return new Date(`${d}T${t}:00+09:00`)}
function jd(d){return d.getTime()/86400000+2440587.5}
function angle(a,b){return ((a-b+540)%360)-180}
function solar(d){const T=(jd(d)-2451545)/36525,L0=norm(280.46646+T*(36000.76983+.0003032*T)),M=norm(357.52911+T*(35999.05029-.0001537*T))*Math.PI/180,C=(1.914602-T*(.004817+.000014*T))*Math.sin(M)+(.019993-.000101*T)*Math.sin(2*M)+.000289*Math.sin(3*M),o=(125.04-1934.136*T)*Math.PI/180;return norm(L0+C-.00569-.00478*Math.sin(o))}
function term(yearValue,t){const key=`${yearValue}-${t.name}`;if(termCache.has(key))return termCache.get(key);let lo=Date.UTC(yearValue,t.month-1,t.day-3),hi=Date.UTC(yearValue,t.month-1,t.day+3);for(let i=0;i<56;i++){const m=(lo+hi)/2;angle(solar(new Date(m)),t.lon)<0?lo=m:hi=m}const value=new Date((lo+hi)/2);termCache.set(key,value);return value}
function context(d){const y=d.getUTCFullYear(),all=[];for(const yy of [y-1,y,y+1])for(const t of TERMS)all.push({...t,date:term(yy,t)});all.sort((a,b)=>a.date-b.date);let c=all[0],n=all[1];for(const x of all){if(x.date<=d)c=x;if(x.date>d){n=x;break}}return {c,n}}
function year(d){const y=Number(new Intl.DateTimeFormat("en",{timeZone:"Asia/Tokyo",year:"numeric"}).format(d));return d<term(y,TERM_BY_INDEX[1])?y-1:y}
function ystar(y){return mod9(11-mod9(y))}
function honmei(d){return ystar(year(d))}
function ybranch(y){return BRANCH[((y-4)%12+12)%12]}
function monthCenter(d){const y=year(d),b=ybranch(y),m=context(d).c.monthIndex,s=["子","午","卯","酉"].includes(b)?8:["辰","戌","丑","未"].includes(b)?5:2;return mod9(s-(m-1))}
function getsumei(d){const h=honmei(d),m=context(d).c.monthIndex,s=[1,4,7].includes(h)?8:[2,5,8].includes(h)?2:5;return mod9(s-(m-1))}
function at(c,p){const f=[5,6,7,8,9,1,2,3,4];return mod9(c+f.indexOf(p))}
function board(c){const b={中宮:c};for(const d of DIRS)b[d]=at(c,PALACE[d]);return b}
function addBad(r,b,labelText,h,g){const f=DIRS.find(d=>b[d]===5);if(f){r[f].push(labelText+"・五黄殺");r[opp(f)].push(labelText+"・暗剣殺")}const hd=DIRS.find(d=>b[d]===h);if(hd){r[hd].push(labelText+"・本命殺");r[opp(hd)].push(labelText+"・本命的殺")}const gd=DIRS.find(d=>b[d]===g);if(gd){r[gd].push(labelText+"・月命殺");r[opp(gd)].push(labelText+"・月命的殺")}}

function calculateCore(birth,target){
 const h=honmei(birth),g=getsumei(birth),y=year(target),yb=ybranch(y),tc=context(target),yc=ystar(y),mc=monthCenter(target),ybp=board(yc),mbp=board(mc),reasons=Object.fromEntries(DIRS.map(d=>[d,[]]));
 addBad(reasons,ybp,"年盤",h,g);addBad(reasons,mbp,"月盤",h,g);
 reasons[opp(BD[yb])].push(`歳破（${yb}年・八方位近似）`);
 reasons[opp(BD[tc.c.branch])].push(`月破（${tc.c.branch}月・八方位近似）`);
 const gen={水:"木",木:"火",火:"土",土:"金",金:"水"},rating={};
 for(const d of DIRS){if(reasons[d].length)rating[d]="bad";else{const a=ELEMENT[h],b=ELEMENT[mbp[d]];rating[d]=(a===b||gen[a]===b||gen[b]===a)?"good":"neutral"}}
 return {h,g,y,yb,tc,yc,mc,ybp,mbp,reasons,rating};
}
function calculateForISO(birthISO,targetISO){return calculateCore(jst(birthISO),jst(targetISO))}
function todayISO(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo"}).format(new Date())}
function pad(n){return String(n).padStart(2,"0")}
function esc(value){return String(value).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]))}
function label(status){return status==="good"?"吉候補":status==="bad"?"避ける":"中立"}
function formatLongDate(date){return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(date)}
function formatMonthDay(date){return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric"}).format(date)}
function validateBirthISO(iso){if(!iso)throw Error("生年月日を年・月・日すべて選んでください。");if(iso>todayISO())throw Error("生年月日は今日以前の日付を選んでください。");return iso}

function populateYearSelect(select){const current=Number(todayISO().slice(0,4));for(let y=current;y>=1900;y--)select.add(new Option(`${y}年`,String(y)))}
function populateMonthSelect(select){for(let m=1;m<=12;m++)select.add(new Option(`${m}月`,String(m)))}
function refreshDays(yearSelect,monthSelect,daySelect){const y=Number(yearSelect.value),m=Number(monthSelect.value),previous=Number(daySelect.value),max=y&&m?new Date(y,m,0).getDate():0;daySelect.replaceChildren(new Option("日",""));daySelect.disabled=!max;for(let d=1;d<=max;d++)daySelect.add(new Option(`${d}日`,String(d)));if(previous&&previous<=max)daySelect.value=String(previous)}
function setupDateControls(yearSelect,monthSelect,daySelect){populateYearSelect(yearSelect);populateMonthSelect(monthSelect);const update=()=>refreshDays(yearSelect,monthSelect,daySelect);yearSelect.addEventListener("change",update);monthSelect.addEventListener("change",update);update()}
function selectedISO(yearSelect,monthSelect,daySelect){const y=yearSelect.value,m=monthSelect.value,d=daySelect.value;return y&&m&&d?`${y}-${pad(m)}-${pad(d)}`:""}
function setDateControls(yearSelect,monthSelect,daySelect,iso){if(!iso)return;const [y,m,d]=iso.split("-").map(Number);yearSelect.value=String(y);monthSelect.value=String(m);refreshDays(yearSelect,monthSelect,daySelect);daySelect.value=String(d)}

const mainYear=$("birthYear"),mainMonth=$("birthMonth"),mainDay=$("birthDay");
setupDateControls(mainYear,mainMonth,mainDay);

function personalityMarkup(star,role,guide){const trait=STAR_TRAITS[star];return `<article class="personality-card"><div class="personality-card-head"><span>${role}</span><strong>${STARS[star-1]}</strong></div><small>${guide}</small><p>${trait.summary}</p><dl><div><dt>活かしやすい力</dt><dd>${trait.strength}</dd></div><div><dt>気をつけたい傾向</dt><dd>${trait.caution}</dd></div></dl></article>`}
function groupMarkup(title,type,dirs){const chips=dirs.length?dirs.map(d=>`<span class="direction-chip">${d}</span>`).join(""):`<span class="direction-chip empty">なし</span>`;return `<article class="result-group ${type}"><h4>${title}<span>${dirs.length}</span></h4><div class="direction-chips">${chips}</div></article>`}
function reasonText(result,d){return result.reasons[d].length?result.reasons[d].join("、"):result.rating[d]==="good"?"重大な除外条件がなく、五行の関係も良好です。":"重大な除外条件はありませんが、積極的な吉条件は弱めです。"}

let lastResult=null;
function renderSingle(result,birthISO,targetISO){
 const grouped={good:DIRS.filter(d=>result.rating[d]==="good"),neutral:DIRS.filter(d=>result.rating[d]==="neutral"),bad:DIRS.filter(d=>result.rating[d]==="bad")};
 $("results").classList.remove("hidden");
 $("resultDate").textContent=formatLongDate(jst(targetISO));
 $("resultMeta").innerHTML=`<span>本命星｜${STARS[result.h-1]}</span><span>月命星｜${STARS[result.g-1]}</span><span>年盤｜${STARS[result.yc-1]}</span><span>月盤｜${STARS[result.mc-1]}</span>`;
 $("personality").innerHTML=personalityMarkup(result.h,"本命星","表に出やすい基本傾向")+personalityMarkup(result.g,"月命星","内面に表れやすい傾向");
 $("resultHeadline").textContent=grouped.good.length?`吉方位候補は「${grouped.good.join("・")}」です`:`今回は無理に吉方位を選ばないのがおすすめです`;
 $("resultIntro").textContent=grouped.good.length?"方位ごとの理由を読み、地図では起点から広がる色分けを目安にしてください。":"8方位すべてに除外条件または中立判定があります。判定日を変えて確認する方法も検討してください。";
 $("resultGroups").innerHTML=groupMarkup("おすすめ","good",grouped.good)+groupMarkup("中立","neutral",grouped.neutral)+groupMarkup("避ける","bad",grouped.bad);
 $("reasons").innerHTML=DIRS.map(d=>`<div class="reason ${result.rating[d]}"><b>${d}</b><span class="status-badge">${label(result.rating[d])}</span><span>${reasonText(result,d)}</span></div>`).join("");
 lastResult={...result,type:"single"};
 $("mapJudgeMode").textContent="表示中：一人判定";
 scheduleDirectionOverlay();
 syncMainBirthToFirstPerson(birthISO);
 renderAnnual(true);
 const section=$("results");
 requestAnimationFrame(()=>{section.focus({preventScroll:true});section.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})});
}

function annualTermYear(kigakuYear,monthIndex){return monthIndex===12?kigakuYear+1:kigakuYear}
function buildAnnualRows(birthISO,kigakuYear){const birth=jst(birthISO),rows=[];for(let monthIndex=1;monthIndex<=12;monthIndex++){const nextIndex=monthIndex===12?1:monthIndex+1,nextBaseYear=monthIndex===12?kigakuYear+1:kigakuYear,startTerm=TERM_BY_INDEX[monthIndex],nextTerm=TERM_BY_INDEX[nextIndex],start=term(annualTermYear(kigakuYear,monthIndex),startTerm),end=term(annualTermYear(nextBaseYear,nextIndex),nextTerm),sample=new Date((start.getTime()+end.getTime())/2),result=calculateCore(birth,sample);rows.push({monthIndex,startTerm,nextTerm,start,end,sample,result})}return rows}
function renderAnnual(silent=false){
 const birthISO=selectedISO(mainYear,mainMonth,mainDay),error=$("annualError");error.textContent="";
 try{
  validateBirthISO(birthISO);
  const kigakuYear=Number($("annualYear").value),rows=buildAnnualRows(birthISO,kigakuYear),first=rows[0].result;
  $("annualSummary").innerHTML=`<strong>${kigakuYear}年｜${STARS[first.h-1]}</strong><br><small>立春から翌年の立春前まで・月命星 ${STARS[first.g-1]}</small>`;
  $("annualResults").innerHTML=rows.map(row=>{const good=DIRS.filter(d=>row.result.rating[d]==="good"),bad=DIRS.filter(d=>row.result.rating[d]==="bad");return `<article class="annual-row"><div class="annual-month"><span>MONTH ${pad(row.monthIndex)}</span><strong>${row.startTerm.name}</strong><small>${formatMonthDay(row.start)}頃〜${formatMonthDay(row.end)}頃</small></div><div><span class="annual-cell-label">吉方位候補</span><div class="direction-chips">${good.length?good.map(d=>`<span class="direction-chip good">${d}・吉</span>`).join(""):`<span class="direction-chip empty">なし</span>`}</div></div><div><span class="annual-cell-label">避ける方位</span><div class="annual-bad">${bad.length?bad.join("・"):"なし"}</div></div></article>`}).join("");
 }catch(err){if(!silent)error.textContent=err.message;$("annualSummary").innerHTML="";$("annualResults").innerHTML=""}
}

let personSequence=0;
function personLetter(index){return String.fromCharCode(65+index)}
function addPerson(initialISO=""){
 const panels=$("peopleList").querySelectorAll(".person-panel");
 if(panels.length>=6){showToast("参加者は6人まで追加できます");return}
 const fragment=$("personTemplate").content.cloneNode(true),panel=fragment.querySelector(".person-panel"),id=++personSequence;
 panel.dataset.personId=String(id);
 const y=panel.querySelector(".person-year"),m=panel.querySelector(".person-month"),d=panel.querySelector(".person-day");
 setupDateControls(y,m,d);
 if(initialISO)setDateControls(y,m,d,initialISO);
 panel.querySelector(".remove-person").addEventListener("click",()=>{if($("peopleList").querySelectorAll(".person-panel").length<=2){showToast("複数人判定は2人以上で使用します");return}panel.remove();updatePersonNumbers()});
 $("peopleList").appendChild(fragment);
 updatePersonNumbers();
}
function updatePersonNumbers(){const panels=[...$("peopleList").querySelectorAll(".person-panel")];panels.forEach((panel,index)=>{panel.querySelector(".person-number").textContent=`PERSON ${pad(index+1)}`;panel.querySelector(".person-name").placeholder=`例：${personLetter(index)}さん`;panel.querySelector(".person-year").setAttribute("aria-label",`${index+1}人目の生年`);panel.querySelector(".person-month").setAttribute("aria-label",`${index+1}人目の生月`);panel.querySelector(".person-day").setAttribute("aria-label",`${index+1}人目の生日`);panel.querySelector(".remove-person").disabled=panels.length<=2})}
function syncMainBirthToFirstPerson(iso){const first=$("peopleList").querySelector(".person-panel");if(!first)return;const y=first.querySelector(".person-year"),m=first.querySelector(".person-month"),d=first.querySelector(".person-day");if(!selectedISO(y,m,d))setDateControls(y,m,d,iso)}
function collectPeople(){return [...$("peopleList").querySelectorAll(".person-panel")].map((panel,index)=>{const iso=selectedISO(panel.querySelector(".person-year"),panel.querySelector(".person-month"),panel.querySelector(".person-day"));validateBirthISO(iso);return {id:panel.dataset.personId,name:panel.querySelector(".person-name").value.trim()||personLetter(index),birthISO:iso}})}
function renderGroup(){
 const error=$("groupError");error.textContent="";
 try{
  const targetISO=$("groupTargetDate").value;if(!targetISO)throw Error("共通の判定日を選んでください。");
  const people=collectPeople();if(people.length<2)throw Error("2人以上を入力してください。");
  const personResults=people.map(person=>({...person,result:calculateForISO(person.birthISO,targetISO)})),rating={};
  for(const d of DIRS){const statuses=personResults.map(p=>p.result.rating[d]);rating[d]=statuses.includes("bad")?"bad":statuses.every(s=>s==="good")?"good":"neutral"}
  const grouped={good:DIRS.filter(d=>rating[d]==="good"),neutral:DIRS.filter(d=>rating[d]==="neutral"),bad:DIRS.filter(d=>rating[d]==="bad")};
  const headline=grouped.good.length?`全員共通の吉方位は「${grouped.good.join("・")}」です`:`全員共通の吉方位はありません`;
  $("groupResults").innerHTML=`<p class="eyebrow">GROUP RESULT</p><h3 class="group-headline">${headline}</h3><p>${formatLongDate(jst(targetISO))}・${people.length}人の判定</p><div class="group-overview"><div><small>全員に吉</small><strong>${grouped.good.length?grouped.good.join("・"):"なし"}</strong></div><div><small>一部吉／中立</small><strong>${grouped.neutral.length?grouped.neutral.join("・"):"なし"}</strong></div><div><small>誰かが避ける</small><strong>${grouped.bad.length?grouped.bad.join("・"):"なし"}</strong></div></div><div>${DIRS.map(d=>`<article class="group-direction"><header><strong>${d}</strong><span>${rating[d]==="good"?"全員に吉":rating[d]==="bad"?"誰かが避ける":"一部吉／中立"}</span></header><ul>${personResults.map(person=>`<li><b>${esc(person.name)}</b>｜${label(person.result.rating[d])}｜${esc(reasonText(person.result,d))}</li>`).join("")}</ul></article>`).join("")}</div><a class="outline-button group-map-link" href="#mapSection">この重ね合わせを地図で見る</a>`;
  $("groupResults").classList.remove("hidden");
  lastResult={type:"group",rating,people:personResults};
  $("mapJudgeMode").textContent=`表示中：複数人判定（${people.length}人）`;
  scheduleDirectionOverlay();
  $("groupResults").setAttribute("tabindex","-1");
  $("groupResults").focus({preventScroll:true});
 }catch(err){error.textContent=err.message;$("groupResults").classList.add("hidden")}
}

const TOKYO=[35.681236,139.767125],JAPAN_BOUNDS=L.latLngBounds([[24,122],[46,146]]);
let origin=[...TOKYO],originMarker=null,originPickMode=false,overlayFrame=0,toastTimer=0;
const map=L.map("map",{zoomControl:true});
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,detectRetina:true,crossOrigin:true,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
map.fitBounds(JAPAN_BOUNDS,{padding:[16,16],animate:false});
const directionCanvas=document.createElement("canvas");
directionCanvas.className="direction-overlay";directionCanvas.setAttribute("aria-hidden","true");map.getContainer().appendChild(directionCanvas);
const OVERLAY_COLORS={good:"rgba(79,120,214,.25)",neutral:"rgba(208,147,45,.22)",bad:"rgba(52,54,59,.44)"};
function fitJapanView(){map.fitBounds(JAPAN_BOUNDS,{padding:[16,16],animate:false})}
function fmt(n){return Number(n).toFixed(5)}
function scheduleDirectionOverlay(){if(overlayFrame)return;overlayFrame=requestAnimationFrame(()=>{overlayFrame=0;drawDirectionOverlay()})}
function drawDirectionOverlay(){
 const size=map.getSize(),w=size.x,h=size.y,dpr=Math.min(window.devicePixelRatio||1,2);if(!w||!h)return;
 const pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(directionCanvas.width!==pw||directionCanvas.height!==ph){directionCanvas.width=pw;directionCanvas.height=ph;directionCanvas.style.width=`${w}px`;directionCanvas.style.height=`${h}px`}
 const ctx=directionCanvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const p=map.latLngToContainerPoint(origin),reach=Math.hypot(w,h)+Math.hypot(p.x-w/2,p.y-h/2)+64,angleFor=deg=>(deg-90)*Math.PI/180;
 for(let i=0;i<8;i++){const status=lastResult?lastResult.rating[DIRS[i]]:"neutral",a1=angleFor(i*45-22.5),a2=angleFor(i*45+22.5);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a1)*reach,p.y+Math.sin(a1)*reach);ctx.lineTo(p.x+Math.cos(a2)*reach,p.y+Math.sin(a2)*reach);ctx.closePath();ctx.fillStyle=OVERLAY_COLORS[status];ctx.fill()}
 for(let i=0;i<8;i++){const a=angleFor(i*45-22.5),x=p.x+Math.cos(a)*reach,y=p.y+Math.sin(a)*reach;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x,y);ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle="rgba(24,23,19,.72)";ctx.lineWidth=1;ctx.stroke()}
 const ld=Math.max(58,Math.min(88,Math.min(w,h)*.18));ctx.textAlign="center";ctx.textBaseline="middle";ctx.font='600 14px "Noto Sans JP",sans-serif';ctx.lineJoin="round";
 for(let i=0;i<8;i++){const a=angleFor(i*45),x=p.x+Math.cos(a)*ld,y=p.y+Math.sin(a)*ld;if(x<14||x>w-14||y<14||y>h-14)continue;ctx.strokeStyle="rgba(255,255,255,.96)";ctx.lineWidth=5;ctx.strokeText(DIRS[i],x,y);ctx.fillStyle="#181713";ctx.fillText(DIRS[i],x,y)}
}
function setOriginPickMode(enabled){originPickMode=enabled;$("pickOriginBtn").setAttribute("aria-pressed",String(enabled));$("pickOriginBtn").textContent=enabled?"選択をキャンセル":"地図から起点を選ぶ";map.getContainer().classList.toggle("origin-picking",enabled);$("originPickHint").textContent=enabled?"地図上の起点にしたい場所を1回選択してください。":"任意地点を使う場合は「地図から起点を選ぶ」を押してください。"}
function setOrigin(latlng,name,{fitJapan=false}={}){origin=[latlng[0],latlng[1]];if(originMarker)map.removeLayer(originMarker);originMarker=L.marker(origin,{zIndexOffset:1000}).addTo(map).bindPopup(name);if(fitJapan)fitJapanView();$("originStatus").textContent=`起点：${name}（${fmt(origin[0])}, ${fmt(origin[1])}）`;setOriginPickMode(false);scheduleDirectionOverlay()}
function showToast(message){clearTimeout(toastTimer);$("toast").textContent=message;$("toast").classList.add("show");toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2600)}

$("form").addEventListener("submit",event=>{event.preventDefault();$("error").textContent="";try{const birthISO=validateBirthISO(selectedISO(mainYear,mainMonth,mainDay)),targetISO=$("targetDate").value;if(!targetISO)throw Error("判定日を選んでください。");renderSingle(calculateForISO(birthISO,targetISO),birthISO,targetISO)}catch(err){$("error").textContent=err.message}});
$("clearBtn").addEventListener("click",()=>{$("form").reset();refreshDays(mainYear,mainMonth,mainDay);$("targetDate").value=todayISO();$("error").textContent="";$("results").classList.add("hidden");$("annualSummary").innerHTML="";$("annualResults").innerHTML="";$("annualError").textContent="";lastResult=null;$("mapJudgeMode").textContent="表示中：判定前";scheduleDirectionOverlay()});
$("annualBtn").addEventListener("click",()=>renderAnnual(false));
$("addPersonBtn").addEventListener("click",()=>addPerson());
$("groupBtn").addEventListener("click",renderGroup);
$("pickOriginBtn").addEventListener("click",()=>setOriginPickMode(!originPickMode));
$("gpsBtn").addEventListener("click",()=>{if(!navigator.geolocation){showToast("この環境では現在地を取得できません");return}navigator.geolocation.getCurrentPosition(p=>{setOrigin([p.coords.latitude,p.coords.longitude],"現在地",{fitJapan:true});showToast("現在地を起点にしました")},()=>{setOriginPickMode(false);showToast("現在地を取得できませんでした")},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})});
$("tokyoBtn").addEventListener("click",()=>{setOrigin(TOKYO,"東京駅（デフォルト）",{fitJapan:true});showToast("東京駅を起点にしました")});
map.on("click",event=>{if(!originPickMode)return;setOrigin([event.latlng.lat,event.latlng.lng],"地図で選んだ地点",{fitJapan:false});showToast("選んだ地点を起点にしました")});
map.on("move zoom resize",scheduleDirectionOverlay);
let resizeTimer;window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{map.invalidateSize();scheduleDirectionOverlay()},120)});
document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;if(originPickMode)setOriginPickMode(false);$("menu-btn-check").checked=false});
document.querySelectorAll(".menu-content a").forEach(link=>link.addEventListener("click",()=>{$("menu-btn-check").checked=false}));

const nowYear=year(new Date());for(let y=nowYear-2;y<=nowYear+2;y++)$("annualYear").add(new Option(`${y}年`,String(y),y===nowYear,y===nowYear));
$("targetDate").value=todayISO();$("groupTargetDate").value=todayISO();
addPerson();addPerson();
setOrigin(TOKYO,"東京駅（デフォルト）",{fitJapan:true});
})();
