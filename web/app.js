(function(){
const APP='덤푸';
const B=window.Bridge&&window.Bridge.isApp&&window.Bridge.isApp()?window.Bridge:null; // 안드로이드 앱일 때만
const KEY='dumpu.v1';
const DOW=['월','화','수','목','금','토','일'];
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const dowOf=s=>(parse(s).getDay()+6)%7;
const md=s=>{const d=parse(s);return (d.getMonth()+1)+'/'+d.getDate()+'('+DOW[dowOf(s)]+')'};
const todayS=()=>ymd(new Date());
const mkOf=s=>s.slice(0,7);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const isDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d\d-\d\d$/.test(s))return false;const d=parse(s);return ymd(d)===s&&d.getFullYear()>=2000&&d.getFullYear()<=2100};
const isTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const blank=()=>({tasks:[],reps:[],annivs:[],logs:{},ents:{},settings:{alarm:false,time:'08:00',tags:['회사','집','약속'],tagColor:[4,2,0],hol:true,early:false,late:false,hourly:false,hFrom:9,hTo:22,palV:2}});

// ── 공휴일 (한국천문연구원 월력요항·정부 발표 기준, 2026~2028)
const HOL={
 2026:{'01-01':'신정','02-16':'설 연휴','02-17':'설날','02-18':'설 연휴','03-01':'삼일절','03-02':'대체공휴일','05-01':'노동절','05-05':'어린이날','05-24':'부처님오신날','05-25':'대체공휴일','06-03':'지방선거','06-06':'현충일','07-17':'제헌절','08-15':'광복절','08-17':'대체공휴일','09-24':'추석 연휴','09-25':'추석','09-26':'추석 연휴','10-03':'개천절','10-05':'대체공휴일','10-09':'한글날','12-25':'성탄절'},
 2027:{'01-01':'신정','02-06':'설 연휴','02-07':'설날','02-08':'설 연휴','02-09':'대체공휴일','03-01':'삼일절','05-01':'노동절','05-03':'대체공휴일','05-05':'어린이날','05-13':'부처님오신날','06-06':'현충일','07-17':'제헌절','07-19':'대체공휴일','08-15':'광복절','08-16':'대체공휴일','09-14':'추석 연휴','09-15':'추석','09-16':'추석 연휴','10-03':'개천절','10-04':'대체공휴일','10-09':'한글날','10-11':'대체공휴일','12-25':'성탄절','12-27':'대체공휴일'},
 2028:{'01-01':'신정','01-26':'설 연휴','01-27':'설날','01-28':'설 연휴','03-01':'삼일절','04-12':'국회의원선거','05-01':'노동절','05-02':'부처님오신날','05-05':'어린이날','06-06':'현충일','07-17':'제헌절','08-15':'광복절','10-02':'추석 연휴','10-03':'추석·개천절','10-04':'추석 연휴','10-05':'대체공휴일','10-09':'한글날','12-25':'성탄절'}
};
// 표가 없는 해는 날짜가 고정된 공휴일만 (설·추석·부처님오신날은 음력이라 빠짐)
const FIX={'01-01':'신정','03-01':'삼일절','05-01':'노동절','05-05':'어린이날','06-06':'현충일','07-17':'제헌절','08-15':'광복절','10-03':'개천절','10-09':'한글날','12-25':'성탄절'};
const MEMO={'05-08':'어버이날','05-15':'스승의날'};
function holOf(s){
  if(!data().settings.hol)return null;
  const y=+s.slice(0,4),k=s.slice(5);
  if(HOL[y])return HOL[y][k]||null;
  const f=FIX[k];if(!f)return null;
  if(y<2026&&(k==='05-01'||k==='07-17'))return null;
  return f;
}
// 음력: 기기에 있는 한국 음력(단기) 달력으로 계산 (인터넷 안 씀)
const LUNAR_OK=(()=>{try{const p=new Intl.DateTimeFormat('en-u-ca-dangi',{month:'numeric',day:'numeric'}).formatToParts(new Date(2026,1,17));return p.some(x=>x.type==='month'&&x.value==='1')&&p.some(x=>x.type==='day'&&x.value==='1')}catch(e){return false}})();
const lunarCache=new Map();
function lunarOf(s){
  if(!LUNAR_OK)return null;
  if(lunarCache.has(s))return lunarCache.get(s);
  let r=null;
  try{const p=new Intl.DateTimeFormat('en-u-ca-dangi',{month:'numeric',day:'numeric'}).formatToParts(parse(s));
    const mo=(p.find(x=>x.type==='month')||{}).value||'',dd=(p.find(x=>x.type==='day')||{}).value||'';
    const m=parseInt(mo,10),d=parseInt(dd,10);if(m>=1&&m<=12&&d>=1&&d<=30)r={m,d,leap:/bis/.test(mo)}}catch(e){}
  if(lunarCache.size>3000)lunarCache.clear();
  lunarCache.set(s,r);return r;
}
function labelsOf(s){
  const out=[];const k=s.slice(5);
  const hl=holOf(s);if(hl)out.push({t:hl,c:'hol'});
  if(data().settings.hol&&MEMO[k])out.push({t:MEMO[k],c:'memo'});
  let L;
  for(const a of data().annivs){
    if(a.lunar){if(L===undefined)L=lunarOf(s);if(L&&!L.leap&&L.m===a.lm&&L.d===a.ld&&s>=a.date.slice(0,4)+'-01-01')out.push({t:a.name,c:'ann',a});continue}
    if(a.yearly?a.date.slice(5)===k:a.date===s)out.push({t:a.name,c:'ann',a})}
  return out;
}

// 저장 (이 기기에만)
let real=blank();
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Array.isArray(v.tasks)){real=Object.assign(blank(),v);real.settings=Object.assign(blank().settings,{tagColor:undefined,palV:1},v.settings||{})}}catch(e){}
// 예전 버전 데이터 고치기: 매주 반복이 요일 하나였던 것 → 여러 요일
for(const r of real.reps){if(r.type==='week'&&!Array.isArray(r.dows))r.dows=[r.dow|0]}
if(!Array.isArray(real.annivs))real.annivs=[];
if(!real.logs||typeof real.logs!=='object'||Array.isArray(real.logs))real.logs={};
if(!real.ents||typeof real.ents!=='object'||Array.isArray(real.ents))real.ents={};
{const S=real.settings;if(!Array.isArray(S.tags)||!S.tags.length)S.tags=['회사','집','약속'];S.tags=S.tags.slice(0,8);
 if(!Array.isArray(S.tagColor))S.tagColor=[];S.tags.forEach((_,i)=>{if(!(S.tagColor[i]>=0&&S.tagColor[i]<8))S.tagColor[i]=i%8});S.tagColor.length=S.tags.length
 if(S.palV!==2){const MAP=[4,3,1,6,5,2,3,7];S.tagColor=S.tagColor.map(o=>MAP[o]);S.palV=2} // 예전 색(파랑·청록·주황·분홍·보라·노랑·초록·회색) → 가장 비슷한 새 색
}
let demo=null;
const data=()=>demo||real;
function save(){quickCache=null;if(demo)return;try{localStorage.setItem(KEY,JSON.stringify(real))}catch(e){}syncNative()}
const byOrd=(a,b)=>(a.ord??1e9)-(b.ord??1e9);
const byTime=(a,b)=>(a.time||'99')<(b.time||'99')?-1:(a.time||'99')>(b.time||'99')?1:0;
// 위젯·알림이 쓸 오늘부터 2주치 할 일만 앱(네이티브)에 넘긴다
function syncNative(){
  if(!B)return;
  try{
    const days={};const base=parse(todayS());
    for(let i=0;i<14;i++){const x=new Date(base);x.setDate(base.getDate()+i);const s=ymd(x);
      days[s]=real.tasks.filter(t=>t.day===s).sort(byTime).slice(0,30).map(t=>({id:t.id,text:((t.time?t.time+' ':'')+t.text).slice(0,60),done:!!t.done}))}
    const t0=todayS(),L=real.logs[t0]||{},filled=[];
    for(let hh=0;hh<24;hh++){let n=0;for(let k=0;k<6;k++)if(L[hh*6+k])n++;if(n>=3)filled.push(hh)} // 반 이상 적은 시간은 안 물어봄
    const S=real.settings;
    B.sync(JSON.stringify({days,alarm:!!S.alarm,time:S.time,hourly:!!S.hourly,hFrom:S.hFrom|0,hTo:S.hTo|0,filledDay:t0,filled}));
  }catch(e){}
}
// 위젯에서 체크한 것을 앱 데이터에 반영
function applyWidgetOps(){
  if(!B)return;
  let ops=[];try{ops=JSON.parse(B.takeOps()||'[]')}catch(e){}
  if(!Array.isArray(ops)||!ops.length)return;
  for(const o of ops){const t=real.tasks.find(x=>x.id===o.id);if(!t||typeof o.done!=='boolean')continue;
    t.done=o.done;t.doneAt=o.done?(isDate(o.at)?o.at:todayS()):null}
  save();
}

const now=new Date();
let st={tab:'monthly',y:now.getFullYear(),m:now.getMonth(),week:null,day:todayS(),sel:todayS(),addTag:null,pick:null};

function weeksOf(y,m){
  const first=new Date(y,m,1),last=new Date(y,m+1,0);
  const s=new Date(first);s.setDate(1-((first.getDay()+6)%7));
  const out=[];
  for(let d=new Date(s);d<=last;d.setDate(d.getDate()+7)){
    const days=[];for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()+i);days.push(ymd(x))}
    out.push(days);
  }
  return out;
}
const mKey=()=>st.y+'-'+pad(st.m+1);
function weekOfDay(s){const d=parse(s);return weeksOf(d.getFullYear(),d.getMonth()).findIndex(w=>w.includes(s))}
function curWeekIdx(){const ws=weeksOf(st.y,st.m);const i=ws.findIndex(w=>w.includes(todayS()));return i<0?0:i}
const isThisMonth=()=>mKey()===mkOf(todayS());
function setDay(t,s){t.day=s;if(s){t.month=mkOf(s);t.week=weekOfDay(s)}}

// 할 일이 끝나야 하는 마지막 날 (날짜 > 주차 > 달)
function dueEnd(t){
  if(t.day)return t.day;
  const[y,m]=t.month.split('-').map(Number);
  if(t.week!=null){const w=weeksOf(y,m-1)[t.week];if(w)return w[6]}
  return ymd(new Date(y,m,0));
}
const isLate=t=>!t.done&&!t.rep&&dueEnd(t)<todayS();
const lateList=()=>data().tasks.filter(isLate);

// 반복 할 일: 보고 있는 달에 필요한 만큼만 만든다
function repHits(r,s){const last=new Date(+s.slice(0,4),+s.slice(5,7),0).getDate();
  return r.type==='week'?r.dows.includes(dowOf(s)):+s.slice(8)===Math.min(r.dom,last)}
function ensureRepeats(y,m){
  const D=data();if(!D.reps.length)return;
  const last=new Date(y,m+1,0).getDate();let changed=false;
  for(const r of D.reps){
    for(let i=1;i<=last;i++){
      const s=ymd(new Date(y,m,i));
      if(s<r.start||!repHits(r,s)||(r.skip||[]).includes(s))continue;
      if(D.tasks.some(t=>t.rep===r.id&&t.day===s))continue;
      D.tasks.push({id:uid(),text:r.text,tag:r.tag,rep:r.id,month:mkOf(s),week:weekOfDay(s),day:s,time:r.time||null,done:false,doneAt:null});changed=true;
    }
  }
  if(changed)save();
}
function repLabel(r){
  if(r.type==='month')return '매달 '+r.dom+'일';
  const d=[...r.dows].sort();return d.length===7?'매일':d.length===5&&d.join()==='0,1,2,3,4'?'평일마다':'매주 '+d.map(i=>DOW[i]).join('·');
}

function h(tag,a,...kids){const e=document.createElement(tag);
  if(a)for(const k in a){if(k==='on')for(const ev in a.on)e.addEventListener(ev,a.on[ev]);else if(k==='class')e.className=a[k];else if(k==='text')e.textContent=a[k];else if(a[k]!=null)e.setAttribute(k,a[k])}
  for(const c of kids.flat(Infinity)){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c))}
  return e}
let toastT;function toast(msg,undo){const old=document.querySelector('.toast');if(old)old.remove();
  const t=h('div',{class:'toast'+(undo?' has-undo':'')},h('span',{text:msg}),undo?h('button',{type:'button',text:'되돌리기',on:{click:()=>{t.remove();undo()}}}):null);
  document.body.append(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),undo?3500:1800)}
// 할 일 하나를 되돌릴 수 있게 지금 상태 기억
function snap(t){const o=JSON.parse(JSON.stringify(t));return ()=>{const D=data();const cur=D.tasks.find(x=>x.id===o.id);if(cur)Object.assign(cur,o);else D.tasks.push(o);save();rerender()}}
function rerender(){const pd=popDay;render();if(pd&&st.tab==='monthly')showPop(pd)}
const svg=p=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.8');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');const pa=document.createElementNS('http://www.w3.org/2000/svg','path');pa.setAttribute('d',p);s.append(pa);return s};
const GEAR='M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M19 12l2-1-1-3-2 .3-1.3-1.3.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6 7.3 4 7 3 10l2 1v2l-2 1 1 3 2-.3 1.3 1.3-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z';

