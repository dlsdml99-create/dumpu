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
const isDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s);
const isTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const blank=()=>({tasks:[],reps:[],annivs:[],settings:{alarm:false,time:'08:00',tags:['회사','집','약속'],tagColor:[0,1,2],hol:true}});

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
function labelsOf(s){
  const out=[];const k=s.slice(5);
  const hl=holOf(s);if(hl)out.push({t:hl,c:'hol'});
  if(data().settings.hol&&MEMO[k])out.push({t:MEMO[k],c:'memo'});
  for(const a of data().annivs){if(a.yearly?a.date.slice(5)===k:a.date===s)out.push({t:a.name,c:'ann',a})}
  return out;
}

// 저장 (이 기기에만)
let real=blank();
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Array.isArray(v.tasks)){real=Object.assign(blank(),v);real.settings=Object.assign(blank().settings,v.settings||{})}}catch(e){}
// 예전 버전 데이터 고치기: 매주 반복이 요일 하나였던 것 → 여러 요일
for(const r of real.reps){if(r.type==='week'&&!Array.isArray(r.dows))r.dows=[r.dow|0]}
if(!Array.isArray(real.annivs))real.annivs=[];
{const S=real.settings;if(!Array.isArray(S.tags)||!S.tags.length)S.tags=['회사','집','약속'];S.tags=S.tags.slice(0,8);
 if(!Array.isArray(S.tagColor))S.tagColor=[];S.tags.forEach((_,i)=>{if(!(S.tagColor[i]>=0&&S.tagColor[i]<8))S.tagColor[i]=i%8});S.tagColor.length=S.tags.length}
let demo=null;
const data=()=>demo||real;
function save(){if(demo)return;try{localStorage.setItem(KEY,JSON.stringify(real))}catch(e){}syncNative()}
const byTime=(a,b)=>(a.time||'99')<(b.time||'99')?-1:(a.time||'99')>(b.time||'99')?1:0;
// 위젯·알림이 쓸 오늘부터 2주치 할 일만 앱(네이티브)에 넘긴다
function syncNative(){
  if(!B)return;
  try{
    const days={};const base=parse(todayS());
    for(let i=0;i<14;i++){const x=new Date(base);x.setDate(base.getDate()+i);const s=ymd(x);
      days[s]=real.tasks.filter(t=>t.day===s).sort(byTime).slice(0,30).map(t=>({id:t.id,text:((t.time?t.time+' ':'')+t.text).slice(0,60),done:!!t.done}))}
    B.sync(JSON.stringify({days,alarm:!!real.settings.alarm,time:real.settings.time}));
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
  if(a)for(const k in a){if(k==='on')for(const ev in a.on)e.addEventListener(ev,a.on[ev]);else if(k==='class')e.className=a[k];else if(k==='text')e.textContent=a[k];else e.setAttribute(k,a[k])}
  for(const c of kids.flat(Infinity)){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c))}
  return e}
let toastT;function toast(msg){const old=document.querySelector('.toast');if(old)old.remove();const t=h('div',{class:'toast',text:msg});document.body.append(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),1800)}
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
function toggle(t){t.done=!t.done;t.doneAt=t.done?todayS():null;save();render();if(t.done)toast(md(t.doneAt)+' 완료로 기록했어요')}
const tagName=i=>data().settings.tags[i];
const tagIdx=()=>data().settings.tags.map((_,i)=>i);
const colOf=i=>{const c=data().settings.tagColor;return c&&c[i]!=null?c[i]:i%8};
const hasTag=t=>t.tag!=null&&t.tag<data().settings.tags.length;
const COLORS=['파랑','청록','주황','분홍','보라','노랑','초록','회색'];

