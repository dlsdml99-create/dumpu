(function(){
const APP='덤푸';
const VERSION=window.APP_INFO.version;
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
const blank=()=>({tasks:[],reps:[],settings:{alarm:false,time:'08:00',tags:['회사','집','약속']}});

// 저장 (이 기기에만)
let real=blank();
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Array.isArray(v.tasks)){real=Object.assign(blank(),v);real.settings=Object.assign(blank().settings,v.settings||{})}}catch(e){}
let demo=null;
const data=()=>demo||real;
function save(){if(demo)return;try{localStorage.setItem(KEY,JSON.stringify(real))}catch(e){}syncNative()}
// 위젯·알림이 쓸 오늘부터 2주치 할 일만 앱(네이티브)에 넘긴다
function syncNative(){
  if(!B)return;
  try{
    const days={};const base=parse(todayS());
    for(let i=0;i<14;i++){const x=new Date(base);x.setDate(base.getDate()+i);const s=ymd(x);
      days[s]=real.tasks.filter(t=>t.day===s).slice(0,30).map(t=>({id:t.id,text:t.text.slice(0,60),done:!!t.done}))}
    B.sync(JSON.stringify({days,alarm:!!real.settings.alarm,time:real.settings.time}));
  }catch(e){}
}
// 위젯에서 체크한 것을 앱 데이터에 반영
function applyWidgetOps(){
  if(!B)return;
  let ops=[];try{ops=JSON.parse(B.takeOps()||'[]')}catch(e){}
  if(!Array.isArray(ops)||!ops.length)return;
  for(const o of ops){const t=real.tasks.find(x=>x.id===o.id);if(!t||typeof o.done!=='boolean')continue;
    t.done=o.done;t.doneAt=o.done?(/^\d{4}-\d\d-\d\d$/.test(o.at)?o.at:todayS()):null}
  save();
}

const now=new Date();
let st={tab:'monthly',y:now.getFullYear(),m:now.getMonth(),week:null,day:todayS(),sel:todayS(),addTag:null};

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
function ensureRepeats(y,m){
  const D=data();if(!D.reps.length)return;
  const last=new Date(y,m+1,0).getDate();let changed=false;
  for(const r of D.reps){
    for(let i=1;i<=last;i++){
      const s=ymd(new Date(y,m,i));
      if(s<r.start)continue;
      const hit=r.type==='week'?dowOf(s)===r.dow:i===Math.min(r.dom,last);
      if(!hit||(r.skip||[]).includes(s))continue;
      if(D.tasks.some(t=>t.rep===r.id&&t.day===s))continue;
      D.tasks.push({id:uid(),text:r.text,tag:r.tag,rep:r.id,month:mkOf(s),week:weekOfDay(s),day:s,done:false,doneAt:null});changed=true;
    }
  }
  if(changed)save();
}
const repLabel=r=>r.type==='week'?'매주 '+DOW[r.dow]+'요일':'매달 '+r.dom+'일';

function h(tag,a,...kids){const e=document.createElement(tag);
  if(a)for(const k in a){if(k==='on')for(const ev in a.on)e.addEventListener(ev,a.on[ev]);else if(k==='class')e.className=a[k];else if(k==='text')e.textContent=a[k];else e.setAttribute(k,a[k])}
  for(const c of kids.flat(Infinity)){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c))}
  return e}
let toastT;function toast(msg){const old=document.querySelector('.toast');if(old)old.remove();const t=h('div',{class:'toast',text:msg});document.body.append(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),1800)}
const svg=p=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.8');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');const pa=document.createElementNS('http://www.w3.org/2000/svg','path');pa.setAttribute('d',p);s.append(pa);return s};
const GEAR='M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M19 12l2-1-1-3-2 .3-1.3-1.3.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6 7.3 4 7 3 10l2 1v2l-2 1 1 3 2-.3 1.3 1.3-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z';

function addTasks(text,extra){
  const lines=text.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>s.slice(0,200));
  if(!lines.length){toast('할 일을 적어 주세요');return 0}
  for(const l of lines)data().tasks.push(Object.assign({id:uid(),text:l,tag:st.addTag,rep:null,month:mKey(),week:null,day:null,done:false,doneAt:null},extra||{}));
  save();return lines.length;
}
function toggle(t){t.done=!t.done;t.doneAt=t.done?todayS():null;save();render();if(t.done)toast(md(t.doneAt)+' 완료로 기록했어요')}
const tagName=i=>data().settings.tags[i];