// "3시 병원", "오후 2시반 회의", "15:00 운동" → 시간과 할 일로 나눔
function splitTime(line){
  const m=line.match(/^(오전|오후|아침|저녁|밤)?\s*(\d{1,2})(?:\s*:\s*(\d{2})|\s*시(?:\s*(반|\d{1,2})\s*분?)?)\s+(.+)$/);
  if(!m)return {text:line,time:null};
  let hh=+m[2],mm=m[3]!=null?+m[3]:m[4]==='반'?30:m[4]?+m[4]:0;
  const ap=m[1];
  if((ap==='오후'||ap==='저녁'||ap==='밤')&&hh<12)hh+=12;
  else if(ap==='오전'&&hh===12)hh=0;
  else if(!ap&&m[3]==null&&hh>=1&&hh<=6)hh+=12; // "3시 병원" → 오후 3시
  if(hh>23||mm>59)return {text:line,time:null};
  return {text:m[5].trim(),time:pad(hh)+':'+pad(mm)};
}
function addTasks(text,extra){
  const lines=text.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>s.slice(0,200));
  if(!lines.length){toast('할 일을 적어 주세요');return 0}
  for(const l of lines){const p=splitTime(l);
    data().tasks.push(Object.assign({id:uid(),text:p.text,tag:st.addTag,rep:null,month:mKey(),week:null,day:null,time:p.time,done:false,doneAt:null},extra||{}))}
  save();return lines.length;
}
function toggle(t){const u=snap(t);t.done=!t.done;t.doneAt=t.done?todayS():null;save();rerender();toast(t.done?md(t.doneAt)+' 완료로 기록했어요':'완료를 취소했어요',u)}
const tagName=i=>data().settings.tags[i];
const tagIdx=()=>data().settings.tags.map((_,i)=>i);
const colOf=i=>{const c=data().settings.tagColor;return c&&c[i]!=null?c[i]:i%8};
const hasTag=t=>t.tag!=null&&t.tag<data().settings.tags.length;
const COLORS=['빨강','주황','노랑','초록','파랑','보라','분홍','회색'];

function taskRow(t,extra,opt){
  const tags=[];
  if(t.done)tags.push(h('span',{class:'tag',text:md(t.doneAt)+' 완료'}));
  else if(isLate(t))tags.push(h('span',{class:'tag late',text:'밀림 '+md(dueEnd(t))}));
  else if(t.day&&!(opt&&opt.noDay))tags.push(h('span',{class:'tag day',text:md(t.day)}));
  return h('div',{class:'row'+(t.done?' done':'')+(hasTag(t)?' g'+colOf(t.tag):''),'data-tid':t.id,'data-drop':opt&&opt.drop?'before:'+t.id:null},
    h('div',{class:'top'},h('button',{class:'txt',type:'button','aria-pressed':t.done?'true':'false','aria-label':t.text+(t.done?' (완료)':'')+' · 누르면 줄 긋기, 길게 누르면 고치기',on:{click:()=>toggle(t),contextmenu:e=>{e.preventDefault();if(DR.on||Date.now()<DR.until)return;editSheet(t)}}},
      t.time&&!(opt&&opt.noTime)?h('span',{class:'tm',text:t.time}):null,t.text,t.rep?h('span',{class:'rp',text:'↻'}):null),tags),extra||null);
}
function timeChip(t){return h('button',{type:'button',class:'chip'+(t.time?' on':''),text:t.time?'⏰ '+t.time:'⏰ 시간',on:{click:()=>timeSheet(t)}})}
function tagPicker(){
  return h('div',{class:'tags'},h('span',{class:'lb',text:'카테고리'}),
    [null,...tagIdx()].map(i=>h('button',{type:'button',class:'chip'+(st.addTag===i?' on':''),on:{click:()=>{st.addTag=i;render()}}},i==null?'없음':[h('i',{class:'c'+colOf(i)}),tagName(i)])));
}
// 밀린 일 옮기기 (탭마다 같은 기능, 옮겨지는 곳만 다름)
function lateBox(where){
  const L=lateList();if(!L.length)return null;
  const t0=todayS();const label={month:'이번 달로',week:'이번 주로',day:'오늘로'}[where];
  return h('div',{class:'late-box'},h('span',null,'못 한 일 ',h('b',{text:L.length+'개'}),'가 밀려 있어요'),
    h('button',{class:'go',type:'button',style:'padding:6px 12px;font-size:13px',text:label,on:{click:()=>{
      for(const t of L){t.month=mkOf(t0);t.week=where==='month'?null:weekOfDay(t0);t.day=where==='day'?t0:null}
      save();render();toast(L.length+'개를 '+label+' 옮겼어요')}}}));
}
function labelSpans(s,cls){return labelsOf(s).map(l=>h('span',{class:(cls||'lab')+' '+l.c,text:l.t}))}