function check(t){return h('button',{class:'ck'+(t.done?' on':''),'aria-label':t.done?'완료 취소':'완료',type:'button',on:{click:()=>toggle(t)}},t.done?'✓':'')}
function taskRow(t,extra,opt){
  const tags=[];
  if(t.done)tags.push(h('span',{class:'tag',text:md(t.doneAt)+' 완료'}));
  else if(isLate(t))tags.push(h('span',{class:'tag late',text:'밀림 '+md(dueEnd(t))}));
  else if(t.day&&!(opt&&opt.noDay))tags.push(h('span',{class:'tag day',text:md(t.day)}));
  return h('div',{class:'row'+(t.done?' done':'')+(hasTag(t)?' g'+colOf(t.tag):'')},
    h('div',{class:'top'},check(t),h('button',{class:'txt',type:'button',on:{click:()=>editSheet(t)}},
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

// ── 달력 (먼슬리 위쪽)
function calGrid(){
  const ws=weeksOf(st.y,st.m);const t0=todayS();const all=data().tasks;
  const grid=h('div',{class:'cal'+(st.pick?' picking':'')},DOW.map((x,i)=>h('div',{class:'dow'+(i===6?' sun':i===5?' sat':''),text:x})));
  ws.flat().forEach(d=>{const dt=parse(d);const out=dt.getMonth()!==st.m;
    const dn=all.filter(t=>t.done&&t.doneAt===d),pl=all.filter(t=>!t.done&&t.day===d).sort(byTime);
    const labs=labelsOf(d);const red=dowOf(d)===6||labs.some(l=>l.c==='hol');
    grid.append(h('button',{type:'button',class:(out?'out ':'')+(d===t0?'today ':'')+(d===st.sel&&!st.pick?'sel ':'')+(red?'red ':dowOf(d)===5?'blue ':''),
      'aria-label':md(d)+(labs.length?' '+labs.map(l=>l.t).join(' '):'')+' 완료 '+dn.length+'개 예정 '+pl.length+'개',on:{click:()=>calTap(d)}},
      h('span',{class:'dl'},h('span',{class:'d',text:String(dt.getDate())}),labs.length?h('span',{class:'lab '+labs[0].c,text:labs[0].t}):null),
      pl.length?h('span',{class:'mini p',text:pl[0].text}):dn.length?h('span',{class:'mini',text:'✓'+dn[0].text}):null,
      h('span',{class:'mk'},dn.slice(pl.length?0:1,4).map(t=>h('i',{class:hasTag(t)?'c'+colOf(t.tag):''})),pl.slice(1,4).map(t=>h('i',{class:'p'+(hasTag(t)?' c'+colOf(t.tag):'')})))))});
  return grid;
}
function calTap(d){
  const dt=parse(d);
  if(st.pick){const t=data().tasks.find(x=>x.id===st.pick);st.pick=null;
    if(t){if(t.rep){const r=data().reps.find(x=>x.id===t.rep);if(r)r.skip=(r.skip||[]).concat(t.day);t.rep=null}
      setDay(t,d);save();st.sel=d;render();toast('"'+t.text.slice(0,12)+'" '+md(d)+'로 정했어요');return}}
  st.sel=d;if(dt.getMonth()!==st.m){st.y=dt.getFullYear();st.m=dt.getMonth();st.week=null}render();
}

// ── 먼슬리 (달력 + 고른 날 + 한 달 할 일)
function vMonthly(){
  const ws=weeksOf(st.y,st.m);
  const all=data().tasks;
  if(mkOf(st.sel)!==mKey())st.sel=isThisMonth()?todayS():mKey()+'-01';
  const s=st.sel;
  const ts=all.filter(t=>t.month===mKey()&&!t.rep);
  const reps=all.filter(t=>t.month===mKey()&&t.rep);
  const pickT=st.pick?all.find(x=>x.id===st.pick):null;
  // 고른 날
  const dayTs=all.filter(t=>t.day===s).sort(byTime),dayDone=all.filter(t=>t.done&&t.doneAt===s&&t.day!==s);
  const cin=h('input',{id:'cAdd',placeholder:md(s)+'에 바로 추가 (예: 3시 병원)',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)cgo()}}});
  function cgo(){const n=addTasks(cin.value,{month:mkOf(s),week:weekOfDay(s),day:s});if(n){render();toast(md(s)+'에 추가했어요')}}
  const annivs=labelsOf(s).filter(l=>l.c==='ann');
  const daybox=h('div',{class:'daybox'},
    h('div',{class:'dh'},h('b',{text:md(s)+(s===todayS()?' · 오늘':'')}),labelSpans(s,'lab big')),
    annivs.length?h('div',{class:'chips',style:'padding-left:0;margin:4px 0'},annivs.map(l=>h('button',{type:'button',class:'chip',text:'🎂 '+l.t+(l.a.yearly?' (매년)':'')+' ✕','aria-label':l.t+' 기념일 지우기',on:{click:()=>delAnniv(l.a)}}))):null,
    dayTs.length||dayDone.length?h('div',{class:'list'},[...dayTs,...dayDone].map(t=>taskRow(t,null,{noDay:true}))):null,
    h('div',{class:'add',style:'margin:8px 0 6px'},cin,h('button',{class:'go',type:'button',text:'추가',on:{click:cgo}})),
    h('div',{class:'links'},h('button',{type:'button',text:'+ 기념일·생일',on:{click:()=>annivSheet(s)}}),h('button',{type:'button',text:'데일리 열기 ›',on:{click:()=>{st.day=s;st.tab='daily';window.scrollTo(0,0);render()}}})));
  // 한 달 할 일
  const ta=h('textarea',{id:'mAdd',rows:'4',placeholder:'이번 달 할 일을 한 줄에 하나씩 우다다 적어요\n예: 병원 예약\n    보고서 제출'});
  const box=[h('div',{class:'sec',text:'이번 달 할 일 적기'}),h('div',{class:'add'},ta,h('button',{class:'go',type:'button',text:'추가',on:{click:()=>{const n=addTasks(ta.value);if(n){ta.value='';render();toast(n+'개 추가했어요')}}}})),
    tagPicker(),h('p',{class:'hint',text:'주차 버튼은 위클리로, 📅 날짜를 누르고 달력에서 날을 고르면 그 날로 정해져요.'})];
  const undone=ts.filter(t=>!t.done),done=ts.filter(t=>t.done);
  const row=t=>taskRow(t,h('div',{class:'chips'},
    ws.map((w,i)=>h('button',{class:'chip'+(t.week===i&&!t.day?' on':''),type:'button',text:(i+1)+'주',on:{click:()=>{if(t.week===i&&!t.day){t.week=null}else{t.week=i;t.day=null}save();render()}}})),
    h('button',{type:'button',class:'chip'+(t.day?' on':'')+(st.pick===t.id?' pk':''),text:t.day?'📅 '+md(t.day):'📅 날짜',on:{click:()=>{st.pick=st.pick===t.id?null:t.id;render();if(st.pick)document.querySelector('.cal').scrollIntoView({behavior:'smooth',block:'center'})}}}),
    t.day?timeChip(t):null));
  const unassigned=undone.filter(t=>t.week==null&&!t.day).length;
  const repDone=reps.filter(t=>t.done).length;
  return [head('먼슬리',ts.length?ts.length+'개 중 '+done.length+'개 완료'+(unassigned?' · 안 정한 '+unassigned+'개':''):'달력 보며 할 일 정하기'),
    pickT?h('div',{class:'pickbar'},h('span',null,'"',h('b',{text:pickT.text.slice(0,20)}),'" 언제 할까요? 달력에서 날짜를 눌러 주세요'),h('button',{type:'button',text:'취소',on:{click:()=>{st.pick=null;render()}}})):null,
    calGrid(),
    st.pick?null:daybox,
    isThisMonth()?lateBox('month'):null,
    box,
    ts.length?null:emptyBox('아직 이번 달 할 일이 없어요.'),
    undone.length?h('div',{class:'list'},undone.map(row)):null,
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
    return h('button',{type:'button',class:(n?'has ':'')+(d===t0?'tdy ':'')+(red?'red':''),title:labs.map(l=>l.t).join(', '),on:{click:()=>{st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}},DOW[i],h('b',{text:String(parse(d).getDate())}),labs.length?h('small',{class:'lab '+labs[0].c,text:labs[0].t}):null)}));
  const row=t=>taskRow(t,h('div',{class:'chips'},w.map((d,i)=>h('button',{class:'chip'+(t.day===d?' on':''),type:'button',text:DOW[i],'aria-label':md(d)+'로 보내기',on:{click:()=>{
      if(t.day===d){t.day=null}else{if(t.rep){const r=data().reps.find(x=>x.id===t.rep);if(r)r.skip=(r.skip||[]).concat(t.day);t.rep=null}setDay(t,d)}save();render()}}})),
    t.day?timeChip(t):null));
  const sorted=ts.slice().sort((a,b)=>(a.day||'9')<(b.day||'9')?-1:(a.day||'9')>(b.day||'9')?1:byTime(a,b));
  const undone=sorted.filter(t=>!t.done),done=sorted.filter(t=>t.done);
  const fromMonth=data().tasks.filter(t=>t.month===mKey()&&t.week==null&&!t.day&&!t.done&&!t.rep);
  const isNow=w.includes(t0);
  return [head('위클리',(st.week+1)+'주차 · '+(parse(w[0]).getMonth()+1)+'/'+parse(w[0]).getDate()+'~'+(parse(w[6]).getMonth()+1)+'/'+parse(w[6]).getDate()),
    h('div',{class:'weeks'},ws.map((_,i)=>h('button',{class:'chip'+(i===st.week?' on':''),type:'button',text:(i+1)+'주차',on:{click:()=>{st.week=i;render()}}}))),
    isNow?lateBox('week'):null,strip,
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    ts.length?null:emptyBox('이 주에 정리된 할 일이 없어요. 먼슬리에서 주 버튼을 누르거나 위에 바로 적어요.'),
    undone.length?[h('div',{class:'sec',text:'할 일 '+undone.length+' · 요일을 누르면 데일리로, ⏰로 시간 정하기'}),h('div',{class:'list'},undone.map(row))]:null,
    done.length?[h('div',{class:'sec',text:'다 했어요 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    fromMonth.length?[h('div',{class:'sec',text:'먼슬리에서 가져오기 '+fromMonth.length}),h('div',{class:'list'},fromMonth.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이번 주로',on:{click:()=>{t.week=st.week;save();render()}}})))))]:null];
}