function check(t){return h('button',{class:'ck'+(t.done?' on':''),'aria-label':t.done?'완료 취소':'완료',type:'button',on:{click:()=>toggle(t)}},t.done?'✓':'')}
function taskRow(t,extra){
  const tags=[];
  if(t.done)tags.push(h('span',{class:'tag',text:md(t.doneAt)+' 완료'}));
  else if(isLate(t))tags.push(h('span',{class:'tag late',text:'밀림 '+md(dueEnd(t))}));
  else if(t.day)tags.push(h('span',{class:'tag day',text:md(t.day)}));
  return h('div',{class:'row'+(t.done?' done':'')+(t.tag!=null?' g'+t.tag:'')},
    h('div',{class:'top'},check(t),h('button',{class:'txt',type:'button',on:{click:()=>editSheet(t)}},t.text,t.rep?h('span',{class:'rp',text:'↻'}):null),tags),extra||null);
}
function tagPicker(){
  return h('div',{class:'tags'},h('span',{class:'lb',text:'색깔'}),
    [null,0,1,2].map(i=>h('button',{type:'button',class:'chip'+(st.addTag===i?' on':''),on:{click:()=>{st.addTag=i;render()}}},i==null?'없음':[h('i',{class:'c'+i}),tagName(i)])));
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

// ── 먼슬리
function vMonthly(){
  const ws=weeksOf(st.y,st.m);
  const ts=data().tasks.filter(t=>t.month===mKey()&&!t.rep);
  const reps=data().tasks.filter(t=>t.month===mKey()&&t.rep);
  const ta=h('textarea',{id:'mAdd',rows:'4',placeholder:'이번 달 할 일을 한 줄에 하나씩 우다다 적어요\n예: 병원 예약\n    보고서 제출'});
  const box=[h('div',{class:'add'},ta,h('button',{class:'go',type:'button',text:'추가',on:{click:()=>{const n=addTasks(ta.value);if(n){ta.value='';render();toast(n+'개 추가했어요')}}}})),
    tagPicker(),h('p',{class:'hint',text:'주차 버튼을 누르면 위클리로 정리돼요. 할 일을 누르면 반복·색깔을 바꿔요.'})];
  const late=isThisMonth()?lateBox('month'):null;
  if(!ts.length&&!reps.length)return [head('먼슬리','할 일을 한 번에 몰아 적기'),late,box,emptyBox('아직 이번 달 할 일이 없어요.')];
  const undone=ts.filter(t=>!t.done),done=ts.filter(t=>t.done);
  const row=t=>taskRow(t,h('div',{class:'chips'},ws.map((w,i)=>h('button',{class:'chip'+(t.week===i?' on':''),type:'button',text:(i+1)+'주차',on:{click:()=>{if(t.week===i){t.week=null;t.day=null}else{t.week=i;if(t.day&&!w.includes(t.day))t.day=null}save();render()}}}))));
  const unassigned=undone.filter(t=>t.week==null).length;
  const repDone=reps.filter(t=>t.done).length;
  return [head('먼슬리',ts.length+'개 중 '+done.length+'개 완료'+(unassigned?' · 주차 안 정한 '+unassigned+'개':'')),late,box,
    h('div',{class:'list'},undone.map(row)),
    done.length?[h('div',{class:'sec',text:'완료 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    reps.length?h('p',{class:'hint',style:'margin-top:12px',text:'↻ 반복 할 일 '+reps.length+'번 중 '+repDone+'번 했어요 (위클리·데일리에 나와요)'}):null];
}

// ── 위클리
function vWeekly(){
  const ws=weeksOf(st.y,st.m);
  if(st.week==null||st.week>=ws.length)st.week=curWeekIdx();
  const w=ws[st.week];const t0=todayS();
  const ts=data().tasks.filter(t=>t.day?w.includes(t.day):(t.month===mKey()&&t.week===st.week));
  const inp=h('input',{id:'wAdd',placeholder:(st.week+1)+'주차에 바로 추가',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(inp.value,{week:st.week});if(n){render();toast((st.week+1)+'주차에 추가했어요')}}
  const strip=h('div',{class:'strip'},w.map((d,i)=>{const n=data().tasks.filter(t=>t.day===d).length;
    return h('button',{type:'button',class:(n?'has ':'')+(d===t0?'tdy':''),on:{click:()=>{st.day=d;st.tab='daily';render()}}},DOW[i],h('b',{text:String(parse(d).getDate())}))}));
  const row=t=>taskRow(t,h('div',{class:'chips'},w.map((d,i)=>h('button',{class:'chip'+(t.day===d?' on':''),type:'button',text:DOW[i],'aria-label':md(d)+'로 보내기',on:{click:()=>{if(t.day===d){t.day=null}else{t.day=d;t.month=mkOf(d);t.week=weekOfDay(d)}save();render()}}}))));
  const undone=ts.filter(t=>!t.done),done=ts.filter(t=>t.done);
  const fromMonth=data().tasks.filter(t=>t.month===mKey()&&t.week==null&&!t.done&&!t.rep);
  const isNow=w.includes(t0);
  return [head('위클리',(st.week+1)+'주차 · '+(parse(w[0]).getMonth()+1)+'/'+parse(w[0]).getDate()+'~'+(parse(w[6]).getMonth()+1)+'/'+parse(w[6]).getDate()),
    h('div',{class:'weeks'},ws.map((_,i)=>h('button',{class:'chip'+(i===st.week?' on':''),type:'button',text:(i+1)+'주차',on:{click:()=>{st.week=i;render()}}}))),
    isNow?lateBox('week'):null,strip,
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    ts.length?null:emptyBox('이 주에 정리된 할 일이 없어요. 먼슬리에서 주차 버튼을 누르거나 위에 바로 적어요.'),
    undone.length?[h('div',{class:'sec',text:'할 일 '+undone.length+' · 요일을 누르면 데일리로 가요'}),h('div',{class:'list'},undone.map(row))]:null,
    done.length?[h('div',{class:'sec',text:'다 했어요 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    fromMonth.length?[h('div',{class:'sec',text:'먼슬리에서 가져오기 '+fromMonth.length}),h('div',{class:'list'},fromMonth.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이번 주로',on:{click:()=>{t.week=st.week;save();render()}}})))))]:null];
}

// ── 데일리
function vDaily(){
  const d=st.day;const dt=parse(d);
  if(dt.getFullYear()!==st.y||dt.getMonth()!==st.m){st.y=dt.getFullYear();st.m=dt.getMonth();ensureRepeats(st.y,st.m)}
  const wi=weekOfDay(d);
  const ts=data().tasks.filter(t=>t.day===d);
  const doneHere=data().tasks.filter(t=>t.done&&t.doneAt===d&&t.day!==d);
  const inp=h('input',{id:'dAdd',placeholder:md(d)+'에 할 일 추가',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(inp.value,{week:wi,day:d});if(n){render();toast('추가했어요')}}
  const shift=k=>{const x=parse(d);x.setDate(x.getDate()+k);st.day=ymd(x);render()};
  const fromWeek=data().tasks.filter(t=>t.month===mKey()&&t.week===wi&&!t.day&&!t.done);
  return [h('div',{class:'head'},h('div',{class:'num',text:String(dt.getDate())}),
      h('div',{class:'t'},h('b',{text:'데일리'}),h('span',{text:(dt.getMonth()+1)+'월 '+(wi+1)+'주차 · '+DOW[dowOf(d)]+'요일'+(d===todayS()?' · 오늘':'')})),
      h('div',{class:'nav'},h('button',{type:'button','aria-label':'전날',text:'‹',on:{click:()=>shift(-1)}}),h('button',{type:'button','aria-label':'다음날',text:'›',on:{click:()=>shift(1)}}),gearBtn())),
    d===todayS()?lateBox('day'):null,
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    d!==todayS()?h('p',{class:'hint'},h('button',{type:'button',style:'color:var(--cobalt);font-weight:700',text:'오늘로 가기',on:{click:()=>{st.day=todayS();render()}}})):null,
    ts.length?h('div',{class:'list'},ts.map(t=>taskRow(t))):emptyBox('이 날 할 일이 없어요. 위클리에서 요일을 누르거나 위에 바로 적어요.'),
    doneHere.length?[h('div',{class:'sec',text:'이 날 끝낸 다른 일 '+doneHere.length}),h('div',{class:'list'},doneHere.map(t=>taskRow(t)))]:null,
    fromWeek.length?[h('div',{class:'sec',text:'이번 주에서 가져오기 '+fromWeek.length}),h('div',{class:'list'},fromWeek.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이 날로',on:{click:()=>{t.day=d;save();render()}}})))))]:null];
}

// ── 달력
function vCal(){
  const ws=weeksOf(st.y,st.m);const t0=todayS();
  const all=data().tasks;
  const grid=h('div',{class:'cal'},DOW.map(x=>h('div',{class:'dow',text:x})));
  ws.flat().forEach(d=>{const dt=parse(d);const out=dt.getMonth()!==st.m;
    const dn=all.filter(t=>t.done&&t.doneAt===d),pl=all.filter(t=>!t.done&&t.day===d);
    grid.append(h('button',{type:'button',class:(out?'out ':'')+(d===t0?'today ':'')+(d===st.sel?'sel':''),'aria-label':md(d)+' 완료 '+dn.length+'개 예정 '+pl.length+'개',on:{click:()=>{st.sel=d;if(out){st.y=dt.getFullYear();st.m=dt.getMonth()}render()}}},
      h('span',{class:'d',text:String(dt.getDate())}),
      dn.length?h('span',{class:'mini',text:'✓'+dn[0].text}):null,
      h('span',{class:'mk'},dn.slice(1,5).map(t=>h('i',{class:t.tag!=null?'c'+t.tag:''})),pl.slice(0,4).map(t=>h('i',{class:'p'+(t.tag!=null?' c'+t.tag:'')})))))});
  const s=st.sel;const dn=all.filter(t=>t.done&&t.doneAt===s),pl=all.filter(t=>!t.done&&t.day===s);
  const mt=all.filter(t=>t.month===mKey());
  const tg=data().settings.tags;
  const cin=h('input',{id:'cAdd',placeholder:md(s)+'에 할 일 추가',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)cgo()}}});
  function cgo(){const n=addTasks(cin.value,{month:mkOf(s),week:weekOfDay(s),day:s});if(n){render();toast(md(s)+'에 추가했어요')}}
  return [head('달력',mt.length?'이번 달 '+mt.filter(t=>t.done).length+'/'+mt.length+' 완료':'완료한 일이 날짜에 작게 표시돼요'),
    isThisMonth()?lateBox('day'):null,grid,
    h('div',{class:'legend'},h('span',null,h('i',{style:'width:8px;height:8px;border-radius:50%;background:var(--grass);display:block'}),'한 일'),h('span',null,h('i',{style:'width:8px;height:8px;border-radius:50%;border:1.5px solid var(--cobalt);display:block'}),'할 일'),
      tg.map((n,i)=>h('span',null,h('i',{class:'c'+i,style:'width:8px;height:8px;border-radius:50%;display:block'}),n))),
    h('div',{class:'sec',text:md(s)}),
    h('div',{class:'add'},cin,h('button',{class:'go',type:'button',text:'추가',on:{click:cgo}})),tagPicker(),
    (dn.length||pl.length)?h('div',{class:'list'},[...pl,...dn].map(t=>taskRow(t))):h('p',{class:'hint',style:'margin:0',text:'이 날 기록이 없어요.'}),
    h('p',{class:'hint',style:'margin-top:10px'},h('button',{type:'button',style:'color:var(--cobalt);font-weight:700',text:'이 날 데일리 열기 ›',on:{click:()=>{st.day=s;st.tab='daily';render()}}}))];
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
  const mk=(text,o)=>Object.assign({id:uid(),text:'[예시] '+text,tag:null,rep:null,month:tm,week:null,day:null,done:false,doneAt:null},o);
  const y=parse(t);y.setDate(y.getDate()-1);const ys=ymd(y);
  const lw=parse(t);lw.setDate(lw.getDate()-7);const lws=ymd(lw);
  demo=blank();
  demo.tasks=[mk('병원 예약하기',{week:wi,day:t,tag:1}),mk('보고서 초안',{week:wi,day:w[3],tag:0}),mk('택배 반품',{week:wi,done:true,doneAt:ys,tag:1}),
    mk('엄마 생신 선물',{week:Math.min(wi+1,ws.length-1),tag:2}),mk('자동차 보험 갱신',{}),mk('친구 결혼식 답장',{month:mkOf(lws),week:weekOfDay(lws),day:lws,tag:2})];
  demo.reps=[{id:'r1',text:'[예시] 분리수거',tag:1,type:'week',dow:dowOf(t),start:t,skip:[]}];
  st.y=now.getFullYear();st.m=now.getMonth();ensureRepeats(st.y,st.m);
  render();
}

const ICONS={calendar:'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',monthly:'M5 6h14 M5 12h14 M5 18h9',weekly:'M4 6h16v12H4z M9 6v12 M14 6v12',daily:'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 8v4l3 2'};
const TABS=[['calendar','달력'],['monthly','먼슬리'],['weekly','위클리'],['daily','데일리']];
function render(){
  ensureRepeats(st.y,st.m);
  const app=document.getElementById('app');
  const sx=window.scrollY,foc=document.activeElement&&document.activeElement.id;
  app.replaceChildren(...[
    demo?h('div',{class:'demo'},h('span',{text:'예시로 둘러보는 중 · 저장되지 않아요'}),h('button',{type:'button',text:'나가기',on:{click:()=>{demo=null;render()}}})):null,
    st.tab==='monthly'?vMonthly():st.tab==='weekly'?vWeekly():st.tab==='daily'?vDaily():vCal()].flat(Infinity).filter(x=>x!=null&&x!==false));
  document.getElementById('tabs').replaceChildren(...TABS.map(([k,l])=>{const b=h('button',{type:'button',class:k===st.tab?'on':'',on:{click:()=>{st.tab=k;if(k==='weekly'&&st.week==null)st.week=curWeekIdx();window.scrollTo(0,0);render()}}});
    b.append(svg(ICONS[k]),l);return b}));
  if(foc){const e=document.getElementById(foc);if(e)e.focus()}
  window.scrollTo(0,sx);
}

// 창
let closeLayer=null;
function sheet(...kids){const L=document.getElementById('layer');const dim=h('div',{class:'dim',on:{click:e=>{if(e.target===dim)close()}}},h('div',{class:'sheet',role:'dialog'},...kids));
  function close(){L.replaceChildren();closeLayer=null}L.replaceChildren(dim);closeLayer=close;return close}

function editSheet(t){
  const D=data();
  const inp=h('input',{id:'eTxt',maxlength:'200'});inp.value=t.text;
  let tag=t.tag;
  const rep=t.rep?D.reps.find(r=>r.id===t.rep):null;
  const tagRow=h('div',{class:'chips'});
  const drawTags=()=>tagRow.replaceChildren(...[null,0,1,2].map(i=>h('button',{type:'button',class:'chip'+(tag===i?' on':''),on:{click:()=>{tag=i;drawTags()}}},i==null?'없음':[h('i',{class:'c'+i}),tagName(i)])));
  drawTags();
  // 반복 만들기
  let rType=null,rDow=t.day?dowOf(t.day):dowOf(todayS()),rDom=t.day?parse(t.day).getDate():parse(todayS()).getDate();
  const repRow=h('div');
  const drawRep=()=>repRow.replaceChildren(
    h('div',{class:'chips'},h('button',{type:'button',class:'chip'+(rType==null?' on':''),text:'안 함',on:{click:()=>{rType=null;drawRep()}}}),
      DOW.map((x,i)=>h('button',{type:'button',class:'chip'+(rType==='week'&&rDow===i?' on':''),text:'매주 '+x,on:{click:()=>{rType='week';rDow=i;drawRep()}}})),
      h('button',{type:'button',class:'chip'+(rType==='month'?' on':''),text:'매달 '+rDom+'일',on:{click:()=>{rType='month';drawRep()}}})));
  drawRep();
  const close=sheet(h('h3',{text:'할 일 고치기'}),inp,
    h('p',{text:t.done?md(t.doneAt)+'에 완료했어요':t.day?md(t.day)+'로 정해져 있어요':t.week!=null?(t.week+1)+'주차에 있어요':'아직 주차를 안 정했어요'}),
    h('div',{class:'sec',text:'색깔'}),tagRow,
    rep?[h('div',{class:'sec',text:'반복'}),h('p',{text:'↻ '+repLabel(rep)+'마다 생겨요'})]
       :[h('div',{class:'sec',text:'반복하기'}),repRow],
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{
      const v=inp.value.trim();if(!v){toast('내용을 적어 주세요');return}
      t.text=v.slice(0,200);t.tag=tag;
      if(rep){rep.text=t.text;rep.tag=tag;D.tasks.forEach(x=>{if(x.rep===rep.id&&!x.done&&x.day>=todayS()){x.text=t.text;x.tag=tag}})}
      else if(rType){
        const r={id:uid(),text:t.text,tag,type:rType,dow:rDow,dom:rDom,start:t.day||todayS(),skip:[]};
        D.reps.push(r);D.tasks.splice(D.tasks.indexOf(t),1);
        save();ensureRepeats(st.y,st.m);close();render();toast(repLabel(r)+' 반복으로 만들었어요');return}
      save();close();render()}}}),
    !t.done&&t.day?h('button',{class:'btn',type:'button',text:'내일로 미루기',on:{click:()=>{const x=parse(t.day);x.setDate(x.getDate()+1);
      if(rep){rep.skip=(rep.skip||[]).concat(t.day);t.rep=null}
      t.day=ymd(x);t.month=mkOf(t.day);t.week=weekOfDay(t.day);save();close();render();toast(md(t.day)+'로 미뤘어요')}}}):null,
    !t.done&&t.day&&!rep?h('button',{class:'btn',type:'button',text:'날짜 빼기 (위클리로 돌려놓기)',on:{click:()=>{t.day=null;save();close();render()}}}):null,
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

function settingsSheet(){
  const D=data(),S=D.settings,t0=todayS();
  const today=D.tasks.filter(t=>t.day===t0);
  const left=today.filter(t=>!t.done);
  const body=h('div');
  const draw=()=>{
    const w=h('div',{class:'widget'},h('div',{class:'wh'},h('span',{text:'덤푸 · 오늘 '+md(t0)}),h('span',{text:(today.length-left.length)+'/'+today.length})),
      today.length?today.slice(0,4).map(t=>h('div',{class:'wr'},h('button',{class:'ck'+(t.done?' on':''),type:'button','aria-label':'완료',on:{click:()=>{t.done=!t.done;t.doneAt=t.done?t0:null;save();render();settingsSheet()}}},t.done?'✓':''),h('span',{text:t.text,style:t.done?'text-decoration:line-through;color:var(--muted)':''}))):h('div',{class:'wr',style:'color:var(--muted)',text:'오늘 할 일이 없어요'}));
    const sw=h('button',{type:'button',class:'sw'+(S.alarm?' on':''),'aria-label':'아침 알림',on:{click:()=>{S.alarm=!S.alarm;if(S.alarm&&B&&!demo)B.requestNoti();save();draw()}}});
    const tm=h('input',{type:'time',id:'sTime',value:S.time,on:{change:e=>{S.time=e.target.value||'08:00';save();draw()}}});
    const preview=S.alarm?h('div',{class:'noti'},h('b',{text:'덤푸 · 매일 '+S.time}),left.length?'오늘 할 일 '+left.length+'개: '+left[0].text+(left.length>1?' 외 '+(left.length-1)+'개':''):'오늘 할 일이 없어요. 데일리에 하나 적어 볼까요?'):null;
    const tagInputs=S.tags.map((n,i)=>{const x=h('input',{id:'tg'+i,maxlength:'8',style:'margin:4px 0'});x.value=n;x.addEventListener('change',()=>{S.tags[i]=x.value.trim().slice(0,8)||n;save();render()});return h('div',{style:'display:flex;gap:8px;align-items:center'},h('i',{class:'c'+i,style:'width:12px;height:12px;border-radius:50%;display:block;flex:none'}),x)});
    body.replaceChildren(...[
      h('div',{class:'sec',text:'홈 화면 위젯'}),h('p',null,B?'홈 화면 빈 곳을 길게 눌러 위젯 → 덤푸를 추가하면, 앱을 안 열고 오늘 할 일을 체크해요.':'오늘 할 일을 앱을 안 열고 바로 체크해요',B?null:h('span',{class:'app-only',text:'안드로이드 앱에서 돼요'})),w,
      h('div',{class:'sec',text:'아침 알림'}),
      h('div',{class:'set'},h('span',null,'매일 아침 오늘 할 일 알려주기',h('small',{text:B?'정한 시간에 오늘 할 일을 알려줘요':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'})),sw),
      S.alarm?h('div',{class:'set'},h('span',{text:'알림 시간'}),tm):null,preview,
      h('div',{class:'sec',text:'색깔 이름'}),tagInputs,
      h('div',{class:'sec',text:'반복 할 일 '+D.reps.length}),
      D.reps.length?D.reps.map(r=>h('div',{class:'set'},h('span',null,r.text,h('small',{text:'↻ '+repLabel(r)})),h('button',{type:'button',class:'chip',text:'그만하기',on:{click:()=>{stopRep(r);settingsSheet()}}}))):h('p',{text:'할 일을 누르고 "반복하기"를 고르면 여기에 모여요.'})].flat(Infinity).filter(x=>x!=null&&x!==false));
  };
  draw();
  sheet(h('h3',{text:'설정'}),body);
}
window.onBackKey=function(){
  if(window.AppInfo&&AppInfo.close())return true;
  if(closeLayer){closeLayer();return true}
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