// ── 실제로 한 시간 기록 (10분 칸): 값은 할 일 id 또는 'e:직접 쓴 기록 id'
const ents=()=>{const D=data();if(!D.ents)D.ents={};return D.ents};
function logItem(v){
  if(!v)return null;
  if(v.startsWith('e:')){const e=ents()[v.slice(2)];return e?{kind:'e',id:v.slice(2),text:e.text,tag:e.tag}:null}
  const t=data().tasks.find(x=>x.id===v);return t?{kind:'t',id:v,text:t.text,tag:t.tag,t}:null;
}
const okTag=tag=>tag!=null&&tag<data().settings.tags.length;
const itemCls=it=>okTag(it.tag)?'c'+colOf(it.tag):'cn';
const slotT=n=>pad(Math.floor(n/6))+':'+pad(n%6*10);
const hm=m=>m<=0?'0분':(m>=60?Math.floor(m/60)+'시간':'')+(m%60?(m>=60?' ':'')+m%60+'분':'');
function runOf(L,slot){const v=L[slot];let a=slot,b=slot;while(a>0&&L[a-1]===v)a--;while(b<143&&L[b+1]===v)b++;return [a,b]}
function statsFor(days){
  const D=data(),items={},cats={};let total=0;
  for(const d of days){const L=(D.logs||{})[d];if(!L)continue;
    for(const k in L){const it=logItem(L[k]);if(!it)continue;total+=10;
      const key=it.kind==='t'?it.id:'e|'+it.tag+'|'+it.text;
      (items[key]=items[key]||{text:it.text,tag:it.tag,min:0}).min+=10;
      const ck=okTag(it.tag)?it.tag:'n';cats[ck]=(cats[ck]||0)+10}}
  // 계획(시간 정한 할 일) 중 실제로 한 것: 완료했거나 칸을 칠한 것
  const planned=D.tasks.filter(t=>t.time&&days.includes(t.day));
  const did=planned.filter(t=>t.done||Object.values((D.logs||{})[t.day]||{}).includes(t.id));
  return {total,items:Object.values(items).sort((a,b)=>b.min-a.min),cats,planned:planned.length,did:did.length};
}
// 데일리를 그림(PNG)으로: 다이어리 인증용. 인터넷 안 씀, 폰 안에서 그림
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'}
function dayImage(d){
  const D=data(),S=D.settings,L=D.logs[d]||{};
  const ts=D.tasks.filter(t=>t.day===d),timed=ts.filter(t=>t.time).sort(byTime),untimed=ts.filter(t=>!t.time);
  let h0=S.early?0:7,h1=S.late?23:22;
  for(const t of timed){const x=+t.time.slice(0,2);if(x<h0)h0=x;if(x>h1)h1=x}
  for(const k in L){const x=Math.floor(+k/6);if(x<h0)h0=x;if(x>h1)h1=x}
  const W=1080,RH=56,top=220+(untimed.length?60+Math.ceil(untimed.length/2)*44:0),H=top+(h1-h0+1)*RH+190;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const C={bg:cssVar('--paper'),card:cssVar('--card'),ink:cssVar('--ink'),mu:cssVar('--muted'),line:cssVar('--line'),acc:cssVar('--cobalt')};
  const col=it=>it&&okTag(it.tag)?cssVar('--t'+colOf(it.tag)):C.mu;
  const F='system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  g.fillStyle=C.bg;g.fillRect(0,0,W,H);
  const dt=parse(d);
  g.fillStyle=C.acc;g.font='800 120px '+F;g.fillText(String(dt.getDate()),60,150);
  g.fillStyle=C.ink;g.font='800 44px '+F;g.fillText(dt.getFullYear()+'. '+(dt.getMonth()+1)+'. '+DOW[dowOf(d)]+'요일',260,105);
  g.fillStyle=C.mu;g.font='500 30px '+F;g.fillText(labelsOf(d).map(l=>l.t).join(' · ')||'덤푸 10분 플래너',260,150);
  let y=200;
  if(untimed.length){g.fillStyle=C.mu;g.font='700 28px '+F;g.fillText('시간 안 정한 할 일',60,y+30);y+=60;
    untimed.forEach((t,i)=>{const x=60+(i%2)*490,yy=y+Math.floor(i/2)*44;g.fillStyle=hasTag(t)?cssVar('--t'+colOf(t.tag)):C.mu;g.fillRect(x,yy-24,6,30);
      g.fillStyle=t.done?C.mu:C.ink;g.font='600 28px '+F;const tx=t.text.slice(0,16);g.fillText(tx,x+18,yy);
      if(t.done){const tw=g.measureText(tx).width;g.fillRect(x+18,yy-10,tw,3)}});}
  y=top;
  const PX=60,PW=540,HX=PX+PW,HW=60,GX=HX+HW+10,CW=(W-60-GX)/6;
  g.strokeStyle=C.line;g.lineWidth=2;
  for(let hh=h0;hh<=h1;hh++){const ry=y+(hh-h0)*RH;
    g.beginPath();g.moveTo(PX,ry);g.lineTo(W-60,ry);g.stroke();
    g.fillStyle=C.ink;g.font='800 28px '+F;g.textAlign='center';g.fillText(String(hh),HX+HW/2,ry+38);g.textAlign='left';
    const plans=timed.filter(t=>+t.time.slice(0,2)===hh).map(t=>({tx:t.time+' '+t.text,c:hasTag(t)?cssVar('--t'+colOf(t.tag)):C.ink,done:t.done}));
    for(let k=0;k<6;k++){const sl=hh*6+k,v=L[sl];if(v&&v.startsWith('e:')&&L[sl-1]!==v){const it=logItem(v);if(it)plans.push({tx:'✎ '+slotT(sl)+' '+it.text,c:col(it)})}}
    plans.slice(0,1).forEach(p=>{g.fillStyle=p.done?C.mu:p.c;g.font='600 26px '+F;const tx=p.tx.slice(0,20)+(plans.length>1?' 외 '+(plans.length-1):'');g.fillText(tx,PX+8,ry+37);if(p.done){g.fillRect(PX+8,ry+28,g.measureText(tx).width,3)}});
    for(let k=0;k<6;k++){const it=logItem(L[hh*6+k]);const x=GX+k*CW+3,yy=ry+8;
      g.fillStyle=it?col(it):C.card;g.fillRect(x,yy,CW-6,RH-16);g.strokeStyle=C.line;g.strokeRect(x,yy,CW-6,RH-16)}}
  g.beginPath();g.moveTo(PX,y+(h1-h0+1)*RH);g.lineTo(W-60,y+(h1-h0+1)*RH);g.stroke();
  g.beginPath();g.moveTo(HX,y);g.lineTo(HX,y+(h1-h0+1)*RH);g.stroke();
  const St=statsFor([d]);let sy=y+(h1-h0+1)*RH+60;
  g.fillStyle=C.ink;g.font='800 32px '+F;g.fillText('실제로 한 시간 '+hm(St.total)+(St.planned?'  ·  계획 '+St.did+'/'+St.planned+' ('+Math.round(St.did/St.planned*100)+'%)':''),60,sy);
  g.font='500 26px '+F;g.fillStyle=C.mu;g.fillText(St.items.slice(0,4).map(x=>x.text.slice(0,8)+' '+hm(x.min)).join('  ·  '),60,sy+46);
  g.textAlign='right';g.fillText('덤푸',W-60,H-30);g.textAlign='left';
  const url=c.toDataURL('image/png');
  const close=sheet(h('h3',{text:md(d)+' 이미지'}),h('img',{src:url,alt:md(d)+' 10분 플래너 그림',class:'shot'}),
    B&&B.saveImage?[
      h('button',{class:'btn pri',type:'button',text:'사진첩에 저장',on:{click:()=>{const r=B.saveImage(url.split(',')[1],false);toast(r==='ok'?'사진첩(Pictures/덤푸)에 저장했어요':r==='old'?'이 폰(안드로이드 9 이하)에서는 저장이 안 돼요':'저장하지 못했어요')}}}),
      h('button',{class:'btn',type:'button',text:'공유하기 (카톡·인스타 등)',on:{click:()=>{const r=B.saveImage(url.split(',')[1],true);if(r!=='ok')toast(r==='old'?'이 폰에서는 공유가 안 돼요':'공유하지 못했어요')}}})]:
    [h('button',{class:'btn pri',type:'button',text:'이미지 저장·공유',on:{click:()=>{c.toBlob(bl=>{if(!bl)return;const f=new File([bl],'dumpu-'+d+'.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:'덤푸 '+md(d)}).catch(()=>{});
        else{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=f.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}})}}}),
     h('p',{text:'아이폰은 사진을 길게 눌러 "사진에 저장"해도 돼요.'})]);
}
// 한 주 10분 기록 모아 보기 (잠·일·운동 패턴)
function weekGrid(w){
  const D=data(),S=D.settings;
  if(!w.some(d=>D.logs[d]&&Object.keys(D.logs[d]).length))return null;
  let h0=S.early?0:7,h1=S.late?23:22;
  for(const d of w){const L=D.logs[d]||{};for(const k in L){const hh=Math.floor(+k/6);if(hh<h0)h0=hh;if(hh>h1)h1=hh}}
  const t0=todayS();
  const g=h('div',{class:'wg'},h('div',{class:'wg-r wg-head'},h('span'),w.map((d,i)=>h('button',{type:'button',class:'wg-d'+(d===t0?' tdy':''),text:DOW[i]+' '+parse(d).getDate(),on:{click:()=>{st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}}))));
  for(let hh=h0;hh<=h1;hh++){
    g.append(h('div',{class:'wg-r'},h('span',{class:'wg-h',text:String(hh)}),
      w.map(d=>{const L=D.logs[d]||{};return h('span',{class:'wg-c'},[0,1,2,3,4,5].map(k=>{const it=logItem(L[hh*6+k]);return h('i',{class:it?itemCls(it):''})}))})));
  }
  return [h('div',{class:'sec',text:'이번 주 10분 기록 · 요일을 누르면 그 날로'}),g];
}
// 자주 쓴 직접 기록 (최근 60일, 많이 쓴 순 5개) → 한 번 누르고 쓸기만
let quickCache=null;
function quickList(){
  if(quickCache)return quickCache;
  const D=data(),cnt={},meta={};const from=ymd(new Date(Date.now()-60*864e5));
  for(const d in D.logs){if(d<from)continue;const L=D.logs[d];
    for(const k in L){const v=L[k];if(!v.startsWith('e:'))continue;const e=ents()[v.slice(2)];if(!e)continue;
      if(okTag(e.tag)&&e.text===tagName(e.tag))continue; // 카테고리로 칠한 건 빼기
      const key=e.tag+'|'+e.text;cnt[key]=(cnt[key]||0)+1;meta[key]={text:e.text,tag:e.tag}}}
  quickCache=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,5).map(k=>meta[k]);
  return quickCache;
}
function actualBox(days,label){
  const S=statsFor(days);
  if(!S.total&&!S.planned)return null;
  const catKeys=Object.keys(S.cats).sort((a,b)=>S.cats[b]-S.cats[a]);
  return h('div',{class:'tsum'},
    h('b',{text:label+' 실제로 한 시간 '+hm(S.total)}),
    S.planned?h('span',{class:'ratio'},'계획 '+S.planned+'개 중 '+S.did+'개 했어요 ',h('em',{text:Math.round(S.did/S.planned*100)+'%'})):null,
    S.total?h('div',{class:'bars'},catKeys.map(k=>h('i',{class:k==='n'?'cn':'c'+colOf(+k),style:'flex:'+S.cats[k],title:(k==='n'?'카테고리 없음':tagName(+k))+' '+hm(S.cats[k])}))):null,
    catKeys.map(k=>h('span',null,h('i',{class:k==='n'?'cn':'c'+colOf(+k)}),(k==='n'?'없음':tagName(+k))+' '+hm(S.cats[k]))),
    S.items.length?h('small',{text:'많이 한 것: '+S.items.slice(0,3).map(x=>x.text.slice(0,10)+' '+hm(x.min)).join(' · ')}):null);
}

// ── 달력 (먼슬리 위쪽)
function calGrid(){
  const ws=weeksOf(st.y,st.m);const t0=todayS();const all=data().tasks;
  const grid=h('div',{class:'cal'+(st.pick?' picking':'')},DOW.map((x,i)=>h('div',{class:'dow'+(i===6?' sun':i===5?' sat':''),text:x})));
  ws.flat().forEach(d=>{const dt=parse(d);const out=dt.getMonth()!==st.m;
    const onDay=all.filter(t=>t.day===d);
    const routine=onDay.filter(t=>t.rep).sort(byTime);
    const plain=onDay.filter(t=>!t.rep).sort(byTime);
    const doneOther=all.filter(t=>t.done&&t.doneAt===d&&t.day!==d&&!t.rep);
    const todo=plain.filter(t=>!t.done);
    const labs=labelsOf(d);const red=dowOf(d)===6||labs.some(l=>l.c==='hol');
    const dots=[...plain,...doneOther];
    grid.append(h('button',{type:'button',class:(out?'out ':'')+(d===t0?'today ':'')+(d===st.sel&&!st.pick?'sel ':'')+(red?'red ':dowOf(d)===5?'blue ':''),
      'data-d':d,'data-drop':'day:'+d,'aria-label':md(d)+(labs.length?' '+labs.map(l=>l.t).join(' '):'')+' 할 일 '+todo.length+'개, 루틴 '+routine.filter(t=>t.done).length+'/'+routine.length+', 완료 '+dots.filter(t=>t.done).length+'개',on:{click:()=>calTap(d)}},
      h('span',{class:'dl'},h('span',{class:'d',text:String(dt.getDate())}),labs.length?h('span',{class:'lab '+labs[0].c,text:labs[0].t}):null),
      todo.length?h('span',{class:'mini p'+(hasTag(todo[0])?' tc'+colOf(todo[0].tag):''),text:todo[0].text}):null,
      routine.length?h('span',{class:'rt-row'},routine.slice(0,5).map(t=>h('i',{class:'rt'+(t.done?' on':'')+' tc'+(hasTag(t)?colOf(t.tag):'n'),text:t.done?'♥':'♡'}))):null,
      dots.length?h('span',{class:'mk'},dots.slice(0,6).map(t=>h('i',{class:(t.done?'':'p ')+(hasTag(t)?'c'+colOf(t.tag):'cn')}))):null))});
  return grid;
}
function calTap(d){
  const dt=parse(d);
  if(st.pick){const t=data().tasks.find(x=>x.id===st.pick);st.pick=null;
    if(t){if(t.rep){const r=data().reps.find(x=>x.id===t.rep);if(r)r.skip=(r.skip||[]).concat(t.day);t.rep=null}
      setDay(t,d);save();st.sel=d;render();toast('"'+t.text.slice(0,12)+'" '+md(d)+'로 정했어요');return}}
  if(popDay===d&&document.querySelector('.pop')){closePop();return}
  st.sel=d;if(dt.getMonth()!==st.m){st.y=dt.getFullYear();st.m=dt.getMonth();st.week=null}render();showPop(d);
}
// 날짜를 누르면 그 날짜 위에 작은 말풍선: 그 날 할 일 몇 개
let popDay=null;
function closePop(){const p=document.querySelector('.pop');if(p)p.remove();popDay=null}
function showPop(d){
  closePop();
  const top=document.querySelector('.mtop'),cell=document.querySelector('.cal button[data-d="'+d+'"]');
  if(!top||!cell)return;
  popDay=d;
  const all=data().tasks;
  const ts=all.filter(t=>t.day===d).sort((a,b)=>(a.done-b.done)||byTime(a,b));
  const dn=all.filter(t=>t.done&&t.doneAt===d&&t.day!==d);
  const list=[...ts,...dn];
  const labs=labelsOf(d);
  const pop=h('div',{class:'pop',role:'dialog','aria-label':md(d)+' 할 일'},
    h('div',{class:'pop-h'},h('b',{text:md(d)}),labs.map(l=>h('span',{class:'lab '+l.c,text:l.t}))),
    list.length?list.slice(0,4).map(t=>h('div',{class:'pop-r'+(t.done?' done':'')+(hasTag(t)?' g'+colOf(t.tag):''),'data-tid':t.id},
      h('button',{type:'button',class:'pop-t','aria-pressed':t.done?'true':'false',on:{click:e=>{e.stopPropagation();toggle(t)},contextmenu:e=>{e.preventDefault();if(DR.on||Date.now()<DR.until)return;closePop();editSheet(t)}}},t.time?h('span',{class:'tm',text:t.time}):null,t.text))):h('p',{class:'pop-e',text:'할 일이 없어요'}),
    list.length?h('p',{class:'pop-e',text:'길게 눌러 다른 날짜로 끌어요'}):null,
    list.length>4?h('p',{class:'pop-e',text:'+'+(list.length-4)+'개 더'}):null,
    h('div',{class:'pop-a'},
      h('button',{type:'button',text:'+ 할 일',on:{click:e=>{e.stopPropagation();closePop();quickAdd(d)}}}),
      h('button',{type:'button',text:'+ 기념일',on:{click:e=>{e.stopPropagation();closePop();annivSheet(d)}}}),
      h('button',{type:'button',text:'데일리 ›',on:{click:e=>{e.stopPropagation();closePop();st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}})));
  top.append(pop);
  // 날짜 위에 놓고, 위에 자리가 없으면 아래에
  const tr=top.getBoundingClientRect(),cr=cell.getBoundingClientRect();
  const pw=pop.offsetWidth,ph=pop.offsetHeight;
  let x=cr.left+cr.width/2-tr.left-pw/2;x=Math.max(4,Math.min(x,tr.width-pw-4));
  let y=cr.top-tr.top-ph-8,below=false;
  if(cr.top-ph-8<tr.top+40){y=cr.bottom-tr.top+8;below=true}
  pop.style.left=x+'px';pop.style.top=y+'px';
  pop.style.setProperty('--ax',(cr.left+cr.width/2-tr.left-x)+'px');
  pop.classList.add(below?'below':'above');
}
document.addEventListener('click',e=>{if(popDay&&!e.target.closest('.pop,.cal'))closePop()},true);
window.addEventListener('scroll',()=>{if(popDay&&!document.querySelector('.mtop'))closePop()},{passive:true});
// 말풍선의 '+ 할 일': 그 날짜에 바로 적기
function quickAdd(d){
  const ci=h('input',{id:'qAdd',placeholder:'예: 3시 병원 (줄바꿈 없이 한 개)',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(ci.value,{month:mkOf(d),week:weekOfDay(d),day:d});if(n){close();render();showPop(d);toast(md(d)+'에 추가했어요')}}
  const close=sheet(h('h3',{text:md(d)+'에 추가'}),ci,h('button',{class:'btn pri',type:'button',text:'추가',on:{click:go}}));
  setTimeout(()=>ci.focus(),50);
}

// ── 먼슬리 (위에 달력 고정 + 아래 한 달 할 일)
function vMonthly(){
  const ws=weeksOf(st.y,st.m);
  const all=data().tasks;
  const ts=all.filter(t=>t.month===mKey()&&!t.rep);
  const reps=all.filter(t=>t.month===mKey()&&t.rep);
  const pickT=st.pick?all.find(x=>x.id===st.pick):null;
  // 한 달 할 일
  const ta=h('textarea',{id:'mAdd',rows:'4',placeholder:'이번 달 할 일을 한 줄에 하나씩 우다다 적어요\n예: 병원 예약\n    보고서 제출'});
  const box=[h('div',{class:'sec',text:'이번 달 할 일 적기'}),h('div',{class:'add'},ta,h('button',{class:'go',type:'button',text:'추가',on:{click:()=>{const n=addTasks(ta.value);if(n){ta.value='';render();toast(n+'개 추가했어요')}}}})),
    tagPicker(),h('p',{class:'hint',text:'할 일을 누르면 줄이 그어져요(완료). 길게 누른 채 끌어 달력 날짜에 놓으면 그 날로, 다른 할 일 위에 놓으면 순서가 바뀌어요. 그냥 길게 누르면 고치기.'})];
  const undone=ts.filter(t=>!t.done).sort(byOrd),done=ts.filter(t=>t.done);
  const row=t=>taskRow(t,h('div',{class:'chips'},
    ws.map((w,i)=>h('button',{class:'chip'+(t.week===i&&!t.day?' on':''),type:'button',text:(i+1)+'주',on:{click:()=>{if(t.week===i&&!t.day){t.week=null}else{t.week=i;t.day=null}save();render()}}})),
    h('button',{type:'button',class:'chip'+(t.day?' on':'')+(st.pick===t.id?' pk':''),text:t.day?'📅 '+md(t.day):'📅 날짜',on:{click:()=>{st.pick=st.pick===t.id?null:t.id;render();if(st.pick)document.querySelector('.cal').scrollIntoView({behavior:'smooth',block:'center'})}}}),
    t.day?timeChip(t):null),{drop:!t.done});
  const unassigned=undone.filter(t=>t.week==null&&!t.day).length;
  const repDone=reps.filter(t=>t.done).length;
  // 2. 달력은 위에 고정, 아래 할 일만 스크롤
  return [h('div',{class:'mtop'},head('먼슬리',ts.length?ts.length+'개 중 '+done.length+'개 완료'+(unassigned?' · 안 정한 '+unassigned+'개':''):'달력 보며 할 일 정하기'),
    pickT?h('div',{class:'pickbar'},h('span',null,'"',h('b',{text:pickT.text.slice(0,20)}),'" 언제 할까요? 달력에서 날짜를 눌러 주세요'),h('button',{type:'button',text:'취소',on:{click:()=>{st.pick=null;render()}}})):null,
    calGrid()),
    actualBox(weeksOf(st.y,st.m).flat().filter(x=>mkOf(x)===mKey()),'이번 달'),
    isThisMonth()?lateBox('month'):null,
    box,
    ts.length?null:emptyBox('아직 이번 달 할 일이 없어요.'),
    undone.length?h('div',{class:'list','data-list':'m'},undone.map(row)):null,
    done.length?[h('div',{class:'sec',text:'완료 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    reps.length?h('p',{class:'hint',style:'margin-top:12px',text:'↻ 반복 할 일 '+reps.length+'번 중 '+repDone+'번 했어요 (달력·위클리·데일리에 나와요)'}):null];
}

// ── 위클리
function vWeekly(){
  const ws=weeksOf(st.y,st.m);
  if(st.week==null||st.week>=ws.length)st.week=curWeekIdx();
  const w=ws[st.week];const t0=todayS();
  const ts=data().tasks.filter(t=>t.day?w.includes(t.day):(t.month===mKey()&&t.week===st.week));
  const inp=h('input',{id:'wAdd',placeholder:(st.week+1)+'주차에 바로 추가',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(inp.value,{week:st.week});if(n){render();toast((st.week+1)+'주차에 추가했어요')}}
  const strip=h('div',{class:'strip'},w.map((d,i)=>{const n=data().tasks.filter(t=>t.day===d).length;const labs=labelsOf(d);const red=i===6||labs.some(l=>l.c==='hol');
    return h('button',{type:'button','data-drop':'day:'+d,class:(n?'has ':'')+(d===t0?'tdy ':'')+(red?'red':''),title:labs.map(l=>l.t).join(', '),on:{click:()=>{st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}},DOW[i],h('b',{text:String(parse(d).getDate())}),labs.length?h('small',{class:'lab '+labs[0].c,text:labs[0].t}):null)}));
  const row=t=>taskRow(t,h('div',{class:'chips'},w.map((d,i)=>h('button',{class:'chip'+(t.day===d?' on':''),type:'button',text:DOW[i],'aria-label':md(d)+'로 보내기',on:{click:()=>{
      if(t.day===d){t.day=null}else{if(t.rep){const r=data().reps.find(x=>x.id===t.rep);if(r)r.skip=(r.skip||[]).concat(t.day);t.rep=null}setDay(t,d)}save();render()}}})),
    t.day?timeChip(t):null));
  const sorted=ts.slice().sort((a,b)=>(a.day||'9')<(b.day||'9')?-1:(a.day||'9')>(b.day||'9')?1:byTime(a,b));
  const undone=sorted.filter(t=>!t.done),done=sorted.filter(t=>t.done);
  const fromMonth=data().tasks.filter(t=>t.month===mKey()&&t.week==null&&!t.day&&!t.done&&!t.rep);
  const isNow=w.includes(t0);
  return [head('위클리',(st.week+1)+'주차 · '+(parse(w[0]).getMonth()+1)+'/'+parse(w[0]).getDate()+'~'+(parse(w[6]).getMonth()+1)+'/'+parse(w[6]).getDate()),
    h('div',{class:'weeks'},ws.map((_,i)=>h('button',{class:'chip'+(i===st.week?' on':''),type:'button',text:(i+1)+'주차',on:{click:()=>{st.week=i;render()}}}))),
    isNow?lateBox('week'):null,strip,actualBox(w,'이번 주'),weekGrid(w),
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    ts.length?null:emptyBox('이 주에 정리된 할 일이 없어요. 먼슬리에서 주 버튼을 누르거나 위에 바로 적어요.'),
    undone.length?[h('div',{class:'sec',text:'할 일 '+undone.length+' · 요일 버튼이나 위 날짜 칸으로 끌어서 데일리로'}),h('div',{class:'list'},undone.map(row))]:null,
    done.length?[h('div',{class:'sec',text:'다 했어요 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    fromMonth.length?[h('div',{class:'sec',text:'먼슬리에서 가져오기 '+fromMonth.length}),h('div',{class:'list'},fromMonth.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이번 주로',on:{click:()=>{t.week=st.week;save();render()}}})))))]:null];
}

// ── 데일리 (시간 안 정한 일 + 타임라인)
function vDaily(){
  const d=st.day;const dt=parse(d);
  if(dt.getFullYear()!==st.y||dt.getMonth()!==st.m){st.y=dt.getFullYear();st.m=dt.getMonth();st.week=null;ensureRepeats(st.y,st.m)}
  const wi=weekOfDay(d);
  const ts=data().tasks.filter(t=>t.day===d);
  const untimed=ts.filter(t=>!t.time).sort(byOrd),timed=ts.filter(t=>t.time).sort(byTime);
  const doneHere=data().tasks.filter(t=>t.done&&t.doneAt===d&&t.day!==d);
  const inp=h('input',{id:'dAdd',placeholder:'예: 3시 병원, 9:30 회의, 장보기',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(inp.value,{week:wi,day:d,month:mkOf(d)});if(n){render();toast('추가했어요')}}
  const shift=k=>{const x=parse(d);x.setDate(x.getDate()+k);st.day=ymd(x);render()};
  const fromWeek=data().tasks.filter(t=>t.month===mkOf(d)&&t.week===wi&&!t.day&&!t.done);
  // 10분 플래너: 왼쪽 계획(그 시간 할 일) | 시간 | 오른쪽 10분 칸 6개(실제로 한 시간, 손가락으로 칠하기)
  const S=data().settings;
  const hrs=timed.map(t=>+t.time.slice(0,2));
  const h0=Math.min(S.early?0:7,...hrs),h1=Math.max(S.late?23:22,...hrs);
  const nowH=d===todayS()?new Date().getHours():-1,nowM=new Date().getMinutes();
  const log=(data().logs||{})[d]||{};
  if(st.brush&&!st.brush.startsWith('cat:')&&!st.brush.startsWith('q:')&&!ts.some(t=>t.id===st.brush))st.brush=null;
  if(st.brush&&st.brush.startsWith('cat:')&&!okTag(+st.brush.slice(4)))st.brush=null;
  if(st.brush&&st.brush.startsWith('q:')&&!quickList()[+st.brush.slice(2)])st.brush=null;
  const tt=h('div',{class:'tt','data-day':d},
    h('div',{class:'tt-r tt-head'},h('span',{class:'tt-p',text:'계획 · 기록'}),h('span',{class:'tt-h'}),h('div',{class:'tt-g'},[10,20,30,40,50,60].map(m=>h('span',{class:'cell-l',text:m})))),
    !S.early&&h0>0?h('button',{type:'button',class:'tt-more',text:'▲ 새벽 시간 보기 (0~6시)',on:{click:()=>{S.early=true;save();render()}}}):null);
  for(let hh=h0;hh<=h1;hh++){
    const at=timed.filter(t=>+t.time.slice(0,2)===hh);
    // 이 시간에 시작하는 직접 쓴 기록 (다이어리처럼)
    const notes=[];for(let k=0;k<6;k++){const sl=hh*6+k,v=log[sl];if(v&&v.startsWith('e:')&&log[sl-1]!==v){const it=logItem(v);if(it){const r=runOf(log,sl);notes.push({sl,it,r})}}}
    tt.append(h('div',{class:'tt-r'+(hh===nowH?' now':'')},
      h('div',{class:'tt-p','data-drop':'hour:'+hh},
        at.map(t=>taskRow(t,null,{noDay:true})),
        notes.map(n=>h('button',{type:'button',class:'note-r '+itemCls(n.it).replace('c','tc'),on:{click:()=>writeSheet(d,n.r[0],n.r[1],n.it.id)}},h('span',{class:'tm',text:slotT(n.r[0])}),'✎ '+n.it.text)),
        !at.length&&!notes.length?h('button',{type:'button',class:'tl-add','aria-label':hh+'시에 추가',text:'+',on:{click:()=>{inp.value=hh+':00 ';inp.focus()}}}):null),
      h('span',{class:'tt-h',text:String(hh)}),
      h('div',{class:'tt-g'},[0,1,2,3,4,5].map(k=>{const slot=hh*6+k;const it=logItem(log[slot]);
        return h('span',{class:'cell'+(it?' '+itemCls(it):'')+(hh===nowH&&Math.floor(nowM/10)===k?' cur':''),'data-slot':slot,title:it?slotT(slot)+' '+it.text:slotT(slot)})}))));
  }
  if(!S.late&&h1<23)tt.append(h('button',{type:'button',class:'tt-more',text:'▼ 밤 시간 보기 (23시)',on:{click:()=>{S.late=true;save();render()}}}));
  if(S.early||S.late)tt.append(h('button',{type:'button',class:'tt-more',text:'기본 시간(7~22시)만 보기',on:{click:()=>{S.early=false;S.late=false;save();render()}}}));
  // 칠하기: 직접 쓰기(기본) / 할 일 / 카테고리
  const bchip=(val,label,cls)=>h('button',{type:'button',class:'chip'+(st.brush===val?' on':''),on:{click:()=>{st.brush=st.brush===val?null:val;render()}}},cls?h('i',{class:cls}):null,label);
  const brush=h('div',{class:'brush'},h('span',{class:'lb',text:'칠하기'}),
    h('button',{type:'button',class:'chip'+(st.brush==null?' on':''),on:{click:()=>{st.brush=null;render()}}},'✏️ 직접 쓰기'),
    ts.map(t=>bchip(t.id,t.text.slice(0,10),hasTag(t)?'c'+colOf(t.tag):'cn')),
    quickList().map((q,i)=>bchip('q:'+i,'★ '+q.text.slice(0,8),okTag(q.tag)?'c'+colOf(q.tag):'cn')),
    h('span',{class:'lb',style:'margin-left:4px',text:'·'}),
    tagIdx().map(i=>bchip('cat:'+i,tagName(i),'c'+colOf(i)+' sq')));
  const bName=st.brush==null?null:st.brush.startsWith('q:')?(quickList()[+st.brush.slice(2)]||{text:''}).text:st.brush.startsWith('cat:')?tagName(+st.brush.slice(4)):(data().tasks.find(t=>t.id===st.brush)||{text:''}).text.slice(0,10);
  const sum=actualBox([d],'오늘');
  const labs=labelsOf(d);
  return [h('div',{class:'head'},h('div',{class:'num',text:String(dt.getDate())}),
      h('div',{class:'t'},h('b',{text:'데일리'}),h('span',{text:(dt.getMonth()+1)+'월 '+(wi+1)+'주차 · '+DOW[dowOf(d)]+'요일'+(d===todayS()?' · 오늘':'')}),labs.length?h('div',null,labelSpans(d,'lab big')):null),
      h('div',{class:'nav'},h('button',{type:'button','aria-label':'전날',text:'‹',on:{click:()=>shift(-1)}}),h('button',{type:'button','aria-label':'다음날',text:'›',on:{click:()=>shift(1)}}),gearBtn())),
    d===todayS()?lateBox('day'):null,
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    h('p',{class:'hint',text:'앞에 시간을 쓰면(3시 병원) 타임라인에 들어가요.'},d!==todayS()?[' ',h('button',{type:'button',style:'color:var(--cobalt);font-weight:700',text:'오늘로 가기',on:{click:()=>{st.day=todayS();render()}}})]:null),
    !ts.length?emptyBox('이 날 할 일이 없어요. 위클리에서 요일을 누르거나 위에 바로 적어요.'):null,
    untimed.length||timed.length?[h('div',{class:'sec','data-drop':'notime',text:'시간 안 정함 '+untimed.length+(untimed.length?' · 길게 눌러 아래 계획 칸으로 끌기':'')}),h('div',{class:'list','data-list':'u','data-drop':'notime'},untimed.map(t=>taskRow(t,null,{noDay:true,drop:true})))]:null,
    h('div',{class:'sec'},'10분 플래너 ',h('button',{type:'button',class:'imgbtn',text:'🖼 이미지로 저장·공유',on:{click:()=>dayImage(d)}})),brush,h('p',{class:'hint',style:'margin:0 0 8px',text:bName?'오른쪽 칸을 쓸면 "'+bName+'"(으)로 칠해져요. 같은 걸 칠한 칸을 다시 쓸면 지워져요.':'빈 10분 칸을 쭉 쓸고 무엇을 했는지 적어요 (예: 7:30~8:00 아침밥). 칠한 칸을 누르면 고치거나 지워요.'}),tt,sum,
    doneHere.length?[h('div',{class:'sec',text:'이 날 끝낸 다른 일 '+doneHere.length}),h('div',{class:'list'},doneHere.map(t=>taskRow(t)))]:null,
    fromWeek.length?[h('div',{class:'sec',text:'이번 주에서 가져오기 '+fromWeek.length}),h('div',{class:'list'},fromWeek.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이 날로',on:{click:()=>{setDay(t,d);save();render()}}})))))]:null];
}

function gearBtn(){const b=h('button',{type:'button','aria-label':'설정',on:{click:settingsSheet}});b.append(svg(GEAR));return b}
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function head(title,sub){
  return h('div',{class:'head'},h('div',{class:'num en','aria-label':(st.m+1)+'월',text:MON[st.m]}),
    h('div',{class:'t'},h('b',{text:title}),h('span',{text:st.y+'년 '+(st.m+1)+'월 · '+sub})),
    h('div',{class:'nav'},h('button',{type:'button','aria-label':'이전 달',text:'‹',on:{click:()=>mv(-1)}}),h('button',{type:'button','aria-label':'다음 달',text:'›',on:{click:()=>mv(1)}}),gearBtn()));
}
function mv(k){st.m+=k;if(st.m<0){st.m=11;st.y--}if(st.m>11){st.m=0;st.y++}st.week=null;render()}
function emptyBox(msg){return h('div',{class:'empty'},h('div',{text:msg}),!demo&&!real.tasks.length?h('button',{type:'button',text:'예시로 둘러보기',on:{click:startDemo}}):null)}

function startDemo(){
  const t=todayS();const tm=mkOf(t);const ws=weeksOf(now.getFullYear(),now.getMonth());const wi=weekOfDay(t);const w=ws[wi];
  const mk=(text,o)=>Object.assign({id:uid(),text:'[예시] '+text,tag:null,rep:null,month:tm,week:null,day:null,time:null,done:false,doneAt:null},o);
  const y=parse(t);y.setDate(y.getDate()-1);const ys=ymd(y);
  const lw=parse(t);lw.setDate(lw.getDate()-7);const lws=ymd(lw);
  demo=blank();
  demo.tasks=[mk('병원 예약하기',{week:wi,day:t,time:'15:00',tag:1}),mk('팀 회의',{week:wi,day:t,time:'10:00',tag:0}),mk('보고서 초안',{week:wi,day:w[3],tag:0}),mk('택배 반품',{week:wi,done:true,doneAt:ys,tag:1}),
    mk('엄마 생신 선물',{week:Math.min(wi+1,ws.length-1),tag:2}),mk('자동차 보험 갱신',{}),mk('친구 결혼식 답장',{month:mkOf(lws),week:weekOfDay(lws),day:lws,tag:2})];
  demo.reps=[{id:'r1',text:'[예시] 운동',tag:1,type:'week',dows:[0,2,4],time:'07:00',start:t,skip:[]}];
  const a=parse(t);a.setDate(a.getDate()+3);
  demo.annivs=[{id:'a1',name:'[예시] 아빠 생일',date:ymd(a),yearly:true}];
  st.y=now.getFullYear();st.m=now.getMonth();st.sel=t;ensureRepeats(st.y,st.m);
  render();
}

const ICONS={monthly:'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',weekly:'M4 6h16v12H4z M9 6v12 M14 6v12',daily:'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 8v4l3 2'};
const TABS=[['monthly','먼슬리'],['weekly','위클리'],['daily','데일리']];
function render(){
  popDay=null;
  ensureRepeats(st.y,st.m);
  const app=document.getElementById('app');
  const sx=window.scrollY,foc=document.activeElement&&document.activeElement.id;
  app.replaceChildren(...[
    demo?h('div',{class:'demo'},h('span',{text:'예시로 둘러보는 중 · 저장되지 않아요'}),h('button',{type:'button',text:'나가기',on:{click:()=>{demo=null;st.pick=null;render()}}})):null,
    st.tab==='weekly'?vWeekly():st.tab==='daily'?vDaily():vMonthly()].flat(Infinity).filter(x=>x!=null&&x!==false));
  document.getElementById('tabs').replaceChildren(...TABS.map(([k,l])=>{const b=h('button',{type:'button',class:k===st.tab?'on':'',on:{click:()=>{st.tab=k;st.pick=null;if(k==='weekly'&&st.week==null)st.week=curWeekIdx();window.scrollTo(0,0);render()}}});
    b.append(svg(ICONS[k]),l);return b}));
  if(foc){const e=document.getElementById(foc);if(e)e.focus()}
  window.scrollTo(0,sx);
}

// 창
let closeLayer=null;
function sheet(...kids){const L=document.getElementById('layer');const dim=h('div',{class:'dim',on:{click:e=>{if(e.target===dim)close()}}},h('div',{class:'sheet',role:'dialog'},...kids));
  function close(){L.replaceChildren();closeLayer=null}L.replaceChildren(dim);closeLayer=close;return close}

// 시간 정하기 (위클리·먼슬리·데일리 공통)
function timeSheet(t){
  let hh=t.time?+t.time.slice(0,2):9,mm=t.time?+t.time.slice(3):0;
  const body=h('div');
  const draw=()=>body.replaceChildren(
    h('div',{class:'sec',text:'몇 시?'}),
    h('div',{class:'hgrid'},Array.from({length:18},(_,i)=>i+6).map(x=>h('button',{type:'button',class:'chip'+(x===hh?' on':''),text:x+'시',on:{click:()=>{hh=x;draw()}}}))),
    h('div',{class:'sec',text:'몇 분?'}),
    h('div',{class:'chips',style:'padding-left:0'},[0,10,15,20,30,40,45,50].map(x=>h('button',{type:'button',class:'chip'+(x===mm?' on':''),text:pad(x)+'분',on:{click:()=>{mm=x;draw()}}}))),
    h('p',{text:'고른 시간: '+pad(hh)+':'+pad(mm)}));
  draw();
  const close=sheet(h('h3',{text:(t.day?md(t.day)+' ':'')+'시간 정하기'}),h('p',{text:t.text}),body,
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{applyTime(t,pad(hh)+':'+pad(mm));close();render();toast(pad(hh)+':'+pad(mm)+'로 정했어요')}}}),
    t.time?h('button',{class:'btn',type:'button',text:'시간 빼기',on:{click:()=>{applyTime(t,null);close();render()}}}):null);
}
function applyTime(t,v){
  t.time=v;
  if(t.rep){const r=data().reps.find(x=>x.id===t.rep);if(r){r.time=v;data().tasks.forEach(x=>{if(x.rep===r.id&&!x.done&&x.day>=todayS())x.time=v})}}
  save();
}

function editSheet(t){
  const D=data();
  const inp=h('input',{id:'eTxt',maxlength:'200'});inp.value=t.text;
  const di=h('input',{type:'date',id:'eDate'});di.value=t.day||'';
  const ti=h('input',{type:'time',id:'eTime'});ti.value=t.time||'';
  let tag=t.tag;
  const rep=t.rep?D.reps.find(r=>r.id===t.rep):null;
  const tagRow=h('div',{class:'chips'});
  const drawTags=()=>tagRow.replaceChildren(...[null,...tagIdx()].map(i=>h('button',{type:'button',class:'chip'+(tag===i?' on':''),on:{click:()=>{tag=i;drawTags()}}},i==null?'없음':[h('i',{class:'c'+colOf(i)}),tagName(i)])));
  drawTags();
  // 반복: 매주는 요일 여러 개 (월·수·금), 매달은 날짜
  const baseDay=t.day||todayS();
  let rType=rep?rep.type:null,dows=new Set(rep&&rep.type==='week'?rep.dows:[dowOf(baseDay)]),rDom=rep&&rep.type==='month'?rep.dom:parse(baseDay).getDate();
  const repRow=h('div');
  const drawRep=()=>repRow.replaceChildren(...[
    h('div',{class:'chips'},rep?null:h('button',{type:'button',class:'chip'+(rType==null?' on':''),text:'안 함',on:{click:()=>{rType=null;drawRep()}}}),
      h('button',{type:'button',class:'chip'+(rType==='week'?' on':''),text:'매주',on:{click:()=>{rType='week';drawRep()}}}),
      h('button',{type:'button',class:'chip'+(rType==='month'?' on':''),text:'매달 '+rDom+'일',on:{click:()=>{rType='month';drawRep()}}})),
    rType==='week'?[h('div',{class:'chips dows'},DOW.map((x,i)=>h('button',{type:'button',class:'chip'+(dows.has(i)?' on':''),text:x,'aria-pressed':dows.has(i)?'true':'false',on:{click:()=>{dows.has(i)?dows.delete(i):dows.add(i);drawRep()}}}))),
      h('div',{class:'chips',style:'padding-left:0'},h('button',{type:'button',class:'chip',text:'평일',on:{click:()=>{dows=new Set([0,1,2,3,4]);drawRep()}}}),h('button',{type:'button',class:'chip',text:'주말',on:{click:()=>{dows=new Set([5,6]);drawRep()}}}),h('button',{type:'button',class:'chip',text:'매일',on:{click:()=>{dows=new Set([0,1,2,3,4,5,6]);drawRep()}}})),
      h('p',{text:dows.size?repLabel({type:'week',dows:[...dows]})+' 생겨요':'요일을 하나 이상 골라 주세요'})]:null].flat(Infinity).filter(x=>x!=null));
  drawRep();
  const close=sheet(h('h3',{text:'할 일 고치기'}),inp,
    t.done?h('p',{text:md(t.doneAt)+'에 완료했어요'}):null,
    h('div',{class:'two'},h('label',null,h('span',{text:'날짜'}),di),h('label',null,h('span',{text:'시간'}),ti)),
    rep?h('p',{text:'날짜를 바꾸면 이번 것만 반복에서 빠져요. 시간은 반복 전체에 적용돼요.'}):null,
    h('div',{class:'sec',text:'카테고리'}),tagRow,
    h('div',{class:'sec',text:rep?'반복 ↻ '+repLabel(rep):'반복하기'}),repRow,
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{
      const v=inp.value.trim();if(!v){toast('내용을 적어 주세요');return}
      const nd=di.value&&isDate(di.value)?di.value:null,nt=ti.value&&isTime(ti.value)?ti.value:null;
      if(rType==='week'&&!dows.size){toast('반복할 요일을 골라 주세요');return}
      t.text=v.slice(0,200);t.tag=tag;
      if(nd!==t.day){
        if(rep){rep.skip=(rep.skip||[]).concat(t.day);t.rep=null}
        if(nd)setDay(t,nd);else t.day=null;
      }
      if(nt!==t.time){if(t.rep)applyTime(t,nt);else t.time=nt}
      if(rep&&t.rep){ // 반복 내용·규칙 바꾸기
        rep.text=t.text;rep.tag=tag;
        const nr={type:rType,dows:[...dows].sort(),dom:rDom};
        const changed=rep.type!==nr.type||(nr.type==='week'&&String(rep.dows)!==String(nr.dows));
        rep.type=nr.type;if(nr.type==='week')rep.dows=nr.dows;else rep.dom=nr.dom;
        const t0=todayS();
        D.tasks=D.tasks.filter(x=>!(x.rep===rep.id&&!x.done&&x.day>=t0&&!repHits(rep,x.day)));
        D.tasks.forEach(x=>{if(x.rep===rep.id&&!x.done&&x.day>=t0){x.text=t.text;x.tag=tag}});
        save();ensureRepeats(st.y,st.m);close();render();if(changed)toast(repLabel(rep)+'로 바꿨어요');return}
      if(!rep&&rType){
        const r={id:uid(),text:t.text,tag,type:rType,dows:[...dows].sort(),dom:rDom,time:t.time||null,start:t.day||todayS(),skip:[]};
        D.reps.push(r);D.tasks.splice(D.tasks.indexOf(t),1);
        save();ensureRepeats(st.y,st.m);close();render();toast(repLabel(r)+' 반복으로 만들었어요');return}
      save();close();render()}}}),
    t.day&&!rep?h('button',{class:'btn',type:'button',text:'🎂 기념일로 바꾸기 (날짜 옆에 작게 표시)',on:{click:()=>{
      const D=data();D.annivs.push({id:uid(),name:t.text.slice(0,12),date:t.day,yearly:true});D.tasks.splice(D.tasks.indexOf(t),1);
      save();close();rerender();toast('매년 '+(+t.day.slice(5,7))+'월 '+(+t.day.slice(8))+'일 기념일로 바꿨어요')}}}):null,
    !t.done&&t.day?h('button',{class:'btn',type:'button',text:'내일로 미루기',on:{click:()=>{const x=parse(t.day);x.setDate(x.getDate()+1);
      if(rep){rep.skip=(rep.skip||[]).concat(t.day);t.rep=null}
      setDay(t,ymd(x));save();close();render();toast(md(t.day)+'로 미뤘어요')}}}):null,
    h('button',{class:'btn del',type:'button',text:rep?'이번 것만 지우기':'지우기',on:{click:()=>{
      if(rep)rep.skip=(rep.skip||[]).concat(t.day);
      D.tasks.splice(D.tasks.indexOf(t),1);save();close();render();toast('지웠어요')}}}),
    rep?h('button',{class:'btn del',type:'button',text:'반복 그만하기 (오늘 이후 것 지우기)',on:{click:()=>stopRep(rep,close)}}):null);
}
function stopRep(rep,close){
  const D=data();const t0=todayS();
  D.tasks=D.tasks.filter(x=>!(x.rep===rep.id&&!x.done&&x.day>=t0));
  D.tasks.forEach(x=>{if(x.rep===rep.id)x.rep=null});
  D.reps=D.reps.filter(r=>r!==rep);save();if(close)close();render();toast('반복을 그만했어요');
}

// 기념일·생일
function annivSheet(s){
  const ni=h('input',{id:'aName',maxlength:'12',placeholder:'예: 엄마 생신, 결혼기념일'});
  const L=lunarOf(s);
  let mode='solar';const yr=h('div');
  const sd=parse(s);
  const draw=()=>yr.replaceChildren(h('div',{class:'chips',style:'padding-left:0'},
    h('button',{type:'button',class:'chip'+(mode==='solar'?' on':''),text:'매년 양력 '+(sd.getMonth()+1)+'월 '+sd.getDate()+'일',on:{click:()=>{mode='solar';draw()}}}),
    L&&!L.leap?h('button',{type:'button',class:'chip'+(mode==='lunar'?' on':''),text:'매년 음력 '+L.m+'월 '+L.d+'일',on:{click:()=>{mode='lunar';draw()}}}):null,
    h('button',{type:'button',class:'chip'+(mode==='once'?' on':''),text:'올해만',on:{click:()=>{mode='once';draw()}}})));
  draw();
  const close=sheet(h('h3',{text:md(s)+' 기념일'}),ni,yr,
    h('p',{text:L?'음력 생일은 "매년 음력"을 고르면 해마다 양력 날짜를 알아서 맞춰요.':'이 기기에서는 음력 계산을 쓸 수 없어요.'}),
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{const v=ni.value.trim().slice(0,12);if(!v){toast('이름을 적어 주세요');return}
      const a={id:uid(),name:v,date:s,yearly:mode!=='once'};if(mode==='lunar'&&L){a.lunar=true;a.lm=L.m;a.ld=L.d}
      data().annivs.push(a);save();close();rerender();toast(v+' 넣었어요')}}}));
  setTimeout(()=>ni.focus(),50);
}
const annivWhen=a=>a.lunar?'매년 음력 '+a.lm+'월 '+a.ld+'일':(a.yearly?'매년 ':a.date.slice(0,4)+'년 ')+(+a.date.slice(5,7))+'월 '+(+a.date.slice(8))+'일';
function delAnniv(a){
  const close=sheet(h('h3',{text:a.name}),h('p',{text:annivWhen(a)+' 기념일을 지울까요?'}),
    h('button',{class:'btn del',type:'button',text:'지우기',on:{click:()=>{const L=data().annivs;L.splice(L.indexOf(a),1);save();close();render();toast('지웠어요')}}}),
    h('button',{class:'btn',type:'button',text:'그대로 두기',on:{click:()=>close()}}));
}