// ── 데일리 (시간 안 정한 일 + 타임라인)
function vDaily(){
  const d=st.day;const dt=parse(d);
  if(dt.getFullYear()!==st.y||dt.getMonth()!==st.m){st.y=dt.getFullYear();st.m=dt.getMonth();st.week=null;ensureRepeats(st.y,st.m)}
  const wi=weekOfDay(d);
  const ts=data().tasks.filter(t=>t.day===d);
  const untimed=ts.filter(t=>!t.time),timed=ts.filter(t=>t.time).sort(byTime);
  const doneHere=data().tasks.filter(t=>t.done&&t.doneAt===d&&t.day!==d);
  const inp=h('input',{id:'dAdd',placeholder:'예: 3시 병원, 9:30 회의, 장보기',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(inp.value,{week:wi,day:d,month:mkOf(d)});if(n){render();toast('추가했어요')}}
  const shift=k=>{const x=parse(d);x.setDate(x.getDate()+k);st.day=ymd(x);render()};
  const fromWeek=data().tasks.filter(t=>t.month===mkOf(d)&&t.week===wi&&!t.day&&!t.done);
  // 타임라인: 기본 7시~22시, 더 이르거나 늦은 일이 있으면 넓힘
  const hrs=timed.map(t=>+t.time.slice(0,2));
  const h0=Math.min(7,...hrs),h1=Math.max(22,...hrs);
  const nowH=d===todayS()?new Date().getHours():-1;
  const tl=h('div',{class:'tl'});
  for(let hh=h0;hh<=h1;hh++){
    const at=timed.filter(t=>+t.time.slice(0,2)===hh);
    tl.append(h('div',{class:'tl-r'+(hh===nowH?' now':'')},
      h('span',{class:'tl-h',text:(hh<12?'오전 ':'오후 ')+(hh%12||12)+'시'}),
      h('div',{class:'tl-c'},at.length?at.map(t=>taskRow(t,null,{noDay:true})):
        h('button',{type:'button',class:'tl-add','aria-label':hh+'시에 추가',text:'+',on:{click:()=>{inp.value=hh+':00 ';inp.focus()}}}))));
  }
  const labs=labelsOf(d);
  return [h('div',{class:'head'},h('div',{class:'num',text:String(dt.getDate())}),
      h('div',{class:'t'},h('b',{text:'데일리'}),h('span',{text:(dt.getMonth()+1)+'월 '+(wi+1)+'주차 · '+DOW[dowOf(d)]+'요일'+(d===todayS()?' · 오늘':'')}),labs.length?h('div',null,labelSpans(d,'lab big')):null),
      h('div',{class:'nav'},h('button',{type:'button','aria-label':'전날',text:'‹',on:{click:()=>shift(-1)}}),h('button',{type:'button','aria-label':'다음날',text:'›',on:{click:()=>shift(1)}}),gearBtn())),
    d===todayS()?lateBox('day'):null,
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    h('p',{class:'hint',text:'앞에 시간을 쓰면 타임라인에 들어가요.'+(d!==todayS()?'':'')},d!==todayS()?[' ',h('button',{type:'button',style:'color:var(--cobalt);font-weight:700',text:'오늘로 가기',on:{click:()=>{st.day=todayS();render()}}})]:null),
    !ts.length?emptyBox('이 날 할 일이 없어요. 위클리에서 요일을 누르거나 위에 바로 적어요.'):null,
    untimed.length?[h('div',{class:'sec',text:'시간 안 정함 '+untimed.length}),h('div',{class:'list'},untimed.map(t=>taskRow(t,h('div',{class:'chips'},timeChip(t)),{noDay:true})))]:null,
    h('div',{class:'sec',text:'타임라인'+(timed.length?' '+timed.length:'')}),tl,
    doneHere.length?[h('div',{class:'sec',text:'이 날 끝낸 다른 일 '+doneHere.length}),h('div',{class:'list'},doneHere.map(t=>taskRow(t)))]:null,
    fromWeek.length?[h('div',{class:'sec',text:'이번 주에서 가져오기 '+fromWeek.length}),h('div',{class:'list'},fromWeek.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이 날로',on:{click:()=>{setDay(t,d);save();render()}}})))))]:null];
}

function gearBtn(){const b=h('button',{type:'button','aria-label':'설정',on:{click:settingsSheet}});b.append(svg(GEAR));return b}
function head(title,sub){
  return h('div',{class:'head'},h('div',{class:'num',text:String(st.m+1)}),
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
    h('div',{class:'hgrid'},Array.from({length:18},(_,i)=>i+6).map(x=>h('button',{type:'button',class:'chip'+(x===hh?' on':''),text:(x<12?'오전 ':'오후 ')+(x%12||12),on:{click:()=>{hh=x;draw()}}}))),
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
  let yearly=true;const yr=h('div');
  const draw=()=>yr.replaceChildren(h('div',{class:'chips',style:'padding-left:0'},
    h('button',{type:'button',class:'chip'+(yearly?' on':''),text:'매년 '+(parse(s).getMonth()+1)+'월 '+parse(s).getDate()+'일',on:{click:()=>{yearly=true;draw()}}}),
    h('button',{type:'button',class:'chip'+(!yearly?' on':''),text:'올해만',on:{click:()=>{yearly=false;draw()}}})));
  draw();
  const close=sheet(h('h3',{text:md(s)+' 기념일'}),ni,yr,h('p',{text:'달력 날짜 옆에 작게 나와요. 음력 생일은 해마다 날짜가 달라서 "올해만"으로 넣어 주세요.'}),
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{const v=ni.value.trim().slice(0,12);if(!v){toast('이름을 적어 주세요');return}
      data().annivs.push({id:uid(),name:v,date:s,yearly});save();close();render();toast(v+' 넣었어요')}}}));
  setTimeout(()=>ni.focus(),50);
}
function delAnniv(a){
  const close=sheet(h('h3',{text:a.name}),h('p',{text:(a.yearly?'매년 ':'')+md(a.date).replace(/\(.\)/,'')+' 기념일을 지울까요?'}),
    h('button',{class:'btn del',type:'button',text:'지우기',on:{click:()=>{const L=data().annivs;L.splice(L.indexOf(a),1);save();close();render();toast('지웠어요')}}}),
    h('button',{class:'btn',type:'button',text:'그대로 두기',on:{click:()=>close()}}));
}

function settingsSheet(){
  const D=data(),S=D.settings,t0=todayS();
  const today=D.tasks.filter(t=>t.day===t0).sort(byTime);
  const left=today.filter(t=>!t.done);
  const body=h('div');
  const draw=()=>{
    const w=h('div',{class:'widget'},h('div',{class:'wh'},h('span',{text:'덤푸 · 오늘 '+md(t0)}),h('span',{text:(today.length-left.length)+'/'+today.length})),
      today.length?today.slice(0,4).map(t=>h('div',{class:'wr'},h('button',{class:'ck'+(t.done?' on':''),type:'button','aria-label':'완료',on:{click:()=>{t.done=!t.done;t.doneAt=t.done?t0:null;save();render();settingsSheet()}}},t.done?'✓':''),h('span',{text:(t.time?t.time+' ':'')+t.text,style:t.done?'text-decoration:line-through;color:var(--muted)':''}))):h('div',{class:'wr',style:'color:var(--muted)',text:'오늘 할 일이 없어요'}));
    const sw=h('button',{type:'button',class:'sw'+(S.alarm?' on':''),'aria-label':'아침 알림',on:{click:()=>{S.alarm=!S.alarm;if(S.alarm&&B&&!demo)B.requestNoti();save();draw()}}});
    const hsw=h('button',{type:'button',class:'sw'+(S.hol?' on':''),'aria-label':'공휴일 표시',on:{click:()=>{S.hol=!S.hol;save();render();draw()}}});
    const tm=h('input',{type:'time',id:'sTime',value:S.time,on:{change:e=>{S.time=isTime(e.target.value)?e.target.value:'08:00';save();draw()}}});
    const preview=S.alarm?h('div',{class:'noti'},h('b',{text:'덤푸 · 매일 '+S.time}),left.length?'오늘 할 일 '+left.length+'개: '+(left[0].time?left[0].time+' ':'')+left[0].text+(left.length>1?' 외 '+(left.length-1)+'개':''):'오늘 할 일이 없어요. 데일리에 하나 적어 볼까요?'):null;
    const tagInputs=[S.tags.map((n,i)=>{const x=h('input',{id:'tg'+i,maxlength:'8',style:'margin:4px 0;flex:1;min-width:0'});x.value=n;x.addEventListener('change',()=>{S.tags[i]=x.value.trim().slice(0,8)||n;save();render();setTimeout(draw,0)});
        return h('div',{class:'catrow'},h('button',{type:'button',class:'dot c'+colOf(i),'aria-label':n+' 색 바꾸기 (지금 '+COLORS[colOf(i)]+')',on:{click:()=>{S.tagColor[i]=(colOf(i)+1)%8;save();render();draw()}}}),x,
          S.tags.length>1?h('button',{type:'button',class:'chip',text:'지우기','aria-label':n+' 카테고리 지우기',on:{click:()=>delTag(i,draw)}}):null)}),
      S.tags.length<8?h('button',{type:'button',class:'btn',text:'+ 카테고리 추가 ('+S.tags.length+'/8)',on:{click:()=>{const used=new Set(S.tags.map((_,k)=>colOf(k)));let c=0;while(used.has(c)&&c<7)c++;
        S.tags.push('새 카테고리');S.tagColor.push(c);save();render();draw();const e=document.getElementById('tg'+(S.tags.length-1));if(e){e.focus();e.select()}}}}):null,
      h('p',{text:'동그라미를 누르면 색이 바뀌어요.'})];
    body.replaceChildren(...[
      h('div',{class:'sec',text:'홈 화면 위젯'}),h('p',null,B?'홈 화면 빈 곳을 길게 눌러 위젯 → 덤푸를 추가하면, 앱을 안 열고 오늘 할 일을 체크해요.':'오늘 할 일을 앱을 안 열고 바로 체크해요',B?null:h('span',{class:'app-only',text:'안드로이드 앱에서 돼요'})),w,
      h('div',{class:'sec',text:'아침 알림'}),
      h('div',{class:'set'},h('span',null,'매일 아침 오늘 할 일 알려주기',h('small',{text:B?'정한 시간에 오늘 할 일을 알려줘요':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'})),sw),
      S.alarm?h('div',{class:'set'},h('span',{text:'알림 시간'}),tm):null,preview,
      h('div',{class:'sec',text:'달력'}),
      h('div',{class:'set'},h('span',null,'공휴일·기념일 표시',h('small',{text:'설날·추석·대체공휴일, 어버이날 등 (2026~2028년)'})),hsw),
      h('div',{class:'sec',text:'기념일·생일 '+D.annivs.length}),
      D.annivs.length?D.annivs.slice().sort((a,b)=>a.date.slice(5)<b.date.slice(5)?-1:1).map(a=>h('div',{class:'set'},h('span',null,a.name,h('small',{text:(a.yearly?'매년 ':a.date.slice(0,4)+'년 ')+(+a.date.slice(5,7))+'월 '+(+a.date.slice(8))+'일'})),h('button',{type:'button',class:'chip',text:'지우기',on:{click:()=>{D.annivs.splice(D.annivs.indexOf(a),1);save();render();settingsSheet()}}}))):h('p',{text:'먼슬리 달력에서 날짜를 누르고 "+ 기념일·생일"로 넣어요.'}),
      h('div',{class:'sec',text:'카테고리 '+S.tags.length}),tagInputs,
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
  const ok=()=>{D.tasks.forEach(fix);D.reps.forEach(fix);S.tags.splice(i,1);S.tagColor.splice(i,1);
    if(st.addTag===i)st.addTag=null;else if(st.addTag!=null&&st.addTag>i)st.addTag--;save();render();settingsSheet();toast(name+' 카테고리를 지웠어요')};
  if(!n){ok();return}
  sheet(h('h3',{text:name+' 지우기'}),h('p',{text:'이 카테고리인 할 일 '+n+'개는 지워지지 않고 "없음"이 돼요.'}),
    h('button',{class:'btn del',type:'button',text:'카테고리 지우기',on:{click:ok}}),h('button',{class:'btn',type:'button',text:'그대로 두기',on:{click:()=>settingsSheet()}}));
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
    if(e.target.closest('input,textarea,.weeks,.hgrid,.tl-add')){x0=null;return}
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
  el.addEventListener('touchend',e=>{
    if(x0==null)return;const t=e.changedTouches[0];const dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.8&&Date.now()-t0<700)stepBy(dx<0?1:-1)},{passive:true});
})();
window.onBackKey=function(){
  if(window.AppInfo&&AppInfo.close())return true;
  if(closeLayer){closeLayer();return true}
  if(st.pick){st.pick=null;render();return true}
  if(st.tab!=='monthly'){st.tab='monthly';render();return true}
  return false};
applyWidgetOps();
render();
syncNative();
if(window.AppInfo)AppInfo.init();
function onBack2App(){applyWidgetOps();render();syncNative()}
window.__onResume=onBack2App;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onBack2App()});
})();