function settingsSheet(){
  const D=data(),S=D.settings,t0=todayS();
  const today=D.tasks.filter(t=>t.day===t0).sort(byTime);
  const left=today.filter(t=>!t.done);
  const body=h('div');
  const hourSel=(k,v)=>{const x=h('select',{id:'s'+k,class:'hsel','aria-label':k==='hFrom'?'시작 시간':'끝 시간',on:{change:e=>{S[k]=+e.target.value;if(S.hFrom>S.hTo){const t=S.hFrom;S.hFrom=S.hTo;S.hTo=t}save();draw()}}},
    Array.from({length:24},(_,i)=>{const o=h('option',{value:String(i),text:i+'시'});if(i===v)o.selected=true;return o}));return x};
  const draw=()=>{
    const w=h('div',{class:'widget'},h('div',{class:'wh'},h('span',{text:'덤푸 · 오늘 '+md(t0)}),h('span',{text:(today.length-left.length)+'/'+today.length})),
      today.length?today.slice(0,4).map(t=>h('div',{class:'wr'},h('button',{class:'ck'+(t.done?' on':''),type:'button','aria-label':'완료',on:{click:()=>{t.done=!t.done;t.doneAt=t.done?t0:null;save();render();settingsSheet()}}},t.done?'✓':''),h('span',{text:(t.time?t.time+' ':'')+t.text,style:t.done?'text-decoration:line-through;color:var(--muted)':''}))):h('div',{class:'wr',style:'color:var(--muted)',text:'오늘 할 일이 없어요'}));
    const sw=h('button',{type:'button',class:'sw'+(S.alarm?' on':''),'aria-label':'아침 알림',on:{click:()=>{S.alarm=!S.alarm;if(S.alarm&&B&&!demo)B.requestNoti();save();draw()}}});
    const hsw=h('button',{type:'button',class:'sw'+(S.hol?' on':''),'aria-label':'공휴일 표시',on:{click:()=>{S.hol=!S.hol;save();render();draw()}}});
    const tm=h('input',{type:'time',id:'sTime',value:S.time,on:{change:e=>{S.time=isTime(e.target.value)?e.target.value:'08:00';save();draw()}}});
    const preview=S.alarm?h('div',{class:'noti'},h('b',{text:'덤푸 · 매일 '+S.time}),left.length?'오늘 할 일 '+left.length+'개: '+(left[0].time?left[0].time+' ':'')+left[0].text+(left.length>1?' 외 '+(left.length-1)+'개':''):'오늘 할 일이 없어요. 데일리에 하나 적어 볼까요?'):null;
    const tagInputs=[S.tags.map((n,i)=>{const x=h('input',{id:'tg'+i,maxlength:'8',style:'margin:4px 0;flex:1;min-width:0'});x.value=n;x.addEventListener('change',()=>{S.tags[i]=x.value.trim().slice(0,8)||n;save();render();setTimeout(draw,0)});
        return h('div',{class:'catrow','data-cat':i},h('span',{class:'grip','aria-hidden':'true',text:'≡'}),h('button',{type:'button',class:'dot c'+colOf(i),'aria-label':n+' 색 바꾸기 (지금 '+COLORS[colOf(i)]+')',on:{click:()=>{S.tagColor[i]=(colOf(i)+1)%8;save();render();draw()}}}),x,
          S.tags.length>1?h('button',{type:'button',class:'chip',text:'지우기','aria-label':n+' 카테고리 지우기',on:{click:()=>delTag(i,draw)}}):null)}),
      S.tags.length<8?h('button',{type:'button',class:'btn',text:'+ 카테고리 추가 ('+S.tags.length+'/8)',on:{click:()=>{const used=new Set(S.tags.map((_,k)=>colOf(k)));let c=0;while(used.has(c)&&c<7)c++;
        S.tags.push('새 카테고리');S.tagColor.push(c);save();render();draw();const e=document.getElementById('tg'+(S.tags.length-1));if(e){e.focus();e.select()}}}}):null,
      h('p',{text:'동그라미를 누르면 색이 바뀌고, ≡ 를 끌면 순서가 바뀌어요.'})];
    body.replaceChildren(...[
      h('div',{class:'sec',text:'홈 화면 위젯'}),h('p',null,B?'홈 화면 빈 곳을 길게 눌러 위젯 → 덤푸를 추가하면, 앱을 안 열고 오늘 할 일을 체크해요.':'오늘 할 일을 앱을 안 열고 바로 체크해요',B?null:h('span',{class:'app-only',text:'안드로이드 앱에서 돼요'})),w,
      h('div',{class:'sec',text:'아침 알림'}),
      h('div',{class:'set'},h('span',null,'매일 아침 오늘 할 일 알려주기',h('small',{text:B?'정한 시간에 오늘 할 일을 알려줘요':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'})),sw),
      S.alarm?h('div',{class:'set'},h('span',{text:'알림 시간'}),tm):null,preview,
      h('div',{class:'sec',text:'매시간 기록 알림'}),
      h('div',{class:'set'},h('span',null,'"지난 1시간 뭐 했어요?" 알림',h('small',{text:B?'정한 시간 동안 매시 정각쯤 알려줘요. 이미 적은 시간은 건너뛰어요.':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'})),
        h('button',{type:'button',class:'sw'+(S.hourly?' on':''),'aria-label':'매시간 기록 알림',on:{click:()=>{S.hourly=!S.hourly;if(S.hourly&&B&&!demo)B.requestNoti();save();draw()}}})),
      S.hourly?h('div',{class:'set'},h('span',{text:'알림 받을 시간'}),hourSel('hFrom',S.hFrom),h('span',{text:'~',style:'flex:none'}),hourSel('hTo',S.hTo)):null,
      h('div',{class:'sec',text:'10분 플래너 시간'}),
      h('div',{class:'set'},h('span',null,'새벽 시간 보기',h('small',{text:'0시부터 보여요 (새벽에 하루를 시작할 때)'})),h('button',{type:'button',class:'sw'+(S.early?' on':''),'aria-label':'새벽 시간 보기',on:{click:()=>{S.early=!S.early;save();render();draw()}}})),
      h('div',{class:'set'},h('span',null,'밤 시간 보기',h('small',{text:'23시까지 보여요'})),h('button',{type:'button',class:'sw'+(S.late?' on':''),'aria-label':'밤 시간 보기',on:{click:()=>{S.late=!S.late;save();render();draw()}}})),
      h('div',{class:'sec',text:'달력'}),
      h('div',{class:'set'},h('span',null,'공휴일·기념일 표시',h('small',{text:'설날·추석·대체공휴일, 어버이날 등 (2026~2028년)'})),hsw),
      h('div',{class:'sec',text:'기념일·생일 '+D.annivs.length}),
      D.annivs.length?D.annivs.slice().sort((a,b)=>a.date.slice(5)<b.date.slice(5)?-1:1).map(a=>h('div',{class:'set'},h('span',null,a.name,h('small',{text:annivWhen(a)})),h('button',{type:'button',class:'chip',text:'지우기',on:{click:()=>{D.annivs.splice(D.annivs.indexOf(a),1);save();render();settingsSheet()}}}))):h('p',{text:'먼슬리 달력에서 날짜를 누르고 "+ 기념일·생일"로 넣어요.'}),
      h('div',{class:'sec',text:'카테고리 '+S.tags.length}),tagInputs,
      h('div',{class:'sec',text:'백업 (폰 바꿀 때)'}),
      h('div',{class:'two'},h('button',{class:'btn',style:'margin:0',type:'button',text:'내보내기',on:{click:()=>{if(demo){toast('예시 보기에서는 백업이 안 돼요');return}exportSheet()}}}),h('button',{class:'btn',style:'margin:0',type:'button',text:'가져오기',on:{click:importSheet}})),
      h('div',{class:'sec',text:'반복 할 일 '+D.reps.length}),
      D.reps.length?D.reps.map(r=>h('div',{class:'set'},h('span',null,r.text,h('small',{text:'↻ '+repLabel(r)+(r.time?' '+r.time:'')})),h('button',{type:'button',class:'chip',text:'그만하기',on:{click:()=>{stopRep(r);settingsSheet()}}}))):h('p',{text:'할 일을 누르고 "반복하기"를 고르면 여기에 모여요.'})].flat(Infinity).filter(x=>x!=null&&x!==false));
  };
  draw();
  sheet(h('h3',{text:'설정'}),body);
}
function delTag(i,redraw){
  const D=data(),S=D.settings,name=S.tags[i];
  const n=D.tasks.filter(t=>t.tag===i).length;
  const fix=o=>{if(o.tag===i)o.tag=null;else if(o.tag!=null&&o.tag>i)o.tag--};
  const ok=()=>{D.tasks.forEach(fix);D.reps.forEach(fix);Object.values(D.ents||{}).forEach(fix);S.tags.splice(i,1);S.tagColor.splice(i,1);
    if(st.brush==='cat:'+i)st.brush=null;else if(st.brush&&st.brush.startsWith('cat:')&&+st.brush.slice(4)>i)st.brush='cat:'+(+st.brush.slice(4)-1);
    if(st.addTag===i)st.addTag=null;else if(st.addTag!=null&&st.addTag>i)st.addTag--;save();render();settingsSheet();toast(name+' 카테고리를 지웠어요')};
  if(!n){ok();return}
  sheet(h('h3',{text:name+' 지우기'}),h('p',{text:'이 카테고리인 할 일 '+n+'개는 지워지지 않고 "없음"이 돼요.'}),
    h('button',{class:'btn del',type:'button',text:'카테고리 지우기',on:{click:ok}}),h('button',{class:'btn',type:'button',text:'그대로 두기',on:{click:()=>settingsSheet()}}));
}
// ── 끌어서 옮기기
// 할 일: 길게 누른 채 끌기 → 달력·요일 칸(날짜), 타임라인(시간), 다른 할 일(순서). 그냥 길게 누르면 고치기.
// 카테고리: ≡ 를 끌어서 순서 바꾸기.
const DR={on:false,kind:null,id:null,x0:0,y0:0,moved:false,timer:null,ghost:null,over:null,cat:null,until:0,scrollT:null};
function dragPoint(e){const p=e.touches&&e.touches[0]||e.changedTouches&&e.changedTouches[0]||e;return {x:p.clientX,y:p.clientY}}
function dragStart(e){
  if(e.button>0)return;
  const grip=e.target.closest('.grip');
  if(grip){const row=grip.closest('.catrow');if(!row)return;
    const pt=dragPoint(e);Object.assign(DR,{kind:'cat',cat:+row.dataset.cat,x0:pt.x,y0:pt.y,moved:false});beginDrag(pt,row.querySelector('input').value);if(e.type==='mousedown')e.preventDefault();return}
  const el=e.target.closest('[data-tid]');
  if(!el||e.target.closest('.chip,input,textarea'))return;
  const pt=dragPoint(e);
  Object.assign(DR,{kind:'task',id:el.dataset.tid,x0:pt.x,y0:pt.y,moved:false});
  clearTimeout(DR.timer);
  DR.timer=setTimeout(()=>{const t=data().tasks.find(x=>x.id===DR.id);if(!t)return;
    try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
    beginDrag(pt,(t.time?t.time+' ':'')+t.text);el.classList.add('dragging')},380);
}
function beginDrag(pt,label){
  DR.on=true;DR.over=null;
  const pp=document.querySelector('.pop');if(pp)pp.style.visibility='hidden'; // 말풍선 아래 날짜에도 놓을 수 있게
  DR.ghost=h('div',{class:'ghost',text:label.slice(0,30)});document.body.append(DR.ghost);moveGhost(pt);
  document.body.classList.add('is-dragging');
}
function moveGhost(pt){if(DR.ghost){DR.ghost.style.left=pt.x+'px';DR.ghost.style.top=pt.y+'px'}}
function dragMove(e){
  if(!DR.kind)return;
  const pt=dragPoint(e);
  const far=Math.abs(pt.x-DR.x0)>8||Math.abs(pt.y-DR.y0)>8;
  if(!DR.on){if(far){clearTimeout(DR.timer);DR.kind=null}return} // 끌기 전에 움직이면 그냥 스크롤
  if(e.cancelable)e.preventDefault();
  if(far)DR.moved=true;
  moveGhost(pt);
  const hit=document.elementFromPoint(pt.x,pt.y);
  let tgt=null;
  if(DR.kind==='cat')tgt=hit&&hit.closest('.catrow');
  else{tgt=hit&&hit.closest('[data-drop]');if(tgt&&tgt.dataset.drop==='before:'+DR.id)tgt=null}
  if(DR.over!==tgt){if(DR.over)DR.over.classList.remove('drop-on');DR.over=tgt;if(tgt)tgt.classList.add('drop-on')}
  // 화면 끝으로 끌면 스크롤
  clearInterval(DR.scrollT);
  const box=DR.kind==='cat'?document.querySelector('.sheet'):null;
  const top=box?box.getBoundingClientRect().top:0,bot=box?box.getBoundingClientRect().bottom:innerHeight-70;
  const v=pt.y<top+60?-10:pt.y>bot-60?10:0;
  if(v)DR.scrollT=setInterval(()=>{box?box.scrollBy(0,v):window.scrollBy(0,v)},16);
}
function dragEnd(e){
  clearTimeout(DR.timer);clearInterval(DR.scrollT);
  if(!DR.on){DR.kind=null;return}
  const kind=DR.kind,over=DR.over,moved=DR.moved;
  if(DR.ghost)DR.ghost.remove();if(over)over.classList.remove('drop-on');
  document.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'));
  document.body.classList.remove('is-dragging');
  DR.on=false;DR.kind=null;DR.until=Date.now()+450; // 손 뗀 뒤 눌림(줄 긋기)으로 처리되지 않게
  if(kind==='cat'){if(over&&+over.dataset.cat!==DR.cat){const pt=dragPoint(e);const r=over.getBoundingClientRect();moveTag(DR.cat,+over.dataset.cat,pt.y>r.top+r.height/2)}return}
  const t=data().tasks.find(x=>x.id===DR.id);if(!t)return;
  if(!moved||!over){const pp=document.querySelector('.pop');if(pp)pp.style.visibility='';if(!moved){closePop();editSheet(t)}return}
  dropTask(t,over);
}
function dropTask(t,over){
  const [k,v]=over.dataset.drop.split(/:(.*)/s);
  const u=snap(t);closePop();
  if(k==='day'&&isDate(v)){
    if(t.day===v)return;
    if(t.rep){const r=data().reps.find(x=>x.id===t.rep);if(r)r.skip=(r.skip||[]).concat(t.day);t.rep=null}
    setDay(t,v);save();rerender();toast(md(v)+'로 옮겼어요',u);return}
  if(k==='hour'){const hh=+v;if(!(hh>=0&&hh<24))return;
    if(st.tab==='daily'&&t.day!==st.day)setDay(t,st.day);
    t.time=pad(hh)+':'+(t.time?t.time.slice(3):'00');save();rerender();toast(t.time+'로 정했어요',u);return}
  if(k==='notime'){if(!t.time)return;t.time=null;save();rerender();toast('시간을 뺐어요',u);return}
  if(k==='before'){
    const list=over.closest('[data-list]');if(!list)return;
    const ids=[...list.querySelectorAll(':scope > [data-tid]')].map(x=>x.dataset.tid).filter(x=>x!==t.id);
    const at=ids.indexOf(v);if(at<0)return;ids.splice(at,0,t.id);
    if(list.dataset.list==='u'){if(t.time)t.time=null;if(st.tab==='daily'&&t.day!==st.day)setDay(t,st.day)}
    const D=data();ids.forEach((id,i)=>{const x=D.tasks.find(y=>y.id===id);if(x)x.ord=i});
    save();rerender();toast('순서를 바꿨어요',u)}
}
// 카테고리 순서 바꾸기: 할 일·반복에 붙은 카테고리 번호도 같이 옮김
function moveTag(from,to,after){
  const D=data(),S=D.settings,n=S.tags.length;
  const order=[...Array(n).keys()].filter(i=>i!==from);
  let at=order.indexOf(to)+(after?1:0);order.splice(at,0,from);
  const newOf=[];order.forEach((old,i)=>newOf[old]=i);
  S.tags=order.map(o=>S.tags[o]);S.tagColor=order.map(o=>S.tagColor[o]);
  const fix=o=>{if(o.tag!=null&&o.tag<n)o.tag=newOf[o.tag]};
  D.tasks.forEach(fix);D.reps.forEach(fix);Object.values(D.ents||{}).forEach(fix);
  if(st.brush&&st.brush.startsWith('cat:')){const b=+st.brush.slice(4);if(b<n)st.brush='cat:'+newOf[b]}
  if(st.addTag!=null&&st.addTag<n)st.addTag=newOf[st.addTag];
  save();render();settingsSheet();toast('카테고리 순서를 바꿨어요');
}
document.addEventListener('touchstart',dragStart,{passive:true});
document.addEventListener('touchmove',dragMove,{passive:false});
document.addEventListener('touchend',dragEnd);
document.addEventListener('touchcancel',dragEnd);
document.addEventListener('mousedown',e=>{if(e.button===0)dragStart(e)});
document.addEventListener('mousemove',e=>{if(DR.kind)dragMove(e)});
document.addEventListener('mouseup',e=>{if(DR.kind)dragEnd(e)});
document.addEventListener('click',e=>{if(Date.now()<DR.until){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('contextmenu',e=>{if(e.target.closest('[data-tid]')&&(DR.on||Date.now()<DR.until))e.preventDefault()});

// ── 10분 칸: 직접 쓰기(쭉 쓸고 적기) / 할 일·카테고리로 칠하기 / 칠한 칸 누르면 고치기
const PT={on:false,mode:null,day:null,val:null,a:0,b:0,moved:false,cat:null};
function cellAt(e){const p=e.touches?e.touches[0]:e;const el=document.elementFromPoint(p.clientX,p.clientY);return el&&el.closest('.tt-g .cell')}
function paintCell(el){
  if(!el||!el.dataset.slot)return;
  const D=data(),slot=+el.dataset.slot;if(!(slot>=0&&slot<144))return;
  D.logs[PT.day]=D.logs[PT.day]||{};const L=D.logs[PT.day];
  if(PT.mode==='erase'){
    const it=logItem(L[slot]);
    if(PT.qt!=null?(it&&it.kind==='e'&&it.text===PT.qt):PT.cat!=null?(it&&it.kind==='e'&&it.tag===PT.cat):L[slot]===PT.val){delete L[slot];el.className=el.className.replace(/ c\d| cn/g,'')}
    return}
  L[slot]=PT.val;const it=logItem(PT.val);el.className=el.className.replace(/ c\d| cn/g,'')+(it?' '+itemCls(it):'');
}
function markPick(){const lo=Math.min(PT.a,PT.b),hi=Math.max(PT.a,PT.b);
  document.querySelectorAll('.tt .cell').forEach(c=>{const n=+c.dataset.slot;c.classList.toggle('pick',n>=lo&&n<=hi)})}
function paintStart(e){
  const el=e.target.closest('.tt-g .cell');if(!el)return;
  const tt=el.closest('.tt');if(!tt)return;
  if(e.cancelable)e.preventDefault();
  PT.day=tt.dataset.day;PT.on=true;PT.moved=false;PT.cat=null;PT.qt=null;
  const slot=+el.dataset.slot;PT.a=PT.b=slot;
  const L=(data().logs||{})[PT.day]||{};
  if(st.brush==null){PT.mode='sel';markPick();return}
  if(st.brush.startsWith('q:')){
    const q=quickList()[+st.brush.slice(2)];if(!q){PT.on=false;return}
    PT.qt=q.text;const it=logItem(L[slot]);
    if(it&&it.kind==='e'&&it.text===q.text)PT.mode='erase';
    else{PT.mode='paint';const id=uid();ents()[id]={text:q.text,tag:q.tag};PT.val='e:'+id}
  }else if(st.brush.startsWith('cat:')){
    const i=+st.brush.slice(4);PT.cat=i;const it=logItem(L[slot]);
    if(it&&it.kind==='e'&&it.tag===i)PT.mode='erase';
    else{PT.mode='paint';const id=uid();ents()[id]={text:tagName(i),tag:i};PT.val='e:'+id}
  }else{PT.val=st.brush;PT.mode=L[slot]===st.brush?'erase':'paint'}
  paintCell(el);
}
function paintMove(e){
  if(!PT.on)return;if(e.cancelable)e.preventDefault();
  const el=cellAt(e);if(!el)return;
  const n=+el.dataset.slot;if(n!==PT.b){PT.moved=true;PT.b=n}
  if(PT.mode==='sel')markPick();else paintCell(el);
}
function paintEnd(){
  if(!PT.on)return;PT.on=false;
  const D=data();
  if(PT.mode==='sel'){
    document.querySelectorAll('.tt .cell.pick').forEach(c=>c.classList.remove('pick'));
    const lo=Math.min(PT.a,PT.b),hi=Math.max(PT.a,PT.b),L=(D.logs||{})[PT.day]||{};
    if(lo===hi&&L[lo])editRun(PT.day,lo);else writeSheet(PT.day,lo,hi);
    return}
  if(D.logs[PT.day]&&!Object.keys(D.logs[PT.day]).length)delete D.logs[PT.day];
  pruneEnts();save();render();
}
// 어디에도 안 쓰는 직접 쓴 기록은 지움
function pruneEnts(){const D=data(),used=new Set();for(const d in D.logs)for(const k in D.logs[d]){const v=D.logs[d][k];if(v.startsWith('e:'))used.add(v.slice(2))}
  for(const id in ents())if(!used.has(id))delete ents()[id]}
// 쭉 쓴 칸에 무엇을 했는지 적기 (다이어리처럼)
function writeSheet(day,lo,hi,entId){
  const e=entId?ents()[entId]:null;
  const ti=h('input',{id:'wTxt',maxlength:'30',placeholder:'예: 아침밥, 출근, 독서'});ti.value=e?e.text:'';
  let tag=e?e.tag:null;
  const tagRow=h('div',{class:'chips',style:'padding-left:0'});
  const drawT=()=>tagRow.replaceChildren(...[null,...tagIdx()].map(i=>h('button',{type:'button',class:'chip'+(tag===i?' on':''),on:{click:()=>{tag=i;drawT()}}},i==null?'없음':[h('i',{class:'c'+colOf(i)}),tagName(i)])));
  drawT();
  const go=()=>{let v=ti.value.trim().slice(0,30);if(!v&&tag!=null)v=tagName(tag);if(!v){toast('무엇을 했는지 적어 주세요');return}
    const D=data(),id=entId||uid();ents()[id]={text:v,tag:tag==null?null:tag};
    D.logs[day]=D.logs[day]||{};for(let n=lo;n<=hi;n++)D.logs[day][n]='e:'+id;
    pruneEnts();save();close();render();toast(slotT(lo)+'~'+slotT(hi+1)+' '+v)};
  ti.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.isComposing)go()});
  const close=sheet(h('h3',{text:md(day)+' '+slotT(lo)+' ~ '+slotT(hi+1)}),h('p',{text:(hi-lo+1)*10+'분 동안 무엇을 했나요?'}),ti,
    h('div',{class:'sec',text:'카테고리 (색)'}),tagRow,
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:go}}),
    e?h('button',{class:'btn del',type:'button',text:'이 기록 지우기',on:{click:()=>{const L=data().logs[day]||{};for(let n=lo;n<=hi;n++)if(L[n]==='e:'+entId)delete L[n];
      if(!Object.keys(L).length)delete data().logs[day];pruneEnts();save();close();render();toast('지웠어요')}}}):null);
  if(!e)setTimeout(()=>ti.focus(),60);
}
// 칠한 칸 누르기: 직접 쓴 기록은 고치기, 할 일로 칠한 칸은 지우기·고치기
function editRun(day,slot){
  const L=data().logs[day]||{};const v=L[slot];const it=logItem(v);if(!it)return;
  const [a,b]=runOf(L,slot);
  if(it.kind==='e'){writeSheet(day,a,b,it.id);return}
  const close=sheet(h('h3',{text:it.text}),h('p',{text:slotT(a)+' ~ '+slotT(b+1)+' ('+(b-a+1)*10+'분) 동안 했어요'}),
    h('button',{class:'btn del',type:'button',text:'이 시간 지우기',on:{click:()=>{for(let n=a;n<=b;n++)delete L[n];if(!Object.keys(L).length)delete data().logs[day];save();close();render();toast('지웠어요')}}}),
    h('button',{class:'btn',type:'button',text:'할 일 고치기',on:{click:()=>{close();editSheet(it.t)}}}));
}
document.addEventListener('touchstart',paintStart,{passive:false});
document.addEventListener('touchmove',paintMove,{passive:false});
document.addEventListener('touchend',paintEnd);
document.addEventListener('touchcancel',paintEnd);
document.addEventListener('mousedown',e=>{if(e.button===0&&!('ontouchstart' in window))paintStart(e)});
document.addEventListener('mousemove',e=>{if(PT.on)paintMove(e)});
document.addEventListener('mouseup',paintEnd);

// ── 백업: 내보내기·가져오기 (폰을 바꿀 때)
function exportSheet(){
  const code=JSON.stringify({app:'dumpu',v:1,at:new Date().toISOString(),data:real});
  const ta=h('textarea',{id:'expTxt',rows:'6',readonly:'readonly',class:'code'});ta.value=code;
  sheet(h('h3',{text:'백업 내보내기'}),
    h('p',{text:'할 일 '+real.tasks.length+'개, 반복 '+real.reps.length+'개, 기념일 '+real.annivs.length+'개가 들어 있어요. 이 글을 카톡 나와의 채팅이나 메모에 붙여 두면 새 폰에서 "가져오기"로 그대로 옮길 수 있어요.'}),ta,
    h('button',{class:'btn pri',type:'button',text:'복사하기',on:{click:()=>{
      const fb=()=>{ta.focus();ta.select();toast('글이 선택됐어요. 길게 눌러 복사해 주세요')};
      try{navigator.clipboard.writeText(code).then(()=>toast('복사했어요'),fb)}catch(e){fb()}}}}),
    B&&B.share?h('button',{class:'btn',type:'button',text:'공유하기 (카톡·메모 등)',on:{click:()=>{if(code.length>200000){toast('너무 커서 공유가 안 돼요. 복사해 주세요');return}B.share(code)}}}):
      navigator.share?h('button',{class:'btn',type:'button',text:'공유하기',on:{click:()=>{navigator.share({title:'덤푸 백업',text:code}).catch(()=>{})}}}):null);
}
function cleanStr(x,n){return typeof x==='string'?x.slice(0,n):''}
function importData(o){
  if(!o||o.app!=='dumpu'||!o.data||typeof o.data!=='object')throw 0;
  const d=o.data,out=blank();
  const okId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(x);
  if(!Array.isArray(d.tasks)||d.tasks.length>20000)throw 0;
  for(const t of d.tasks){if(!t||!okId(t.id))continue;
    const text=cleanStr(t.text,200).trim();if(!text)continue;
    out.tasks.push({id:t.id,text,tag:Number.isInteger(t.tag)&&t.tag>=0&&t.tag<8?t.tag:null,rep:okId(t.rep)?t.rep:null,
      month:typeof t.month==='string'&&/^\d{4}-\d\d$/.test(t.month)?t.month:mkOf(todayS()),week:Number.isInteger(t.week)&&t.week>=0&&t.week<6?t.week:null,
      day:isDate(t.day)?t.day:null,time:isTime(t.time)?t.time:null,done:t.done===true,doneAt:t.done===true&&isDate(t.doneAt)?t.doneAt:null,
      ord:Number.isFinite(t.ord)?t.ord:undefined})}
  for(const r of (Array.isArray(d.reps)?d.reps:[]).slice(0,500)){if(!r||!okId(r.id))continue;
    const text=cleanStr(r.text,200).trim();if(!text||(r.type!=='week'&&r.type!=='month'))continue;
    const dows=Array.isArray(r.dows)?[...new Set(r.dows.filter(x=>Number.isInteger(x)&&x>=0&&x<7))]:[];
    if(r.type==='week'&&!dows.length)continue;
    out.reps.push({id:r.id,text,tag:Number.isInteger(r.tag)&&r.tag>=0&&r.tag<8?r.tag:null,type:r.type,dows,dom:Number.isInteger(r.dom)&&r.dom>=1&&r.dom<=31?r.dom:1,
      time:isTime(r.time)?r.time:null,start:isDate(r.start)?r.start:todayS(),skip:(Array.isArray(r.skip)?r.skip:[]).filter(isDate).slice(-2000)})}
  for(const a of (Array.isArray(d.annivs)?d.annivs:[]).slice(0,500)){if(!a||!okId(a.id)||!isDate(a.date))continue;
    const name=cleanStr(a.name,12).trim();if(!name)continue;
    const x={id:a.id,name,date:a.date,yearly:a.yearly!==false};
    if(a.lunar===true&&Number.isInteger(a.lm)&&a.lm>=1&&a.lm<=12&&Number.isInteger(a.ld)&&a.ld>=1&&a.ld<=30){x.lunar=true;x.lm=a.lm;x.ld=a.ld}
    out.annivs.push(x)}
  if(d.logs&&typeof d.logs==='object'&&!Array.isArray(d.logs)){let n=0;
    for(const day in d.logs){if(!isDate(day)||++n>5000)continue;const v=d.logs[day];if(!v||typeof v!=='object')continue;const o={};
      for(const k in v){const i=+k,x=v[k];if(Number.isInteger(i)&&i>=0&&i<144&&typeof x==='string'&&(okId(x)||(/^e:/.test(x)&&okId(x.slice(2)))))o[i]=x}if(Object.keys(o).length)out.logs[day]=o}}
  if(d.ents&&typeof d.ents==='object'&&!Array.isArray(d.ents)){let n=0;
    for(const id in d.ents){if(!okId(id)||++n>50000)continue;const e=d.ents[id];if(!e)continue;const text=cleanStr(e.text,30).trim();if(!text)continue;
      out.ents[id]={text,tag:Number.isInteger(e.tag)&&e.tag>=0&&e.tag<8?e.tag:null}}}
  for(const day in out.logs){const o=out.logs[day];for(const k in o)if(o[k].startsWith('e:')&&!out.ents[o[k].slice(2)])delete o[k];if(!Object.keys(o).length)delete out.logs[day]}
  const S=d.settings||{};
  out.settings.alarm=S.alarm===true;out.settings.time=isTime(S.time)?S.time:'08:00';out.settings.hol=S.hol!==false;out.settings.early=S.early===true;out.settings.late=S.late===true;out.settings.palV=2;out.settings.hourly=S.hourly===true;out.settings.hFrom=Number.isInteger(S.hFrom)&&S.hFrom>=0&&S.hFrom<24?S.hFrom:9;out.settings.hTo=Number.isInteger(S.hTo)&&S.hTo>=0&&S.hTo<24?S.hTo:22;
  if(Array.isArray(S.tags)&&S.tags.length){out.settings.tags=S.tags.slice(0,8).map((x,i)=>cleanStr(x,8).trim()||('카테고리'+(i+1)))}
  out.settings.tagColor=out.settings.tags.map((_,i)=>Array.isArray(S.tagColor)&&Number.isInteger(S.tagColor[i])&&S.tagColor[i]>=0&&S.tagColor[i]<8?S.tagColor[i]:i%8);
  if(S.palV!==2){const MAP=[4,3,1,6,5,2,3,7];out.settings.tagColor=out.settings.tagColor.map(o=>MAP[o])}
  const nT=out.settings.tags.length;out.tasks.forEach(t=>{if(t.tag!=null&&t.tag>=nT)t.tag=null});Object.values(out.ents).forEach(e=>{if(e.tag!=null&&e.tag>=nT)e.tag=null});out.reps.forEach(r=>{if(r.tag!=null&&r.tag>=nT)r.tag=null});
  return out;
}
function importSheet(){
  const ta=h('textarea',{id:'impTxt',rows:'6',class:'code',placeholder:'내보내기로 복사한 글을 여기에 붙여 넣어요'});
  const close=sheet(h('h3',{text:'백업 가져오기'}),h('p',{text:'가져오면 지금 이 폰의 기록이 백업 내용으로 바뀌어요.'}),ta,
    h('button',{class:'btn pri',type:'button',text:'가져오기',on:{click:()=>{
      let out;try{const txt=ta.value.trim();if(txt.length>3000000)throw 0;out=importData(JSON.parse(txt))}catch(e){toast('덤푸 백업 글이 아니에요. 다시 복사해 주세요');return}
      const c2=sheet(h('h3',{text:'정말 바꿀까요?'}),h('p',{text:'할 일 '+out.tasks.length+'개, 반복 '+out.reps.length+'개, 기념일 '+out.annivs.length+'개로 바뀌어요. 지금 기록 '+real.tasks.length+'개는 없어져요.'}),
        h('button',{class:'btn del',type:'button',text:'바꾸기',on:{click:()=>{demo=null;real=out;save();c2();render();toast('가져왔어요')}}}),
        h('button',{class:'btn',type:'button',text:'그만두기',on:{click:()=>c2()}}))}}}));
}

// 옆으로 밀기: 먼슬리는 달, 위클리는 주, 데일리는 날
function weekStep(k){
  const ws=weeksOf(st.y,st.m);const w=ws[st.week==null?curWeekIdx():st.week];
  const x=parse(w[0]);x.setDate(x.getDate()+7*k);const s=ymd(x);
  st.y=x.getFullYear();st.m=x.getMonth();st.week=weekOfDay(s);render();
}
function stepBy(k){
  const app=document.getElementById('app');
  if(st.tab==='daily'){const x=parse(st.day);x.setDate(x.getDate()+k);st.day=ymd(x);render()}
  else if(st.tab==='weekly')weekStep(k);
  else mv(k);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){app.classList.remove('slide-l','slide-r');void app.offsetWidth;app.classList.add(k>0?'slide-l':'slide-r')}
}
(function(){
  let x0=null,y0=0,t0=0;
  const el=document.getElementById('app');
  el.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||closeLayer||(window.AppInfo&&AppInfo.isOpen())||st.pick){x0=null;return}
    if(e.target.closest('input,textarea,.weeks,.hgrid,.tl-add,.tt-g,.brush')){x0=null;return}
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
  el.addEventListener('touchend',e=>{
    if(x0==null)return;if(DR.on||Date.now()<DR.until){x0=null;return}const t=e.changedTouches[0];const dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.8&&Date.now()-t0<700)stepBy(dx<0?1:-1)},{passive:true});
})();
window.onBackKey=function(){
  if(window.AppInfo&&AppInfo.close())return true;
  if(closeLayer){closeLayer();return true}
  if(popDay){closePop();return true}
  if(st.pick){st.pick=null;render();return true}
  if(st.tab!=='monthly'){st.tab='monthly';render();return true}
  return false};
applyWidgetOps();
render();
syncNative();
if(window.AppInfo)AppInfo.init();
function onBack2App(){applyWidgetOps();render();syncNative()}
window.__onResume=onBack2App;
window.__openDaily=function(){closePop();if(closeLayer)closeLayer();st.day=todayS();st.tab='daily';render();setTimeout(()=>{const n=document.querySelector('.tt-r.now');if(n)n.scrollIntoView({block:'center'})},50)};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onBack2App()});
})();
