(function(){
const APP='덤푸';
const B=window.Bridge&&window.Bridge.isApp&&window.Bridge.isApp()?window.Bridge:null; // 안드로이드 앱일 때만
const KEY='dumpu.v1';
const DOW=['월','화','수','목','금','토','일'];
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const dowOf=s=>(parse(s).getDay()+6)%7;
const md=s=>{if(!isDate(s))return '';const d=parse(s);return (d.getMonth()+1)+'/'+d.getDate()+'('+DOW[dowOf(s)]+')'};
const todayS=()=>ymd(new Date());
// 조사 고르기: 받침에 따라 을/를, 으로/로 (받침이 ㄹ이면 로)
const jong=w=>{const d=String(w).replace(/["'”’)\]\s.…]+$/,'').slice(-1),c=d.charCodeAt(0);if(c>=0xAC00&&c<=0xD7A3)return (c-0xAC00)%28;return /[036]/.test(d)?1:/[178]/.test(d)?8:/[LMN]/i.test(d)?4:0};
const eul=w=>w+(jong(w)?'을':'를');
const ro=w=>{const j=jong(w);return w+(j&&j!==8?'으로':'로')};
const mkOf=s=>s.slice(0,7);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const isDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d\d-\d\d$/.test(s))return false;const d=parse(s);return ymd(d)===s&&d.getFullYear()>=2000&&d.getFullYear()<=2100};
const isTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const MOODS=['😆','😊','🙂','😐','😔','😢','😠','😴']; // 오늘 기분
const blank=()=>({tasks:[],reps:[],annivs:[],logs:{},ents:{},diary:{},mood:{},habits:[],hchk:{},hnote:{},settings:{remind:10,alarm:false,time:'08:00',tags:['회사','집','약속'],tagColor:[4,2,0],hol:true,early:false,late:false,hourly:false,hFrom:9,hTo:22,palV:2}});

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
  for(const a of data().annivs)if(ruleHits(annivRule(a),a.date,s))out.push({t:a.name,c:'ann',a});
  return out;
}

// 저장 (이 기기에만)
let real=blank();
let brokenSaved=false;
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Array.isArray(v.tasks)){real=Object.assign(blank(),v);real.settings=Object.assign(blank().settings,{tagColor:undefined,palV:1},v.settings||{})}}catch(e){
  // 저장된 글을 읽지 못하면 덮어쓰기 전에 따로 옮겨 두고 한 번 알려 줘요
  try{const raw=localStorage.getItem(KEY);if(raw){localStorage.setItem(KEY+'.broken',raw);brokenSaved=true}}catch(e2){}}
// 저장 데이터 일부가 망가져도 앱이 빈 화면이 되지 않게 모양 맞추기
if(!Array.isArray(real.tasks))real.tasks=[];real.tasks=real.tasks.filter(t=>t&&typeof t==='object'&&typeof t.text==='string'&&t.text.trim()&&typeof t.id==='string');
// 할 일 하나하나 모양 맞추기 (예전 백업으로 완료 날짜가 비어 흰 화면이 되던 문제 등)
for(const t of real.tasks){if(t.day!=null&&!isDate(t.day))t.day=null;if(t.time!=null&&!isTime(t.time))t.time=null;
  if(typeof t.month!=='string'||!/^\d{4}-\d\d$/.test(t.month))t.month=t.day?t.day.slice(0,7):todayS().slice(0,7);
  if(t.week!=null&&!(Number.isInteger(t.week)&&t.week>=0&&t.week<6))t.week=null;
  t.done=t.done===true;if(t.done){if(!isDate(t.doneAt))t.doneAt=t.day||todayS()}else t.doneAt=null}
if(!Array.isArray(real.reps))real.reps=[];real.reps=real.reps.filter(r=>r&&typeof r==='object'&&typeof r.text==='string'&&['week','month','nthM'].includes(r.type));for(const r of real.reps){if(!isDate(r.start))r.start=todayS();if(!Array.isArray(r.skip))r.skip=[];if(r.time!=null&&!isTime(r.time))r.time=null}
// 예전 버전 데이터 고치기: 매주 반복이 요일 하나였던 것 → 여러 요일
for(const r of real.reps){if(r.type==='week'&&!Array.isArray(r.dows))r.dows=[r.dow|0]}
if(!Array.isArray(real.annivs))real.annivs=[];real.annivs=real.annivs.filter(x=>x&&typeof x==='object'&&typeof x.name==='string'&&isDate(x.date));
if(!real.logs||typeof real.logs!=='object'||Array.isArray(real.logs))real.logs={};
if(!real.ents||typeof real.ents!=='object'||Array.isArray(real.ents))real.ents={};
if(!real.diary||typeof real.diary!=='object'||Array.isArray(real.diary))real.diary={};
if(!Array.isArray(real.habits))real.habits=[];real.habits=real.habits.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'&&typeof x.name==='string');
if(!real.hchk||typeof real.hchk!=='object'||Array.isArray(real.hchk))real.hchk={};
if(!real.hnote||typeof real.hnote!=='object'||Array.isArray(real.hnote))real.hnote={};
if(!real.mood||typeof real.mood!=='object'||Array.isArray(real.mood))real.mood={};
for(const k in real.mood)if(!isDate(k)||!MOODS.includes(real.mood[k]))delete real.mood[k];
for(const k in real.hchk)if(!Array.isArray(real.hchk[k]))delete real.hchk[k];for(const k in real.diary)if(typeof real.diary[k]!=='string')delete real.diary[k];
if(real.timer&&!(real.timer&&typeof real.timer.id==='string'&&Number.isFinite(real.timer.start)&&real.timer.start<=Date.now()&&Date.now()-real.timer.start<24*3600e3))delete real.timer; // 24시간 넘게 켜진 타이머는 꺼요
if(real.timer&&real.timer.focus!=null&&real.timer.focus!==25)delete real.timer.focus;
{const S=real.settings;if(!Array.isArray(S.tags)||!S.tags.length)S.tags=['회사','집','약속'];S.tags=S.tags.slice(0,8);
 if(!Array.isArray(S.tagColor))S.tagColor=[];S.tags.forEach((_,i)=>{if(!(S.tagColor[i]>=0&&S.tagColor[i]<8))S.tagColor[i]=i%8});S.tagColor.length=S.tags.length
 if(S.palV!==2){const MAP=[4,3,1,6,5,2,3,7];S.tagColor=S.tagColor.map(o=>MAP[o]);S.palV=2} // 예전 색(파랑·청록·주황·분홍·보라·노랑·초록·회색) → 가장 비슷한 새 색
}
let demo=null;
const data=()=>demo||real;
let saveWarnT=0;
function save(){quickCache=null;if(demo)return;try{localStorage.setItem(KEY,JSON.stringify(real))}catch(e){
  // 저장 공간이 꽉 찼을 때 조용히 넘어가지 않고 알려 주기 (30초에 한 번)
  if(Date.now()-saveWarnT>30000){saveWarnT=Date.now();setTimeout(()=>toast('앱 저장 공간이 가득 차서 방금 적은 내용을 저장하지 못했어요. 설정 → 백업 파일로 저장을 해 둔 뒤, 오래된 시간표 기록이나 끝낸 할 일을 지워 주세요'),0)}}
  syncNative()}
const byOrd=(a,b)=>(a.ord??1e9)-(b.ord??1e9);
const byTime=(a,b)=>(a.time||'99')<(b.time||'99')?-1:(a.time||'99')>(b.time||'99')?1:0;
// 위젯·알림이 쓸 오늘부터 2주치 할 일만 앱(네이티브)에 넘긴다
function syncNative(){
  if(!B)return;
  try{
    const days={};const base=parse(todayS());const t0s=todayS();
    for(let i=0;i<14;i++){const x=new Date(base);x.setDate(base.getDate()+i);const s=ymd(x);
      days[s]=real.tasks.filter(t=>t.day===s).sort(byTime).slice(0,30).map(t=>({id:t.id,text:((t.time?t.time+' ':'')+t.text).slice(0,60),done:!!t.done}))}
    days[t0s]=(days[t0s]||[]).concat(real.habits.filter(x=>!x.arch&&habitOn(x,t0s)).map(x=>({id:'h:'+x.id,text:(x.icon?x.icon+' ':'')+x.name.slice(0,20),done:((real.hchk||{})[t0s]||[]).includes(x.id),r:true})));
    const t0=todayS(),L=real.logs[t0]||{},filled=[];
    for(let hh=0;hh<24;hh++){let n=0;for(let k=0;k<6;k++)if(L[hh*6+k])n++;if(n>=3)filled.push(hh)} // 반 이상 적은 시간은 안 물어봄
    const S=real.settings;
    const hab=real.habits.filter(x=>!x.arch&&x.time).map(x=>({id:x.id,text:(x.icon?x.icon+' ':'')+x.name.slice(0,20),time:x.time,dows:x.goal?[]:(x.dows||[]),pauses:x.pauses||[],met:!!x.goal&&weekCount(x,t0s)>=x.goal}));
    // 할 일 시간 알림 (앞으로 2주, 끝내지 않은 일) + 25분 집중 끝 알림. 울릴 시각(ms)과 글을 미리 만들어 넘김
    const rem=[],now=Date.now(),R=[-1,0,10,30,60].includes(S.remind)?S.remind:10;
    if(R>=0)for(const t of real.tasks){if(t.done||!t.time||!isDate(t.day)||!isTime(t.time))continue;
      const [hh,mm]=t.time.split(':').map(Number),at=parse(t.day).getTime()+(hh*60+mm-R)*60e3;
      if(at>now&&at<now+15*864e5)rem.push({id:t.id,at,t:'⏰ '+t.time+' '+t.text.slice(0,40)+(R?' · '+(R===60?'1시간':R+'분')+' 뒤예요':' · 지금 할 시간이에요')})}
    rem.sort((a,b)=>a.at-b.at);rem.length=Math.min(rem.length,60);
    const T=real.timer;if(T&&T.focus){const t=real.tasks.find(x=>x.id===T.id);const at=T.start+T.focus*60e3;if(at>now)rem.unshift({id:'focus',at,t:'🍅 '+T.focus+'분 집중 끝! '+(t?'"'+t.text.slice(0,20)+'" ':'')+'5분 쉬어요'})}
    if(rem.length&&!S.remAsked&&!demo){S.remAsked=true;try{localStorage.setItem(KEY,JSON.stringify(real))}catch(e){}B.requestNoti()}
    B.sync(JSON.stringify({days,alarm:!!S.alarm,time:S.time,hourly:!!S.hourly,hFrom:S.hFrom|0,hTo:S.hTo|0,filledDay:t0,filled,hab,rem}));
  }catch(e){}
}
// 위젯에서 체크한 것을 앱 데이터에 반영
function applyWidgetOps(){
  if(!B)return;
  let ops=[];try{ops=JSON.parse(B.takeOps()||'[]')}catch(e){}
  if(!Array.isArray(ops)||!ops.length)return;
  for(const o of ops){
    if(typeof o.id==='string'&&o.id.startsWith('h:')&&typeof o.done==='boolean'){ // 위젯에서 습관 체크
      const hb=real.habits.find(x=>x.id===o.id.slice(2));const d=isDate(o.at)?o.at:todayS();if(!hb)continue;
      const a=real.hchk[d]||[];real.hchk[d]=o.done?[...new Set([...a,hb.id])]:a.filter(x=>x!==hb.id);if(!real.hchk[d].length)delete real.hchk[d];continue}
    const t=real.tasks.find(x=>x.id===o.id);if(!t||typeof o.done!=='boolean')continue;
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

// ── 반복 규칙 공통 (구글 캘린더·타임트리처럼 'N째 주 X요일', '마지막 주'까지)
const ORD=['첫째','둘째','셋째','넷째','다섯째'];
const lastDayOf=s=>new Date(+s.slice(0,4),+s.slice(5,7),0).getDate();
const nthOf=s=>Math.ceil(+s.slice(8)/7);
const isLastWd=s=>+s.slice(8)+7>lastDayOf(s);
function nthHit(n,w,s){return dowOf(s)===w&&(n===-1?isLastWd(s):nthOf(s)===n)}
const nthName=n=>n===-1?'마지막':ORD[n-1];
// rule.k: once | week(dows) | month(dom) | nthM(n,w) | year | nthY(m,n,w) | lunar(lm,ld)
function ruleHits(r,start,s){
  const k=r.k;
  if(k==='once')return s===start;
  if(k==='year')return s.slice(5)===start.slice(5);
  if(k==='lunar'){const L=lunarOf(s);return !!(L&&!L.leap&&L.m===r.lm&&L.d===r.ld&&s.slice(0,4)>=start.slice(0,4))}
  if(k==='nthY')return +s.slice(5,7)===r.m&&nthHit(r.n,r.w,s);
  if(s<start)return false;
  if(k==='week')return (r.dows||[]).includes(dowOf(s));
  if(k==='month')return +s.slice(8)===Math.min(r.dom,lastDayOf(s));
  if(k==='nthM')return nthHit(r.n,r.w,s);
  return false;
}
function ruleLabel(r,start){
  const k=r.k,sd=parse(start);
  if(k==='once')return sd.getFullYear()+'년 '+(sd.getMonth()+1)+'월 '+sd.getDate()+'일 한 번';
  if(k==='year')return '매년 '+(sd.getMonth()+1)+'월 '+sd.getDate()+'일';
  if(k==='lunar')return '매년 음력 '+r.lm+'월 '+r.ld+'일';
  if(k==='nthY')return '매년 '+r.m+'월 '+nthName(r.n)+' 주 '+DOW[r.w]+'요일';
  if(k==='month')return '매월 '+r.dom+'일';
  if(k==='nthM')return '매월 '+nthName(r.n)+' 주 '+DOW[r.w]+'요일';
  const d=[...(r.dows||[])].sort();return d.length===7?'매일':d.length===5&&d.join()==='0,1,2,3,4'?'평일마다':'매주 '+d.map(i=>DOW[i]).join('·');
}
// 반복 고르기 칸. forAnniv: 기념일용(한 번만·매년·음력까지)
function rulePicker(base,init,forAnniv){
  const sd=parse(base),w=dowOf(base),n=nthOf(base),last=isLastWd(base),M=sd.getMonth()+1,D=sd.getDate();
  const L=forAnniv?lunarOf(base):null;
  let cur=init?JSON.parse(JSON.stringify(init)):{k:forAnniv?'once':null};
  if(!cur.dows)cur.dows=[w];
  const el=h('div');
  const opt=(r,label)=>{const on=cur.k===r.k&&(r.n==null||cur.n===r.n);return h('button',{type:'button',class:'chip'+(on?' on':''),text:label,on:{click:()=>{cur=Object.assign({},cur,r);draw()}}})};
  const draw=()=>el.replaceChildren(...[
    h('div',{class:'chips rules'},
      forAnniv?opt({k:'once'},'한 번만'):opt({k:null},'안 함'),
      forAnniv?opt({k:'year'},'매년 '+M+'월 '+D+'일'):null,
      forAnniv&&n<=4?opt({k:'nthY',m:M,n,w},'매년 '+M+'월 '+ORD[n-1]+' 주 '+DOW[w]+'요일'):null,
      forAnniv&&last?opt({k:'nthY',m:M,n:-1,w},'매년 '+M+'월 마지막 주 '+DOW[w]+'요일'):null,
      L&&!L.leap?opt({k:'lunar',lm:L.m,ld:L.d},'매년 음력 '+L.m+'월 '+L.d+'일'):null,
      opt({k:'month',dom:D},'매월 '+D+'일'),
      n<=4?opt({k:'nthM',n,w},'매월 '+ORD[n-1]+' 주 '+DOW[w]+'요일'):null,
      last?opt({k:'nthM',n:-1,w},'매월 마지막 주 '+DOW[w]+'요일'):null,
      opt({k:'week'},'매주 (요일 고르기)')),
    cur.k==='week'?[h('div',{class:'chips dows'},DOW.map((x,i)=>{const has=cur.dows.includes(i);return h('button',{type:'button',class:'chip'+(has?' on':''),text:x,'aria-pressed':has?'true':'false',on:{click:()=>{cur.dows=has?cur.dows.filter(y=>y!==i):[...cur.dows,i];draw()}}})})),
      h('div',{class:'chips',style:'padding-left:0'},h('button',{type:'button',class:'chip',text:'월~금',on:{click:()=>{cur.dows=[0,1,2,3,4];draw()}}}),h('button',{type:'button',class:'chip',text:'주말',on:{click:()=>{cur.dows=[5,6];draw()}}}),h('button',{type:'button',class:'chip',text:'매일',on:{click:()=>{cur.dows=[0,1,2,3,4,5,6];draw()}}}))]:null,
    cur.k?h('p',{class:'rule-now',text:cur.k==='week'&&!cur.dows.length?'요일을 하나 이상 골라 주세요':'→ '+ruleLabel(cur,base)}):null].flat(Infinity).filter(x=>x!=null));
  draw();
  return {el,get:()=>cur.k?Object.assign({},cur,{dows:[...new Set(cur.dows)].sort()}):null};
}
const repRule=r=>r.type==='week'?{k:'week',dows:r.dows}:r.type==='nthM'?{k:'nthM',n:r.n,w:r.w}:{k:'month',dom:r.dom};
function ruleToRep(r,rule){r.type=rule.k==='week'?'week':rule.k==='nthM'?'nthM':'month';r.dows=rule.dows||[];if(rule.k==='month')r.dom=rule.dom;if(rule.k==='nthM'){r.n=rule.n;r.w=rule.w}return r}
const annivRule=a=>a.rule||(a.lunar?{k:'lunar',lm:a.lm,ld:a.ld}:a.yearly?{k:'year'}:{k:'once'});
// 반복에서 하나만 빼낼 때: 루틴이었다는 표시는 남김 (달력에서 글자 대신 ♥로)
function detach(t){if(!t.rep)return;const r=data().reps.find(x=>x.id===t.rep);if(r)r.skip=(r.skip||[]).concat(t.day);t.fromRep=t.rep;t.rep=null}
function isRoutine(t,repTexts){return !!(t.rep||t.fromRep||(repTexts&&repTexts.has(t.text)))}

// 반복 할 일: 보고 있는 달에 필요한 만큼만 만든다
function repHits(r,s){return ruleHits(repRule(r),'0000-00-00',s)}
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
function repLabel(r){return ruleLabel(repRule(r),todayS())}

function h(tag,a,...kids){const e=document.createElement(tag);
  if(a)for(const k in a){if(k==='on')for(const ev in a.on)e.addEventListener(ev,a.on[ev]);else if(k==='class')e.className=a[k];else if(k==='text')e.textContent=a[k];else if(a[k]!=null)e.setAttribute(k,a[k])}
  for(const c of kids.flat(Infinity)){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c))}
  return e}
let toastT;function toast(msg,undo,label){const old=document.querySelector('.toast');if(old)old.remove();
  const t=h('div',{class:'toast'+(undo?' has-undo':'')},h('span',{text:msg}),undo?h('button',{type:'button',text:label||'되돌리기',on:{click:()=>{t.remove();undo()}}}):null);
  document.body.append(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),undo?8000:2400)}
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
  const ap=m[1];let guess=false;
  if((ap==='오후'||ap==='저녁'||ap==='밤')&&hh<12)hh+=12;
  else if(ap==='오전'&&hh===12)hh=0;
  else if(!ap&&m[3]==null&&hh>=1&&hh<=6){hh+=12;guess=true} // "3시 병원" → 오후 3시
  else if(!ap&&hh>=5&&hh<12&&/저녁|밤|야식|회식|퇴근|술|모임|약속|픽업|하원|학원/.test(m[5]))hh+=12; // "7시 저녁 약속" → 19시
  if(hh>23||mm>59)return {text:line,time:null,bad:true};
  return {text:m[5].trim(),time:pad(hh)+':'+pad(mm),guess:guess?(hh-12):0};
}
// "내일 병원", "금요일 장보기", "25일 관리비", "11/20 치과", "다음 주 월요일 회의" → 날짜를 읽고 글에서 뺌
const WDN={'월':0,'화':1,'수':2,'목':3,'금':4,'토':5,'일':6};
function splitDate(line,extra){
  const t0=todayS();let m,day=null,rest=line;
  const addD=(s,n)=>{const x=parse(s);x.setDate(x.getDate()+n);return ymd(x)};
  if((m=line.match(/^(오늘|내일|모레)\s+(.+)$/))){day=addD(t0,{오늘:0,내일:1,모레:2}[m[1]]);rest=m[2]}
  else if((m=line.match(/^(다음\s*주|담주|이번\s*주)?\s*([월화수목금토일])(?:요일|욜)\s+(.+)$/))){
    const w=WDN[m[2]];let base;
    if(!m[1]&&extra&&Number.isInteger(extra.week)){const W=weeksOf(st.y,st.m)[extra.week];if(W)day=W[w]}
    if(!day){const x=parse(t0);x.setDate(x.getDate()-dowOf(t0));base=ymd(x);
      if(m[1]&&/다음|담/.test(m[1]))day=addD(base,7+w);else if(m[1])day=addD(base,w);else{day=addD(base,w);if(day<t0)day=addD(day,7)}}
    rest=m[3]}
  else if((m=line.match(/^(\d{1,2})\s*(?:\/|월\s*|\.)\s*(\d{1,2})\s*일?\s+(.+)$/))){const mo=+m[1],dd=+m[2];
    if(mo>=1&&mo<=12){let y=+t0.slice(0,4);const s=y+'-'+pad(mo)+'-'+pad(dd);if(isDate(s)){day=s<addD(t0,-60)&&isDate((y+1)+'-'+pad(mo)+'-'+pad(dd))?(y+1)+'-'+pad(mo)+'-'+pad(dd):s;rest=m[3]}}}
  else if((m=line.match(/^(\d{1,2})\s*일\s+(.+)$/))){const s=st.y+'-'+pad(st.m+1)+'-'+pad(+m[1]);if(isDate(s)){day=s;rest=m[2]}}
  return day?{day,rest:rest.trim()}:null}
function addTasks(text,extra){
  const lines=text.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>s.slice(0,200));
  if(!lines.length){toast('할 일을 적어 주세요');return 0}
  let bad=0,dated=0,guess=0;
  for(let l of lines){let dd=splitDate(l,extra);if(dd)l=dd.rest;let p=splitTime(l);
    if(!dd&&p.time){const d2=splitDate(p.text,extra);if(d2){dd=d2;p.text=d2.rest}} // "3시 금요일 치과"
    if(p.bad)bad++;if(p.guess&&!guess)guess=p.guess;
    const o=Object.assign({id:uid(),text:p.text,tag:st.addTag,rep:null,month:mKey(),week:null,day:null,time:p.time,done:false,doneAt:null},extra||{});
    if(!o.src)o.src=extra&&Number.isInteger(extra.week)?'w':'m'; // 먼슬리·위클리에서 적은 일은 시간이 있어도 먼슬리 목록에 보여요
    if(dd){o.day=dd.day;o.month=mkOf(dd.day);o.week=weekOfDay(dd.day);dated++}
    data().tasks.push(o)}
  // 덧붙일 안내는 차례로 하나씩 보여 주기
  const more=[];
  if(bad)more.push('25시처럼 없는 시간은 시간 없이 넣었어요. 길게 눌러 시간을 고칠 수 있어요');
  if(dated)more.push(dated+'개는 적은 날짜에 넣었어요 (예: 내일·금요일·25일)');
  if(guess)more.push(guess+'시는 오후 '+guess+'시로 넣었어요. 새벽이면 "오전 '+guess+'시"로 적어 주세요');
  more.forEach((m,i)=>setTimeout(()=>toast(m),1700+i*2600));
  save();return lines.length;
}
function toggle(t){const u=snap(t);delete t.autoDone;t.done=!t.done;t.doneAt=t.done?todayS():null;save();rerender();toast(t.done?md(t.doneAt)+' 완료로 기록했어요':'완료를 취소했어요',u)}
const tagName=i=>data().settings.tags[i];
const tagIdx=()=>data().settings.tags.map((_,i)=>i);
const colOf=i=>{const c=data().settings.tagColor;return c&&c[i]!=null?c[i]:i%8};
const hasTag=t=>t.tag!=null&&t.tag<data().settings.tags.length;
const COLORS=['빨강','주황','노랑','초록','파랑','보라','분홍','회색'];

function taskRow(t,extra,opt){
  const tags=[];
  if(t.done)tags.push(h('span',{class:'tag',text:(isDate(t.doneAt)?md(t.doneAt)+' ':'')+'완료'}));
  else if(isLate(t))tags.push(h('span',{class:'tag late',text:'밀린 일 · '+md(dueEnd(t))}));
  else if(t.day&&!(opt&&opt.noDay))tags.push(h('span',{class:'tag day',text:md(t.day)}));
  const pickB=opt&&opt.brush;
  return h('div',{class:'row'+(t.done?' done':'')+(hasTag(t)?' g'+colOf(t.tag):'')+(pickB&&st.brush===t.id?' brushing':''),'data-tid':t.id,'data-drop':opt&&opt.drop?'before:'+t.id:null},
    h('div',{class:'top'},h('button',{class:'txt',type:'button','aria-pressed':t.done?'true':'false','aria-label':(t.time?t.time+' ':'')+t.text+(t.done?' (완료)':'')+' · 누르면 줄 긋기(완료), 다시 누르면 취소, 길게 누르면 고치기',on:{click:()=>toggle(t),contextmenu:e=>{e.preventDefault();if(DR.on||Date.now()<DR.until)return;editSheet(t)}}},
      t.time&&!(opt&&opt.noTime)?[h('span',{class:'tm',text:t.time}),' ']:null,t.text,t.rep?h('span',{class:'rp',text:'↻'}):null),tags,
      pickB?h('button',{type:'button',class:'brbtn'+(st.brush===t.id?' on':''),'aria-label':st.brush===t.id?t.text+' 칠하기 그만':ro(t.text)+' 10분 칸 칠하기','aria-pressed':st.brush===t.id?'true':'false',text:'🖌',on:{click:e=>{e.stopPropagation();st.brush=st.brush===t.id?null:t.id;render();if(st.brush)toast(ro('"'+t.text.slice(0,10)+'"')+' 칠해요 · 오른쪽 칸을 톡톡 눌러요')}}}):null,
      opt&&opt.timer&&!t.done?timerBtn(t):null),extra||null);
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
      const old=L.map(t=>({t,month:t.month,week:t.week,day:t.day,src:t.src}));
      for(const t of L){t.month=mkOf(t0);t.week=where==='month'?null:weekOfDay(t0);t.day=where==='day'?t0:null;if(where!=='day')delete t.src}
      save();render();toast(L.length+'개를 '+label+' 옮겼어요',()=>{for(const o of old){o.t.month=o.month;o.t.week=o.week;o.t.day=o.day;if(o.src!==undefined)o.t.src=o.src}save();render()})}}}));
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
const SLOTS=162; // 0시~다음날 2시 59분
const slotT=n=>pad(Math.floor(n/6)%24)+':'+pad(n%6*10);
// 이미 시작한 칸인지 (앞으로 할 시간만 칠하면 계획일 뿐, 완료로 치지 않음)
const slotPast=(day,n)=>{const t=todayS();if(day<t)return true;if(day>t)return false;const d=new Date();return n*10<=d.getHours()*60+d.getMinutes()};
const hm=m=>m<=0?'0분':(m>=60?Math.floor(m/60)+'시간':'')+(m%60?(m>=60?' ':'')+m%60+'분':'');
function runOf(L,slot){const v=L[slot];let a=slot,b=slot;while(a>0&&L[a-1]===v)a--;while(b<SLOTS-1&&L[b+1]===v)b++;return [a,b]}
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
  let [h0,h1]=dayHours([d]);
  const diary=(((D.mood||{})[d]?D.mood[d]+' ':'')+((D.diary||{})[d]||'')).slice(0,200).trim();
  const W=1080,RH=56,top=220+(untimed.length?60+Math.ceil(untimed.length/2)*44:0),H=top+(h1-h0+1)*RH+190+(diary?110:0);
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const C={bg:cssVar('--paper'),card:cssVar('--card'),ink:cssVar('--ink'),mu:cssVar('--muted'),line:cssVar('--line'),acc:cssVar('--cobalt')};
  const col=it=>it&&okTag(it.tag)?cssVar('--t'+colOf(it.tag)):C.mu;
  const F='system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  g.fillStyle=C.bg;g.fillRect(0,0,W,H);
  const dt=parse(d);
  g.fillStyle=C.acc;g.font='800 120px '+F;g.fillText(String(dt.getDate()),60,150);
  g.fillStyle=C.ink;g.font='800 44px '+F;g.fillText(dt.getFullYear()+'년 '+(dt.getMonth()+1)+'월 '+dt.getDate()+'일 '+DOW[dowOf(d)]+'요일',260,105);
  g.fillStyle=C.mu;g.font='500 30px '+F;g.fillText(labelsOf(d).map(l=>l.t).join(' · ')||'덤푸 시간표',260,150);
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
    g.fillStyle=C.ink;g.font='800 28px '+F;g.textAlign='center';g.fillText(hourLabel(hh),HX+HW/2,ry+38);g.textAlign='left';
    const plans=timed.filter(t=>+t.time.slice(0,2)===hh).map(t=>({tx:t.time+' '+t.text,c:hasTag(t)?cssVar('--t'+colOf(t.tag)):C.ink,done:t.done}));
    for(let k=0;k<6;k++){const sl=hh*6+k,v=L[sl];if(v&&v.startsWith('e:')&&L[sl-1]!==v){const it=logItem(v);if(it)plans.push({tx:'✎ '+slotT(sl)+' '+it.text,c:col(it)})}}
    plans.slice(0,1).forEach(p=>{g.fillStyle=p.done?C.mu:p.c;g.font='600 26px '+F;const tx=p.tx.slice(0,20)+(plans.length>1?' (+'+(plans.length-1)+'개)':'');g.fillText(tx,PX+8,ry+37);if(p.done){g.fillRect(PX+8,ry+28,g.measureText(tx).width,3)}});
    for(let k=0;k<6;k++){const it=logItem(L[hh*6+k]);const x=GX+k*CW+3,yy=ry+8;
      g.fillStyle=it?col(it):C.card;g.fillRect(x,yy,CW-6,RH-16);g.strokeStyle=C.line;g.strokeRect(x,yy,CW-6,RH-16)}}
  g.beginPath();g.moveTo(PX,y+(h1-h0+1)*RH);g.lineTo(W-60,y+(h1-h0+1)*RH);g.stroke();
  g.beginPath();g.moveTo(HX,y);g.lineTo(HX,y+(h1-h0+1)*RH);g.stroke();
  const St=statsFor([d]);let sy=y+(h1-h0+1)*RH+60;
  g.fillStyle=C.ink;g.font='800 32px '+F;g.fillText('기록한 시간 '+hm(St.total)+(St.planned?'  ·  계획 '+St.did+'/'+St.planned+' ('+Math.round(St.did/St.planned*100)+'%)':''),60,sy);
  g.font='500 26px '+F;g.fillStyle=C.mu;g.fillText(St.items.slice(0,4).map(x=>x.text.slice(0,8)+' '+hm(x.min)).join('  ·  '),60,sy+46);
  if(diary){g.fillStyle=C.ink;g.font='italic 600 30px '+F;
    const lines=[];let cur='';for(const ch of '“'+diary+'”'){if(g.measureText(cur+ch).width>W-120){lines.push(cur);cur=ch}else cur+=ch}lines.push(cur);
    lines.slice(0,2).forEach((l,i)=>g.fillText(l,60,sy+110+i*40))}
  g.textAlign='right';g.fillStyle=C.mu;g.font='500 26px '+F;g.fillText('덤푸',W-60,H-30);g.textAlign='left';
  showImage(c,md(d)+' 그림',md(d)+' 시간표 그림','dumpu-'+d);
}
// 그림 보여주고 저장·공유 (데일리·월말 돌아보기 공통)
function showImage(c,title,alt,fname){
  const url=c.toDataURL('image/png');
  sheet(h('h3',{text:title}),h('img',{src:url,alt,class:'shot'}),
    B&&B.saveImage?[
      h('button',{class:'btn pri',type:'button',text:'사진첩에 저장',on:{click:()=>{const r=B.saveImage(url.split(',')[1],false);toast(r==='ok'?'사진첩(Pictures/덤푸)에 저장했어요':r==='old'?'이 폰(안드로이드 9 이하)에서는 저장이 안 돼요':'저장하지 못했어요')}}}),
      h('button',{class:'btn',type:'button',text:'공유하기 (카톡·인스타 등)',on:{click:()=>{const r=B.saveImage(url.split(',')[1],true);if(r!=='ok')toast(r==='old'?'이 폰에서는 공유가 안 돼요':'공유하지 못했어요')}}})]:
    [h('button',{class:'btn pri',type:'button',text:'그림 저장·공유',on:{click:()=>{c.toBlob(bl=>{if(!bl)return;const f=new File([bl],fname+'.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:'덤푸 '+title}).catch(()=>{});
        else{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=f.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}})}}}),
     h('p',{text:'아이폰은 사진을 길게 눌러 "사진에 저장"해도 돼요.'})]);
}
// 월말 돌아보기: 습관 달성률 · 한 일 · 실제로 한 시간 · 한 줄 일기 모음
function monthImage(){
  const D=data(),t0=todayS(),last=new Date(st.y,st.m+1,0).getDate();
  const days=[];for(let i=1;i<=last;i++)days.push(mKey()+'-'+pad(i));
  const upto=days.filter(d=>d<=t0);
  const H=D.habits.filter(x=>!x.arch||days.some(d=>habitDone(x,d)));
  const mt=D.tasks.filter(t=>t.month===mKey()&&inMonthList(t));
  const St=statsFor(days);
  const diaries=days.filter(d=>D.diary&&D.diary[d]).slice(-8);
  const mc={};days.forEach(d=>{const m=(D.mood||{})[d];if(m)mc[m]=(mc[m]||0)+1});const moodK=MOODS.filter(m=>mc[m]);
  const catKeys=Object.keys(St.cats).sort((a,b)=>St.cats[b]-St.cats[a]).slice(0,6);
  const W=1080,F='system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    const Ht=300+(H.length?120+H.length*(96)+40:0)+(mt.length?150:0)+(St.total?140+catKeys.length*56:0)+(diaries.length?110+diaries.length*92:0)+(moodK.length?150:0)+90;
  const c=document.createElement('canvas');c.width=W;c.height=Ht;const g=c.getContext('2d');
  const C={bg:cssVar('--paper'),card:cssVar('--card'),ink:cssVar('--ink'),mu:cssVar('--muted'),line:cssVar('--line'),acc:cssVar('--cobalt')};
  const col=t=>okTag(t)?cssVar('--t'+colOf(t)):C.mu;
  g.fillStyle=C.bg;g.fillRect(0,0,W,Ht);
  g.fillStyle=C.acc;g.font='800 110px '+F;g.fillText(MON[st.m],60,150);
  g.fillStyle=C.ink;g.font='800 46px '+F;g.fillText(st.y+'년 '+(st.m+1)+'월 돌아보기',60,225);
  let y=300;
  const secT=t=>{g.fillStyle=C.mu;g.font='700 30px '+F;g.fillText(t,60,y);y+=50};
  const bar=(x,yy,w,pc,color)=>{g.fillStyle=C.line;g.fillRect(x,yy,w,18);g.fillStyle=color;g.fillRect(x,yy,Math.max(0,w*pc/100),18)};
  if(H.length){secT('습관 달성률');
    const pm=prevMonthDays();
    for(const hb of H){const r=habitRate(hb,upto),sk=habitStreak(hb,t0>days[last-1]?days[last-1]:t0);
      const pr=pm.some(d=>habitDone(hb,d))?habitRate(hb,pm).pc:null;
      g.fillStyle=col(hb.tag);g.font='800 34px '+F;g.fillText(hbMark(hb)+' '+hb.name.slice(0,9),60,y+30);
      if(pr!=null){const dd=r.pc-pr;g.font='600 24px '+F;g.fillStyle=dd>=0?cssVar('--t3'):cssVar('--t0');g.fillText('지난달 '+pr+'% → 이번 달 '+r.pc+'% ('+(dd>=0?'+':'')+dd+'%p)',440,y+62)}
      bar(440,y+10,380,r.pc,col(hb.tag));
      g.fillStyle=C.ink;g.font='700 30px '+F;g.textAlign='right';g.fillText(r.pc+'%'+(sk>=2?'  🔥'+sk+(hb.goal?'주':''):''),W-60,y+32);g.textAlign='left';y+=96}
    y+=20}
  if(mt.length){secT('이번 달 할 일');const dn=mt.filter(t=>t.done).length,pc=Math.round(dn/mt.length*100);
    g.fillStyle=C.ink;g.font='800 40px '+F;g.fillText(dn+' / '+mt.length+'개 끝냈어요',60,y+30);bar(560,y+12,W-620,pc,C.acc);y+=100}
  if(St.total){secT('기록한 시간 '+hm(St.total));
    for(const k of catKeys){const m=St.cats[k];const nm=k==='n'?'카테고리 없음':tagName(+k);const color=k==='n'?C.mu:cssVar('--t'+colOf(+k));
      g.fillStyle=color;g.fillRect(60,y+4,20,20);g.fillStyle=C.ink;g.font='600 30px '+F;g.fillText(nm.slice(0,8),96,y+26);
      bar(330,y+8,520,Math.round(m/St.total*100),color);g.textAlign='right';g.fillText(hm(m),W-60,y+28);g.textAlign='left';y+=56}
    if(St.items.length){g.fillStyle=C.mu;g.font='500 26px '+F;g.fillText('많이 한 것: '+St.items.slice(0,3).map(x=>x.text.slice(0,8)+' '+hm(x.min)).join(' · '),60,y+24)}
    y+=84}
  if(moodK.length){secT('이번 달 기분');g.fillStyle=C.ink;g.font='600 40px '+F;let x=60;for(const m of moodK){const tx=m+' '+mc[m]+'일';g.fillText(tx,x,y+36);x+=g.measureText(tx).width+40}y+=100}
  if(diaries.length){secT('한 줄 일기');
    for(const d of diaries){g.fillStyle=C.acc;g.font='800 28px '+F;g.fillText(md(d),60,y+28);
      g.fillStyle=C.ink;g.font='italic 500 28px '+F;let tx=((D.mood||{})[d]?D.mood[d]+' ':'')+D.diary[d];let line='';const lines=[];for(const ch of tx){if(g.measureText(line+ch).width>W-320){lines.push(line);line=ch}else line+=ch}lines.push(line);
      lines.slice(0,2).forEach((l,i)=>g.fillText(l,240,y+28+i*36));y+=92}}
  g.fillStyle=C.mu;g.font='500 26px '+F;g.textAlign='right';g.fillText('덤푸',W-60,Ht-34);g.textAlign='left';
  showImage(c,(st.m+1)+'월 돌아보기',st.y+'년 '+(st.m+1)+'월 돌아보기 그림','dumpu-'+mKey());
}
// ── 할 일 타이머: ▶ 누르고 하다가 ■ 누르면 그 시간이 10분 칸에 저절로 칠해져요
const TMAX=12*3600e3; // 깜빡 켜 둔 타이머는 12시간까지만 셈
function timerBtn(t){const on=data().timer&&data().timer.id===t.id;
  return h('button',{type:'button',class:'tmgo'+(on?' on':''),'aria-label':on?t.text+' 타이머 멈추기':t.text+' 타이머 시작',text:on?'■':'▶',on:{click:e=>{e.stopPropagation();on?stopTimer(false):startTimer(t)}}})}
function startTimer(t){const D=data();const r=D.timer?stopTimer(false,true):null;D.timer={id:t.id,start:Date.now()};save();render();toast((r&&r.n?'"'+r.text.slice(0,10)+'" '+hm(r.mins)+' 기록 · ':'')+'⏱ "'+t.text.slice(0,14)+'" 시작! 끝나면 ■ 를 눌러요')}
function fmtDur(ms){const s=Math.floor(ms/1000),hh=Math.floor(s/3600),mm=Math.floor(s%3600/60),ss=s%60;return (hh?hh+':'+pad(mm):mm)+':'+pad(ss)}
// 타이머 시간 → 날짜·10분 칸 (새벽 0~2시는 전날 24~26시 칸)
function slotOfTime(ms){const x=new Date(ms);let hh=x.getHours(),day=ymd(x);
  if(hh<3){const p=new Date(x);p.setDate(p.getDate()-1);day=ymd(p);hh+=24}
  return {day,slot:hh*6+Math.floor(x.getMinutes()/10)}}
// 할 일 이름과 같은 습관이 있으면 오늘 칸을 저절로 체크 (예: 할 일 "영어 공부" → 습관 "영어 공부")
const normN=x=>String(x||'').replace(/\s+/g,'').toLowerCase();
function habitAuto(text){const k=normN(text);if(k.length<2)return null;const d=todayS();
  const hb=activeHabits().find(x=>{const n=normN(x.name);return n.length>=2&&(n===k||k.includes(n)||n.includes(k))&&habitOn(x,d)&&!habitDone(x,d)});
  if(!hb)return null;const D=data();D.hchk=D.hchk||{};D.hchk[d]=[...(D.hchk[d]||[]),hb.id];save();
  return {hb,undo:()=>{const a=(data().hchk||{})[d]||[];data().hchk[d]=a.filter(x=>x!==hb.id);if(!data().hchk[d].length)delete data().hchk[d];save();render()}}}
function stopTimer(done,quiet){
  const D=data(),T=D.timer;if(!T)return;delete D.timer;
  const t=D.tasks.find(x=>x.id===T.id);let end=Date.now();if(T.focus)end=Math.min(end,T.start+T.focus*60e3);const cut=end-T.start>TMAX;if(cut)end=T.start+TMAX;
  const per={};for(let m=T.start;m<end;m+=60e3){const o=slotOfTime(m),k=o.day+'|'+o.slot;per[k]=(per[k]||0)+Math.min(60e3,end-m)}
  let n=0,kept=0;
  if(t)for(const k in per){if(per[k]<5*60e3)continue;const [day,sl]=k.split('|');if(+sl>=SLOTS)continue;
    D.logs[day]=D.logs[day]||{};if(D.logs[day][sl]&&D.logs[day][sl]!==t.id){kept++;continue}D.logs[day][sl]=t.id;n++}
  if(t&&done&&!t.done){t.done=true;t.doneAt=todayS()}
  save();render();const mins0=Math.round((end-T.start)/60e3);if(quiet)return {n,mins:mins0,text:t?t.text:''};
  const mins=Math.round((end-T.start)/60e3);
  if(!t){toast('할 일이 지워져서 기록하지 않았어요');return}
  const ha=(n||done)?habitAuto(t.text):null;if(ha){render();toast((n?'⏱ '+hm(mins)+' 했어요 · ':'')+'습관 "'+ha.hb.name+'"도 오늘 체크했어요',ha.undo,'체크 취소');return}
  toast(n?'⏱ '+hm(mins)+' 했어요 · 10분 칸 '+n+'개에 칠했어요'+(kept?' (이미 칠한 '+kept+'칸은 그대로)':'')+(cut?' · 12시간까지만 셌어요':''):mins<5?'5분보다 짧아서 기록하지 않았어요':'이미 칠한 칸이라 그대로 뒀어요');
}
// 🍅 끝: 같은 이름 습관 체크 + 5분 쉬기 / 한 번 더
function focusDone(T,r){const t=data().tasks.find(x=>x.id===T.id),ha=t&&r&&r.n?habitAuto(t.text):null;render();
  const close=sheet(h('h3',{text:'🍅 '+T.focus+'분 집중 끝!'}),
    h('p',{text:(r&&r.n?'10분 칸 '+r.n+'개에 칠했어요.':'')+(ha?' 습관 "'+ha.hb.name+'"도 오늘 체크했어요.':'')+' 잠깐 쉬어 갈까요?'}),
    h('button',{class:'btn pri',type:'button',text:'☕ 5분 쉬기 (끝나면 알려 드려요)',on:{click:()=>{st.brk={until:Date.now()+5*60e3,id:T.id};close();render();toast('☕ 5분 쉬어요')}}}),
    t&&!t.done?h('button',{class:'btn',type:'button',text:'🍅 한 번 더 (25분)',on:{click:()=>{data().timer={id:T.id,start:Date.now(),focus:25};save();close();render();toast('🍅 25분 집중 다시 시작!')}}}):null,
    t&&!t.done?h('button',{class:'btn',type:'button',text:'✓ 다 했어요',on:{click:()=>{t.done=true;t.doneAt=todayS();save();close();render();toast('"'+t.text.slice(0,14)+'" 완료로 기록했어요')}}}):null,
    ha?h('button',{class:'btn',type:'button',text:'습관 체크 취소',on:{click:()=>{ha.undo();close();toast('습관 체크를 취소했어요')}}}):null,
    h('button',{class:'btn',type:'button',text:'그만할래요',on:{click:()=>close()}}))}
function tmText(T){if(!T.focus)return fmtDur(Date.now()-T.start);const left=T.start+T.focus*60e3-Date.now();return left>0?fmtDur(left+999)+' 남음':'끝!'}
function timerBar(){const D=data(),T=D.timer;
  if(!T&&st.brk)return h('div',{class:'tmbar brk',role:'status'},h('span',{class:'tmt'},'☕ 쉬는 중 ',h('span',{class:'tmc',text:fmtDur(Math.max(0,st.brk.until-Date.now())+999)+' 남음'})),h('button',{type:'button',text:'그만 쉬기',on:{click:()=>{st.brk=null;render()}}}));
  if(!T)return null;const t=D.tasks.find(x=>x.id===T.id);
  if(!t){delete D.timer;save();return null}
  return h('div',{class:'tmbar'+(T.focus?' focus':''),role:'status'},h('span',{class:'tmt'},T.focus?'🍅 ':'⏱ ',h('b',{text:t.text.slice(0,14)}),' ',h('span',{class:'tmc',text:tmText(T)})),
    !T.focus?h('button',{type:'button',text:'🍅 25분',title:'25분 동안 집중하고 끝나면 알려줘요','aria-label':'25분 집중 모드로 바꾸기',on:{click:()=>{const id=T.id,r=stopTimer(false,true);data().timer={id,start:Date.now(),focus:25};save();render();toast((r&&r.n?'지금까지 '+hm(r.mins)+' 기록했어요 · ':'')+'🍅 25분 집중 시작! 끝나면 알려 드려요')}}}):null,
    h('button',{type:'button',text:'■ 그만',on:{click:()=>stopTimer(false)}}),h('button',{type:'button',class:'ok',text:'✓ 다 했어요',on:{click:()=>stopTimer(true)}}))}
setInterval(()=>{
  if(st.brk){const left=st.brk.until-Date.now(),b=document.querySelector('.tmbar.brk .tmc');
    if(left<=0){const id=st.brk.id;st.brk=null;try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(_){}render();
      const tk=data().tasks.find(x=>x.id===id);toast('☕ 쉬는 시간 끝!',tk&&!tk.done?()=>{data().timer={id,start:Date.now(),focus:25};save();render();toast('🍅 25분 집중 시작!')}:null,'🍅 한 번 더');}
    else if(b)b.textContent=fmtDur(left+999)+' 남음'}
  const T=data().timer;if(!T)return;const e=document.querySelector('.tmbar .tmc');
  if(T.focus&&Date.now()>=T.start+T.focus*60e3){const r=stopTimer(false,true);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(_){}focusDone(T,r);return}
  if(e)e.textContent=tmText(T)},1000);
// ── 기분 모아 보기 (습관 탭): 이번 달 기분, 기분 좋은 날 한 것, 1년 기분 한눈에
const MSCORE={'😆':5,'😊':4,'🙂':4,'😐':3,'😴':3,'😔':2,'😢':1,'😠':1};
function moodBox(){
  const D=data(),M=D.mood||{},keys=Object.keys(M);if(!keys.length)return h('div',{class:'rbox'},h('b',{text:'기분'}),h('p',{class:'hint',style:'margin:4px 0 0',text:'데일리 맨 아래 "오늘의 한 줄"에서 기분을 고르면, 여기서 기분 좋은 날 무엇을 했는지 보여 드려요.'}));
  const mk=mKey(),mon=keys.filter(k=>k.slice(0,7)===mk),cnt={};mon.forEach(k=>cnt[M[k]]=(cnt[M[k]]||0)+1);
  // 습관을 한 날 vs 안 한 날의 '기분 좋은 날' 비율 (최근 90일, 기분을 고른 날만)
  const t0=todayS(),cut=ymd(new Date(parse(t0).getTime()-90*864e5)),days=keys.filter(k=>k>=cut&&k<=t0);
  const good=k=>MSCORE[M[k]]>=4,finds=[];
  for(const hb of activeHabits()){const on=days.filter(k=>habitOn(hb,k));const a=on.filter(k=>habitDone(hb,k)),b=on.filter(k=>!habitDone(hb,k));
    if(a.length<3||b.length<3)continue;const pa=Math.round(a.filter(good).length/a.length*100),pb=Math.round(b.filter(good).length/b.length*100);
    if(pa-pb>=20)finds.push({hb,pa,pb,d:pa-pb})}
  finds.sort((x,y)=>y.d-x.d);
  // 1년 기분 한눈에 (월 12줄 × 날짜)
  const y=st.y,grid=h('div',{class:'ypx','aria-label':y+'년 기분 한눈에'});
  for(let m=0;m<12;m++){const row=h('div',{class:'ypr'},h('span',{class:'ypm',text:(m+1)+''}));const last=new Date(y,m+1,0).getDate();
    for(let d=1;d<=31;d++){const k=y+'-'+pad(m+1)+'-'+pad(d),v=M[k];row.append(h('i',{class:d>last?'x':v?'s'+MSCORE[v]:'',title:v?md(k)+' '+v:null}))}grid.append(row)}
  return h('div',{class:'rbox'},h('b',{text:(st.m+1)+'월 기분'}),
    mon.length?h('p',{class:'mcnt'},MOODS.filter(m=>cnt[m]).map(m=>h('span',{text:m+' '+cnt[m]+'일'}))):h('p',{class:'hint',style:'margin:4px 0',text:'이번 달은 아직 고른 기분이 없어요.'}),
    finds.length?finds.slice(0,3).map(f=>h('p',{class:'mfind'},h('b',{text:hbMark(f.hb)+' '+f.hb.name}),' 한 날은 기분 좋은 날이 '+f.pa+'%, 안 한 날은 '+f.pb+'%예요')):days.length>=14?h('p',{class:'hint',style:'margin:4px 0',text:'아직 기분과 크게 이어진 습관이 보이지 않아요. 더 쌓이면 알려 드려요.'}):h('p',{class:'hint',style:'margin:4px 0',text:'기분을 2주 넘게 고르면, 기분 좋은 날 어떤 습관을 했는지 알려 드려요.'}),
    h('div',{class:'sec',style:'margin-top:10px',text:y+'년 기분 한눈에'}),grid,
    h('p',{class:'ypl'},h('i',{class:'s5'}),'아주 좋음 ',h('i',{class:'s4'}),'좋음 ',h('i',{class:'s3'}),'보통 ',h('i',{class:'s2'}),'안 좋음 ',h('i',{class:'s1'}),'힘듦'))}
// 오늘 기분 (한 줄 일기 위)
function moodRow(d){const D=data();D.mood=D.mood||{};const cur=D.mood[d];
  return h('div',{class:'moods',role:'group','aria-label':'오늘 기분'},MOODS.map(m=>h('button',{type:'button',class:'mood'+(cur===m?' on':''),'aria-pressed':cur===m?'true':'false',text:m,
    on:{click:()=>{if(cur===m)delete D.mood[d];else D.mood[d]=m;save();render()}}})))}
// 한 줄 일기
function diaryBox(d){
  const ta=h('textarea',{id:'diary',rows:'2',maxlength:'200',class:'diary',placeholder:'오늘 어땠나요? 한 줄로 남겨요'});
  ta.value=(data().diary||{})[d]||'';
  let tm=null;
  const keep=()=>{const v=ta.value.trim().slice(0,200);const D=data();D.diary=D.diary||{};if(v)D.diary[d]=v;else delete D.diary[d];save()};
  ta.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(keep,600)});
  ta.addEventListener('blur',()=>{clearTimeout(tm);keep()});
  return h('div',null,moodRow(d),ta,h('p',{class:'hint',style:'margin:2px 0 0;text-align:right',text:'기분 하나 고르고 한 줄 남겨요 · 저절로 저장, 달력·그림에도 나와요'}));
}
// 한 주 시간표 모아 보기 (잠·일·운동 패턴)
function weekGrid(w){
  const D=data(),S=D.settings;
  if(!w.some(d=>D.logs[d]&&Object.keys(D.logs[d]).length))return null;
  const [h0,h1]=dayHours(w);
  const t0=todayS();
  const g=h('div',{class:'wg'},h('div',{class:'wg-r wg-head'},h('span'),w.map((d,i)=>h('button',{type:'button',class:'wg-d'+(d===t0?' tdy':''),text:DOW[i]+' '+parse(d).getDate(),on:{click:()=>{st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}}))));
  for(let hh=h0;hh<=h1;hh++){
    g.append(h('div',{class:'wg-r'+(hh===24?' mid':'')},h('span',{class:'wg-h',text:hourLabel(hh)}),
      w.map(d=>{const L=D.logs[d]||{};return h('span',{class:'wg-c'},[0,1,2,3,4,5].map(k=>{const it=logItem(L[hh*6+k]);return h('i',{class:it?itemCls(it):''})}))})));
  }
  return [h('div',{class:'sec',text:'이번 주 시간표 · 요일을 누르면 그 날로'}),g];
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
// 보여 줄 시간: 기본 6~22시, 새벽은 4시부터, 밤은 23시~새벽 2시. 기록이 있으면 넓힘
function dayHours(ds){
  const D=data(),S=D.settings;let h0=S.early?4:6,h1=S.late?26:22;
  for(const d of ds){for(const t of D.tasks)if(t.day===d&&t.time){const x=+t.time.slice(0,2);if(x<h0)h0=x;if(x>h1)h1=x}
    const L=(D.logs||{})[d]||{};for(const k in L){const x=Math.floor(+k/6);if(x<h0)h0=x;if(x>h1)h1=x}}
  return [h0,h1];
}
const hourLabel=hh=>String(hh%24);
// 루틴 달성률: 반복 할 일별로 오늘까지 몇 번 했는지 (♥)
function routineBox(days,label){
  const D=data(),t0=todayS();
  const upto=days.filter(d=>d<=t0);
  if(!upto.length)return null;
  const rows=D.reps.map(r=>{const inst=D.tasks.filter(t=>t.rep===r.id&&upto.includes(t.day));return {r,n:inst.length,done:inst.filter(t=>t.done).length}}).filter(x=>x.n);
  if(!rows.length)return null;
  return h('div',{class:'rbox'},h('b',{text:label+' 반복 일정'}),rows.map(x=>{const p=Math.round(x.done/x.n*100);const cls=okTag(x.r.tag)?colOf(x.r.tag):'n';
    return h('div',{class:'rrow'},h('span',{class:'rn tc'+cls,text:'♥ '+x.r.text.slice(0,10)}),h('span',{class:'rbar'},h('i',{class:'c'+cls,style:'width:'+p+'%'})),h('span',{class:'rp',text:x.done+'/'+x.n+' · '+p+'%'}))}));
}
function actualBox(days,label){
  const S=statsFor(days);
  if(!S.total&&!S.planned)return null;
  const catKeys=Object.keys(S.cats).sort((a,b)=>S.cats[b]-S.cats[a]);
  return h('div',{class:'tsum'},
    h('b',{text:label+' 기록한 시간 '+hm(S.total)}),
    S.planned?h('span',{class:'ratio'},'시간 정한 일 '+S.planned+'개 중 '+S.did+'개 했어요 ',h('em',{text:Math.round(S.did/S.planned*100)+'%'})):null,
    S.total?h('div',{class:'bars'},catKeys.map(k=>h('i',{class:k==='n'?'cn':'c'+colOf(+k),style:'flex:'+S.cats[k],title:(k==='n'?'카테고리 없음':tagName(+k))+' '+hm(S.cats[k])}))):null,
    catKeys.map(k=>h('span',null,h('i',{class:k==='n'?'cn':'c'+colOf(+k)}),(k==='n'?'카테고리 없음':tagName(+k))+' '+hm(S.cats[k]))),
    S.items.length?h('small',{text:'많이 한 것: '+S.items.slice(0,3).map(x=>x.text.slice(0,10)+' '+hm(x.min)).join(' · ')}):null);
}

// ── 달력 (먼슬리 위쪽)
function calGrid(){
  const ws=weeksOf(st.y,st.m);const t0=todayS();const all=data().tasks;
  const repTexts=new Set(data().reps.map(r=>r.text));
  const grid=h('div',{class:'cal'+(st.pick?' picking':'')},DOW.map((x,i)=>h('div',{class:'dow'+(i===6?' sun':i===5?' sat':''),text:x})));
  const H=data().habits,HC=data().hchk||{};
  ws.flat().forEach(d=>{const dt=parse(d);const out=dt.getMonth()!==st.m;
    const onDay=all.filter(t=>t.day===d).sort((x,y)=>(x.done-y.done)||byTime(x,y));
    const doneOther=all.filter(t=>t.done&&t.doneAt===d&&t.day!==d);
    const dots=[...onDay,...doneOther];
    const hd=H.filter(x=>(HC[d]||[]).includes(x.id));
    const labs=labelsOf(d);const red=dowOf(d)===6||labs.some(l=>l.c==='hol');
    grid.append(h('button',{type:'button',class:(out?'out ':'')+(d===t0?'today ':'')+(d===st.sel&&!st.pick?'sel ':'')+(red?'red ':dowOf(d)===5?'blue ':''),
      'data-d':d,'data-drop':'day:'+d,'aria-label':md(d)+(labs.length?' '+labs.map(l=>l.t).join(' '):'')+' 할 일 '+dots.filter(t=>!t.done).length+'개, 한 일 '+dots.filter(t=>t.done).length+'개'+(hd.length?', 습관 '+hd.length+'개':''),on:{click:()=>calTap(d)}},
      h('span',{class:'dl'},h('span',{class:'d',text:String(dt.getDate())}),(data().mood||{})[d]?h('span',{class:'cm',text:data().mood[d]}):null,labs.length?h('span',{class:'lab '+labs[0].c,text:labs[0].t}):null),
      hd.length?h('span',{class:'rt-row'},(hd.length>2?hd.slice(0,1):hd).map(x=>h('i',{class:'rt on tc'+(okTag(x.tag)?colOf(x.tag):'n')+(x.icon?' em':''),text:hbMark(x)})),hd.length>2?h('i',{class:'rt more',text:'+'+(hd.length-1)}):null):null, // 칸이 좁으니 2개까지, 3개부터는 1개 + 나머지 개수
      dots.length?h('span',{class:'mk'},dots.slice(0,6).map(t=>h('i',{class:(t.done?'':'p ')+(hasTag(t)?'c'+colOf(t.tag):'cn')}))):null))});
  return grid;
}
function calTap(d){
  const dt=parse(d);
  if(st.pick){const t=data().tasks.find(x=>x.id===st.pick);st.pick=null;
    if(t){detach(t)
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
      h('button',{type:'button',class:'pop-t','aria-pressed':t.done?'true':'false',on:{click:e=>{e.stopPropagation();toggle(t)},contextmenu:e=>{e.preventDefault();if(DR.on||Date.now()<DR.until)return;closePop();editSheet(t)}}},t.time?[h('span',{class:'tm',text:t.time}),' ']:null,t.text))):h('p',{class:'pop-e',text:'할 일이 없어요'}),
    list.length?h('p',{class:'pop-e',text:'길게 눌러 다른 날짜로 끌어요'}):null,
    list.length>4?h('p',{class:'pop-e',text:'+'+(list.length-4)+'개 더'}):null,
    (data().diary||{})[d]||(data().mood||{})[d]?h('p',{class:'pop-d',text:((data().mood||{})[d]?data().mood[d]+' ':'')+((data().diary||{})[d]?'“'+data().diary[d].slice(0,40)+'”':'')}):null,
    h('div',{class:'pop-a'},
      h('button',{type:'button',text:'+ 할 일',on:{click:e=>{e.stopPropagation();closePop();quickAdd(d)}}}),
      h('button',{type:'button',text:'+ 기념일',on:{click:e=>{e.stopPropagation();closePop();annivSheet(d)}}}),
      h('button',{type:'button',text:'데일리 ›',on:{click:e=>{e.stopPropagation();closePop();st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}})));
  top.append(pop);
  // 날짜 위에 놓고, 위에 자리가 없으면 아래에
  const tr=top.getBoundingClientRect(),cr=cell.getBoundingClientRect();
  // 글자 크기(zoom)를 바꿔도 화면 밖으로 안 나가게: 화면 좌표 ↔ 배치 좌표 비율
  const k=top.offsetWidth?tr.width/top.offsetWidth:1,pr=pop.getBoundingClientRect(),pw=pr.width,ph=pr.height;
  let x=cr.left+cr.width/2-tr.left-pw/2;x=Math.max(4,Math.min(x,tr.width-pw-4));
  let y=cr.top-tr.top-ph-8,below=false;
  if(cr.top-ph-8<tr.top+40){y=cr.bottom-tr.top+8;below=true}
  pop.style.left=(x/k)+'px';pop.style.top=(y/k)+'px';
  pop.style.setProperty('--ax',((cr.left+cr.width/2-tr.left-x)/k)+'px');
  pop.classList.add(below?'below':'above');
}
document.addEventListener('click',e=>{if(popDay&&!e.target.closest('.pop,.cal'))closePop()},true);
window.addEventListener('scroll',()=>{if(popDay&&!document.querySelector('.mtop'))closePop()},{passive:true});
// 먼슬리 할 일 적기 창: 위 달력에 가려 키보드에 안 보이던 문제 해결
function multiAdd(title,extra,where){
  const ta=h('textarea',{rows:'5',placeholder:'한 줄에 하나씩 적어요\n예: 병원 예약\n    운동\n    3시 치과'});
  const close=sheet(h('h3',{text:title}),ta,tagPicker(),h('button',{class:'btn pri',type:'button',text:'추가',on:{click:()=>{const n=addTasks(ta.value,extra);if(n){close();render();toast(n+'개를 '+where+' 추가했어요')}}}}));
  setTimeout(()=>ta.focus(),60);
}
function monthAddSheet(){
  const ta=h('textarea',{id:'mAdd',rows:'5',placeholder:'한 줄에 하나씩 적어요\n예: 병원 예약\n    운동\n    3시 치과'});
  let tag=st.addTag;const tagRow=h('div',{class:'chips',style:'padding-left:0'});
  const drawT=()=>tagRow.replaceChildren(...[null,...tagIdx()].map(i=>h('button',{type:'button',class:'chip'+(tag===i?' on':''),on:{click:()=>{tag=i;drawT()}}},i==null?'없음':[h('i',{class:'c'+colOf(i)}),tagName(i)])));
  drawT();
  const base=isThisMonth()?todayS():mKey()+'-01';
  const picker=rulePicker(base,null,false);
  const close=sheet(h('h3',{text:(st.m+1)+'월 할 일 적기'}),ta,
    h('div',{class:'sec',text:'카테고리'}),tagRow,
    h('div',{class:'sec',text:'반복 (학원·청소 같은 반복 일정)'}),picker.el,h('p',{class:'hint',text:'헬스·영어공부 같은 습관은 아래 습관 탭에서 체크해요.'}),
    h('button',{class:'btn pri',type:'button',text:'추가',on:{click:()=>{
      const rule=picker.get();if(rule&&rule.k==='week'&&!rule.dows.length){toast('반복할 요일을 골라 주세요');return}
      const lines=ta.value.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>x.slice(0,200));
      if(!lines.length){toast('할 일을 적어 주세요');return}
      st.addTag=tag;
      if(rule){const D=data();for(const l of lines){const p=splitTime(l);D.reps.push(ruleToRep({id:uid(),text:p.text,tag,time:p.time,start:base,skip:[]},rule))}
        save();ensureRepeats(st.y,st.m);close();render();toast(lines.length+'개를 '+ruleLabel(rule,base)+' 반복 일정으로 넣었어요');return}
      const n=addTasks(lines.join('\n'));if(n){close();render();toast(n+'개 추가했어요')}}}}));
  setTimeout(()=>ta.focus(),60);
}
// 말풍선의 '+ 할 일': 그 날짜에 바로 적기
function quickAdd(d){
  const ci=h('input',{id:'qAdd',placeholder:'예: 3시 병원 (줄바꿈 없이 한 개)',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(ci.value,{month:mkOf(d),week:weekOfDay(d),day:d,src:'d'});if(n){close();render();showPop(d);toast(md(d)+'에 추가했어요')}}
  const close=sheet(h('h3',{text:md(d)+'에 추가'}),ci,h('button',{class:'btn pri',type:'button',text:'추가',on:{click:go}}));
  setTimeout(()=>ci.focus(),50);
}

const isDayItem=t=>!!t.day&&(t.src==='d'||(t.src==null&&!!t.time)); // 데일리에서 적은 하루 일정 (예전 기록은 날짜+시간 있는 것). 날짜가 없으면 먼슬리·위클리 목록에 남김
const inMonthList=t=>!t.rep&&!t.fromRep&&!isDayItem(t);
// ── 먼슬리 (위에 달력 고정 + 아래 한 달 할 일)
function vMonthly(){
  const ws=weeksOf(st.y,st.m);
  const all=data().tasks;
  const ts=all.filter(t=>t.month===mKey()&&inMonthList(t));
  const reps=all.filter(t=>t.month===mKey()&&t.rep);
  const dayItems=all.filter(t=>t.month===mKey()&&!t.rep&&!t.fromRep&&isDayItem(t)).length;
  const pickT=st.pick?all.find(x=>x.id===st.pick):null;
  // 한 달 할 일
  const box=[h('button',{type:'button',class:'addbig',on:{click:()=>monthAddSheet()}},h('b',{text:'+ 이번 달 할 일 적기'}),h('span',{text:'한 번에 여러 개 적기 · 카테고리 · 반복(매주·월~금·매월)'})),
    h('p',{class:'hint',text:'누르면 완료 · 길게 누르면 고치기 · 길게 누른 채 달력 날짜로 끌면 그 날로 옮겨져요'})];
  const undone=ts.filter(t=>!t.done).sort(byOrd),done=ts.filter(t=>t.done);
  const row=t=>taskRow(t,h('div',{class:'chips'},
    h('span',{class:'wklb','aria-hidden':'true',text:'주차'}),ws.map((w,i)=>h('button',{class:'chip wk'+(t.week===i&&!t.day?' on':''),type:'button',text:String(i+1),'aria-label':(i+1)+'주차','aria-pressed':t.week===i&&!t.day?'true':'false',on:{click:()=>{if(t.week===i&&!t.day){t.week=null}else{t.week=i;t.day=null}save();render()}}})),
    h('button',{type:'button',class:'chip'+(t.day?' on':'')+(st.pick===t.id?' pk':''),text:t.day?'📅 '+md(t.day):'📅 날짜',on:{click:()=>{st.pick=st.pick===t.id?null:t.id;render();if(st.pick)document.querySelector('.cal').scrollIntoView({behavior:'smooth',block:'center'})}}}),
    t.day?timeChip(t):null),{drop:!t.done});
  const unassigned=undone.filter(t=>t.week==null&&!t.day).length;
  const repDone=reps.filter(t=>t.done).length;
  // 2. 달력은 위에 고정, 아래 할 일만 스크롤
  return [h('div',{class:'mtop'},head('먼슬리',ts.length?'할 일 '+ts.length+'개 · '+done.length+'개 완료'+(unassigned?' · 날짜 안 정한 '+unassigned+'개':''):'달력 보며 할 일 정하기'),
    pickT?h('div',{class:'pickbar'},h('span',null,'"',h('b',{text:pickT.text.slice(0,20)}),'" 언제 할까요? 달력에서 날짜를 눌러 주세요'),h('button',{type:'button',text:'취소',on:{click:()=>{st.pick=null;render()}}})):null,
    calGrid()),
    actualBox(weeksOf(st.y,st.m).flat().filter(x=>mkOf(x)===mKey()),'이번 달'),
    h('button',{type:'button',class:'imgbtn',style:'display:block;margin:2px 0 8px auto',text:'🖼 이번 달 돌아보기',on:{click:()=>monthImage()}}),
    isThisMonth()?lateBox('month'):null,
    box,
    ts.length?null:emptyBox('아직 이번 달 할 일이 없어요.'),
    undone.length?h('div',{class:'list','data-list':'m'},undone.map(row)):null,
    done.length?[h('div',{class:'sec',text:'완료 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    dayItems?h('p',{class:'hint',style:'margin-top:12px',text:'📅 데일리에서 적은 하루 일정 '+dayItems+'개는 달력 날짜를 누르면 보여요.'}):null,
    reps.length?h('p',{class:'hint',style:'margin-top:12px',text:'↻ 반복 일정 '+reps.length+'번 중 '+repDone+'번 했어요 (달력 점·데일리에 나와요). 습관은 습관 탭에서 체크해요.'}):null];
}

// ── 위클리
function vWeekly(){
  const ws=weeksOf(st.y,st.m);
  if(st.week==null||st.week>=ws.length)st.week=curWeekIdx();
  const w=ws[st.week];const t0=todayS();
  const all=data().tasks.filter(t=>t.day?w.includes(t.day):(t.month===mKey()&&t.week===st.week));
  const ts=all.filter(inMonthList),dayN=all.length-ts.length;
  const inp=h('input',{id:'wAdd',placeholder:(st.week+1)+'주차에 바로 추가',maxlength:'200',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const n=addTasks(inp.value,{week:st.week});if(n){inp.value='';render();toast((st.week+1)+'주차에 추가했어요')}}
  const strip=h('div',{class:'strip'},w.map((d,i)=>{const n=data().tasks.filter(t=>t.day===d).length;const labs=labelsOf(d);const red=i===6||labs.some(l=>l.c==='hol');
    return h('button',{type:'button','data-drop':'day:'+d,class:(n?'has ':'')+(d===t0?'tdy ':'')+(red?'red':''),title:labs.map(l=>l.t).join(', '),on:{click:()=>{st.day=d;st.tab='daily';window.scrollTo(0,0);render()}}},DOW[i],h('b',{text:String(parse(d).getDate())}),labs.length?h('small',{class:'lab '+labs[0].c,text:labs[0].t}):null)}));
  const row=t=>taskRow(t,h('div',{class:'chips'},w.map((d,i)=>h('button',{class:'chip'+(t.day===d?' on':''),type:'button',text:DOW[i],'aria-label':md(d)+'로 보내기',on:{click:()=>{
      if(t.day===d){t.day=null}else{detach(t);setDay(t,d)}save();render()}}})),
    t.day?timeChip(t):null),{drop:!t.done});
  const sorted=ts.slice().sort((a,b)=>byOrd(a,b)||((a.day||'9')<(b.day||'9')?-1:(a.day||'9')>(b.day||'9')?1:byTime(a,b)));
  const undone=sorted.filter(t=>!t.done),done=sorted.filter(t=>t.done);
  const fromMonth=data().tasks.filter(t=>t.month===mKey()&&t.week==null&&!t.day&&!t.done&&!t.rep);
  const isNow=w.includes(t0);
  return [head('위클리',(st.week+1)+'주차 · '+(parse(w[0]).getMonth()+1)+'/'+parse(w[0]).getDate()+'~'+(parse(w[6]).getMonth()+1)+'/'+parse(w[6]).getDate()),
    h('div',{class:'weeks'},ws.map((_,i)=>h('button',{class:'chip'+(i===st.week?' on':''),type:'button',text:(i+1)+'주차',on:{click:()=>{st.week=i;render()}}}))),
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),
    h('button',{type:'button',class:'linkbtn',text:'+ 한 번에 여러 개 적기',on:{click:()=>multiAdd((st.week+1)+'주차 할 일 적기',{week:st.week},(st.week+1)+'주차에')}}),tagPicker(),
    isNow?lateBox('week'):null,strip,
    dayN?h('p',{class:'hint',text:'데일리 일정·반복 '+dayN+'개는 위 요일 칸을 누르면 그 날에서 봐요.'}):null,
    ts.length||dayN?null:emptyBox('이 주에 정리된 할 일이 없어요. 먼슬리에서 주 버튼을 누르거나 위에 바로 적어요.'),
    undone.length?[h('div',{class:'sec',text:'할 일 '+undone.length+' · 요일 칸으로 끌면 그 날로, 다른 할 일 위에 놓으면 순서 바꾸기'}),h('div',{class:'list','data-list':'w'},undone.map(row))]:null,
    done.length?[h('div',{class:'sec',text:'다 했어요 '+done.length}),h('div',{class:'list'},done.map(row))]:null,
    fromMonth.length?[h('div',{class:'sec',text:'먼슬리에서 가져오기 '+fromMonth.length}),h('div',{class:'list'},fromMonth.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이번 주로',on:{click:()=>{t.week=st.week;save();render()}}})))))]:null,
    actualBox(w,'이번 주'),weekGrid(w)];
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
  function go(){const n=addTasks(inp.value,{week:wi,day:d,month:mkOf(d),src:'d'});if(n){inp.value='';render();toast('추가했어요')}}
  const shift=k=>{const x=parse(d);x.setDate(x.getDate()+k);st.day=ymd(x);render()};
  const fromWeek=data().tasks.filter(t=>t.month===mkOf(d)&&t.week===wi&&!t.day&&!t.done);
  // 10분 플래너: 왼쪽 계획(그 시간 할 일) | 시간 | 오른쪽 10분 칸 6개(실제로 한 시간, 손가락으로 칠하기)
  const S=data().settings;
  const [h0,h1]=dayHours([d]);
  if(st.anc&&st.anc.day!==d)st.anc=null;
  const nowH=d===todayS()?new Date().getHours():-1,nowM=new Date().getMinutes();
  const log=(data().logs||{})[d]||{};
  if(st.brush&&st.brush!=='erase'&&!st.brush.startsWith('cat:')&&!st.brush.startsWith('q:')&&!ts.some(t=>t.id===st.brush))st.brush=null;
  if(st.brush&&st.brush.startsWith('cat:')&&!okTag(+st.brush.slice(4)))st.brush=null;
  if(st.brush&&st.brush.startsWith('q:')&&!quickList()[+st.brush.slice(2)])st.brush=null;
  const tt=h('div',{class:'tt','data-day':d},
    h('div',{class:'tt-r tt-head'},h('span',{class:'tt-p',text:'계획 · 기록'}),h('span',{class:'tt-h'}),h('div',{class:'tt-g'},[10,20,30,40,50,60].map(m=>h('span',{class:'cell-l',text:m})))),
    !S.early&&h0>4?h('button',{type:'button',class:'tt-more',text:'▲ 새벽 시간 보기 (4~5시)',on:{click:()=>{S.early=true;save();render()}}}):null);
  for(let hh=h0;hh<=h1;hh++){
    const at=timed.filter(t=>+t.time.slice(0,2)===hh);
    // 이 시간에 시작하는 직접 쓴 기록 (다이어리처럼)
    const notes=[];for(let k=0;k<6;k++){const sl=hh*6+k,v=log[sl];if(v&&v.startsWith('e:')&&log[sl-1]!==v){const it=logItem(v);if(it){const r=runOf(log,sl);notes.push({sl,it,r})}}}
    tt.append(h('div',{class:'tt-r'+(hh===nowH?' now':'')+(hh===24?' mid':'')},
      h('div',{class:'tt-p','data-drop':'hour:'+hh},
        at.map(t=>taskRow(t,null,{noDay:true,brush:true,timer:d===todayS()})),
        notes.map(n=>h('button',{type:'button',class:'note-r '+itemCls(n.it).replace('c','tc'),on:{click:()=>writeSheet(d,n.r[0],n.r[1],n.it.id)}},h('span',{class:'tm',text:slotT(n.r[0])}),'✎ '+n.it.text)),
        !at.length&&!notes.length?h('button',{type:'button',class:'tl-add','aria-label':hh+'시에 추가',text:'+',on:{click:()=>{inp.value=hh+':00 ';inp.focus()}}}):null),
      h('span',{class:'tt-h',text:hourLabel(hh),title:hh>=24?'다음날 '+(hh-24)+'시':null}),
      h('div',{class:'tt-g'},[0,1,2,3,4,5].map(k=>{const slot=hh*6+k;const it=logItem(log[slot]);
        return h('span',{class:'cell'+(it?' '+itemCls(it):'')+(hh===nowH&&Math.floor(nowM/10)===k?' cur':'')+(st.anc&&st.anc.slot===slot?' anc':''),'data-slot':slot,title:it?slotT(slot)+' '+it.text:slotT(slot)})}))));
  }
  if(!S.late&&h1<26)tt.append(h('button',{type:'button',class:'tt-more',text:'▼ 밤 시간 보기 (밤 11시~새벽 2시)',on:{click:()=>{S.late=true;save();render()}}}));
  if(S.early||S.late)tt.append(h('button',{type:'button',class:'tt-more',text:'기본 시간(6~22시)만 보기',on:{click:()=>{S.early=false;S.late=false;save();render()}}}));
  // 칠하기: 직접 쓰기(기본) / 할 일 / 카테고리
  const bTask=st.brush&&st.brush!=='erase'&&!st.brush.startsWith('cat:')&&!st.brush.startsWith('q:')?ts.find(t=>t.id===st.brush):null;
  const bchip=(val,label,cls)=>h('button',{type:'button',class:'chip'+(st.brush===val?' on':''),on:{click:()=>{st.brush=st.brush===val?null:val;st.anc=null;render()}}},cls?h('i',{class:cls}):null,label);
  const brush=h('div',{class:'brush'},h('span',{class:'lb',text:'칠하기'}),
    h('button',{type:'button',class:'chip'+(st.brush==null?' on':''),on:{click:()=>{st.brush=null;st.anc=null;render()}}},'✏️ 칠하고 적기'),
    tagIdx().map(i=>bchip('cat:'+i,tagName(i),'c'+colOf(i)+' sq')),
    bchip('erase','🧽 지우개'),
    bTask?h('button',{type:'button',class:'chip on',on:{click:()=>{st.brush=null;st.anc=null;render()}}},h('i',{class:hasTag(bTask)?'c'+colOf(bTask.tag):'cn'}),'▶ '+bTask.text.slice(0,10)+' ✕'):null);
  const bName=st.brush==null||st.brush==='erase'?null:st.brush.startsWith('q:')?(quickList()[+st.brush.slice(2)]||{text:''}).text:st.brush.startsWith('cat:')?tagName(+st.brush.slice(4)):(data().tasks.find(t=>t.id===st.brush)||{text:''}).text.slice(0,10);
  const sum=actualBox([d],'오늘');
  const labs=labelsOf(d);
  return [h('div',{class:'head'},h('div',{class:'num',text:String(dt.getDate())}),
      h('div',{class:'t'},h('b',{text:'데일리'}),h('span',{text:(dt.getMonth()+1)+'월 '+(wi+1)+'주차 · '+DOW[dowOf(d)]+'요일'+(d===todayS()?' · 오늘':'')}),labs.length?h('div',null,labelSpans(d,'lab big')):null),
      h('div',{class:'nav'},h('button',{type:'button','aria-label':'전날',text:'‹',on:{click:()=>shift(-1)}}),h('button',{type:'button','aria-label':'다음날',text:'›',on:{click:()=>shift(1)}}),searchBtn(),gearBtn())),
    d===todayS()?lateBox('day'):null,
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),
    h('button',{type:'button',class:'linkbtn',text:'+ 한 번에 여러 개 적기',on:{click:()=>multiAdd(md(d)+' 할 일 적기',{week:wi,day:d,month:mkOf(d),src:'d'},md(d)+'에')}}),tagPicker(),
    h('p',{class:'hint',text:'앞에 시간을 쓰면(3시 병원) 시간표에 들어가요.'},d!==todayS()?[' ',h('button',{type:'button',style:'color:var(--cobalt);font-weight:700',text:'오늘로 가기',on:{click:()=>{st.day=todayS();render()}}})]:null),
    !ts.length?emptyBox('이 날 할 일이 없어요. 위클리에서 요일을 누르거나 위에 바로 적어요.'):null,
    untimed.length||timed.length?[h('div',{class:'sec','data-drop':'notime',text:'시간 안 정함 '+untimed.length+(untimed.length?' · 길게 눌러 아래 계획 칸으로 끌기':'')}),h('div',{class:'list','data-list':'u','data-drop':'notime'},untimed.map(t=>taskRow(t,null,{noDay:true,drop:true,brush:true,timer:d===todayS()})))]:null,
    h('div',{class:'sec'},'시간표 (10분 칸) ',h('button',{type:'button',class:'imgbtn',text:'🖼 그림으로 저장·공유',on:{click:()=>dayImage(d)}})),brush,h('p',{class:'hint',style:'margin:0 0 8px',text:st.brush==='erase'?'🧽 지울 첫 칸을 톡, 끝 칸을 톡 누르면 그 사이가 지워져요. 길게 누른 채 쓸어도 돼요. 다 지웠으면 ✏️ 칠하고 적기를 눌러요.':(bName?ro('"'+bName+'"')+' 칠하는 중이에요. 이미 칠한 칸을 누르면 고치거나 지울 수 있어요. ':'할 일 옆 🖌를 누르면 그 일로 칠해요. 칠한 칸을 누르면 고치거나 지워요. ')+(st.brush==='erase'?'':'첫 칸을 톡, 끝 칸을 톡 누르면 그 사이가 쭉 채워져요. 길게 누른 채 쓸어도 돼요.')}),tt,
    st.anc&&st.anc.day===d?h('div',{class:'ancbar'},h('span',null,h('b',{text:slotT(st.anc.slot)}),'부터 · 끝 칸을 눌러요'),
      h('button',{type:'button',text:'이 칸만',on:{click:()=>{const a=st.anc.slot;st.anc=null;applyRange(d,a,a)}}}),h('button',{type:'button',text:'취소',on:{click:()=>{st.anc=null;render()}}})):null,
    sum,
    h('div',{class:'sec',text:'오늘의 한 줄'}),diaryBox(d),
    doneHere.length?[h('div',{class:'sec',text:'이 날 끝낸 다른 일 '+doneHere.length}),h('div',{class:'list'},doneHere.map(t=>taskRow(t)))]:null,
    fromWeek.length?[h('div',{class:'sec',text:'이번 주에서 가져오기 '+fromWeek.length}),h('div',{class:'list'},fromWeek.map(t=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:t.text}),h('button',{class:'chip on',type:'button',text:'이 날로',on:{click:()=>{setDay(t,d);save();render()}}})))))]:null];
}

// ── 습관: 헬스·영어공부처럼 매일 체크하는 것 (반복 일정과 따로)
// 습관 아이콘 (종류별)
const ICON_SETS=[
 ['운동','💪🏋️🏃🚶🧘🚴🏊⚽🏀🎾🏸⛳🥊🤸🧗⛹️🏓🛹⛷️🩰'],
 ['공부·일','📚📖✏️📝💻🎓🧠🔤🌏🗣️📊💼🧮🔬🎹🎸🎨📷✍️🗂️'],
 ['건강·몸','💧🥗🍎🥦💊🦷😴🛌🧴🚭🍵🥛⚖️🫁❤️🩺🧼🌞🥤🍳'],
 ['마음·생활','🙏📿🧘‍♀️😊📔🌱🪴🧹🧺🛒💰🐶🐱👶🏠🚗📞💌🎁🕯️'],
 ['취미','🎮🎬🎧🎤🧶🧩♟️🎲🍰☕🍷🌸🌙⭐🔥🎯🏆✈️🗓️✅']
];
const iconsOf=t=>{try{return [...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(t)].map(x=>x.segment)}catch(e){return (t.match(/(\p{Extended_Pictographic}\uFE0F?(\u200D\p{Extended_Pictographic}\uFE0F?)*|\p{Emoji_Presentation})/gu)||[])}};
const hbMark=hb=>hb.icon||'♥';
function habitDone(hb,d){return ((data().hchk||{})[d]||[]).includes(hb.id)}
// 습관 요일: 없으면 매일. 정한 요일만 칸·달성률에 셈
const isPaused=(hb,d)=>Array.isArray(hb.pauses)&&hb.pauses.some(p=>d>=p.a&&d<=p.b);
const habitOn=(hb,d)=>!isPaused(hb,d)&&(!!hb.goal||!Array.isArray(hb.dows)||!hb.dows.length||hb.dows.includes(dowOf(d)));
const activeHabits=()=>data().habits.filter(x=>!x.arch);
const hNote=(hb,d)=>((data().hnote||{})[d]||{})[hb.id]||'';
const habitDays=hb=>hb.goal?'주 '+hb.goal+'번':!Array.isArray(hb.dows)||!hb.dows.length||hb.dows.length===7?'매일':hb.dows.length===5&&[...hb.dows].sort().join()==='0,1,2,3,4'?'평일':[...hb.dows].sort().map(i=>DOW[i]).join('·');
function toggleHabit(hb,d){
  if(d>todayS()){toast('아직 오지 않은 날이에요');return}
  const D=data();D.hchk=D.hchk||{};const a=D.hchk[d]||[];
  if(a.includes(hb.id))D.hchk[d]=a.filter(x=>x!==hb.id);else D.hchk[d]=[...a,hb.id];
  if(!D.hchk[d].length)delete D.hchk[d];save();render();
}
function habitStreak(hb,t0){ // 오늘까지 이어서 한 날 (쉬는 요일은 건너뜀). 주 N번이면 이어서 채운 주
  if(hb.goal){let n=0;const x=parse(t0);x.setDate(x.getDate()-dowOf(t0));
    for(let i=0;i<60;i++,x.setDate(x.getDate()-7)){
      const ds=[];for(let k=0;k<7;k++){const y=new Date(x);y.setDate(x.getDate()+k);const d=ymd(y);if(d<=t0&&!isPaused(hb,d))ds.push(d)}
      const c=ds.filter(d=>habitDone(hb,d)).length,full=i===0?hb.goal:Math.round(hb.goal*ds.length/7);
      if(i===0){if(c>=hb.goal)n++;continue} // 이번 주는 진행 중
      if(!full)continue;if(c>=full)n++;else break}
    return n}
  let n=0;const x=parse(t0);
  for(let i=0;i<400;i++,x.setDate(x.getDate()-1)){const d=ymd(x);if(!habitOn(hb,d))continue;if(habitDone(hb,d))n++;else if(d!==t0)break}
  return n;
}
// 주 N번 목표가 있으면 주마다 N번 채웠는지로 셈 (월~일)
function weeksIn(days){const m={};for(const d of days){const x=parse(d);x.setDate(x.getDate()-dowOf(d));(m[ymd(x)]=m[ymd(x)]||[]).push(d)}return m}
function weekCount(hb,d){const x=parse(d);x.setDate(x.getDate()-dowOf(d));let n=0;for(let i=0;i<7;i++){if(habitDone(hb,ymd(x)))n++;x.setDate(x.getDate()+1)}return n}
function habitRate(hb,days){
  if(hb.since)days=days.filter(d=>d>=hb.since); // 만든 날부터 셈
  if(hb.goal){const W=weeksIn(days.filter(d=>!isPaused(hb,d)));let got=0,of=0,n=0;
    const t0=todayS();
    for(const k in W){const ds=W[k],c=ds.filter(d=>habitDone(hb,d)).length;n+=c;
      // 달의 처음·끝에 걸친 짧은 주는 날 수만큼만, 지금 주는 아직 진행 중이라 깎지 않음
      let t=ds.length>=7?hb.goal:Math.round(hb.goal*ds.length/7);
      if(ds.includes(t0))t=Math.min(hb.goal,Math.max(c,t));
      if(!t)continue;got+=Math.min(c,t);of+=t}
    return {n,of,pc:of?Math.round(got/of*100):0,goal:true}}
  const on=days.filter(d=>habitOn(hb,d));const n=on.filter(d=>habitDone(hb,d)).length;return {n,of:on.length,pc:on.length?Math.round(n/on.length*100):0}}
function prevMonthDays(){const y=st.m===0?st.y-1:st.y,m=st.m===0?11:st.m-1;const n=new Date(y,m+1,0).getDate();const a=[];for(let i=1;i<=n;i++)a.push(y+'-'+pad(m+1)+'-'+pad(i));return a}
function diffTxt(now,prev){if(prev==null)return '';const d=now-prev;return d===0?' · 지난달과 같아요':' · 지난달보다 '+(d>0?'+':'')+d+'%'}
function vHabit(){
  const D=data(),H=activeHabits(),ARCH=D.habits.filter(x=>x.arch),t0=todayS();
  const last=new Date(st.y,st.m+1,0).getDate();
  const pages=[[1,10],[11,20],[21,last]];
  if(st.hpage==null){const td=parse(t0);st.hpage=td.getFullYear()===st.y&&td.getMonth()===st.m?Math.min(2,Math.floor((td.getDate()-1)/10)):0}
  const all=st.hview==='month';
  const [p0,p1]=all?[1,last]:pages[st.hpage];
  const days=[];for(let i=p0;i<=p1;i++)days.push(mKey()+'-'+pad(i));
  const monthDays=[];for(let i=1;i<=last;i++)monthDays.push(mKey()+'-'+pad(i));
  const upto=monthDays.filter(x=>x<=t0);
  const inp=h('input',{id:'hAdd',placeholder:'예: 헬스장, 영어공부, 물 2L',maxlength:'20',on:{keydown:e=>{if(e.key==='Enter'&&!e.isComposing)go()}}});
  function go(){const v=inp.value.trim().slice(0,20);if(!v){toast('습관 이름을 적어 주세요');return}
    if(D.habits.some(x=>!x.arch&&x.name.trim().toLowerCase()===v.toLowerCase())){toast('"'+v+'" 습관이 이미 있어요');return}
    const hb={id:uid(),name:v,tag:st.addTag,dows:null,since:todayS()};D.habits.push(hb);inp.value='';save();render();toast(v+' 습관을 넣었어요 · 이름을 누르면 요일·목표를 정할 수 있어요')}
  const cell=(hb,d,cls)=>{const on=habitDone(hb,d),pz=isPaused(hb,d),sch=habitOn(hb,d),memo=hNote(hb,d);
    const b=h('button',{type:'button',class:'ht-c'+(on?' on c'+cls:'')+(d>t0?' fut':'')+(sch?'':' off')+(pz?' pz':'')+(d===t0?' now':'')+(memo?' memo':''),'data-hb':hb.id,'data-d':d,
      'aria-label':md(d)+' '+hb.name+(on?' 했어요':pz?' 쉬는 기간':sch?' 안 했어요':' 쉬는 날')+(memo?' · 메모 '+memo:'')+' · 길게 누르면 메모',title:memo||null,'aria-pressed':on?'true':'false',
      text:on?(all?'':(hb.icon||'✓')):pz&&!all?'⏸':(sch||all?'':'·'),on:{click:()=>{if(Date.now()<HL.until)return;toggleHabit(hb,d)},contextmenu:e=>{e.preventDefault();if(Date.now()<HL.until)return;memoSheet(hb,d)}}});
    return b};
  const tbl=h('div',{class:'ht'+(all?' all':''),style:'--n:'+days.length},
    h('div',{class:'ht-r ht-head'},h('span',{class:'ht-n'}),days.map(d=>{const n=+d.slice(8);return h('span',{class:'ht-d'+(d===t0?' tdy':'')+(dowOf(d)===6||holOf(d)?' red':dowOf(d)===5?' blue':'')},all?(n===1||n%5===0?h('b',{text:String(n)}):h('b',{text:'\u00a0'})):[h('b',{text:String(n)}),DOW[dowOf(d)]])}),h('span',{class:'ht-s',text:'이번 달'})),
    H.map(hb=>{const hi=D.habits.indexOf(hb);const cls=okTag(hb.tag)?colOf(hb.tag):'n';const r=habitRate(hb,upto);
      return h('div',{class:'ht-r','data-hab':hi},
        h('span',{class:'ht-n'},h('span',{class:'grip hg','aria-hidden':'true',text:'≡'}),h('button',{type:'button',class:'ht-nb tc'+cls,title:hb.name+' · '+habitDays(hb),on:{click:()=>habitSheet(hb)}},hb.icon?h('span',{class:'hic',text:hb.icon}):null,hb.name,hb.time?h('small',{class:'htm',text:'⏰'}):null)),
        days.map(d=>cell(hb,d,cls)),
        h('span',{class:'ht-s',text:hb.goal?'주 '+weekCount(hb,t0)+'/'+hb.goal:r.n+'/'+r.of}))}));
  const reps=D.reps;
  const recentMemos=[];for(const d of [...monthDays].reverse()){const o=(D.hnote||{})[d]||{};for(const hb of H)if(o[hb.id])recentMemos.push({d,hb,t:o[hb.id]});if(recentMemos.length>=6)break}
  return [head('습관',H.length?'습관 '+H.length+'개':'매일 체크'),
    h('div',{class:'add'},inp,h('button',{class:'go',type:'button',text:'추가',on:{click:go}})),tagPicker(),
    h('div',{class:'weeks'},pages.map(([a,b],i)=>h('button',{type:'button',class:'chip'+(!all&&i===st.hpage?' on':''),text:a+'~'+b+'일',on:{click:()=>{st.hview=null;st.hpage=i;render()}}})),
      h('button',{type:'button',class:'chip'+(all?' on':''),text:'한 달 한눈에',on:{click:()=>{st.hview=all?null:'month';render()}}})),
    H.length?tbl:h('div',{class:'empty'},h('div',{text:'아직 습관이 없어요. 위 칸에 "헬스장"처럼 적고 [추가]를 눌러 주세요.'}),!demo&&!real.habits.length?h('button',{type:'button',text:'예시로 둘러보기',on:{click:startDemo}}):null),
    H.length?h('p',{class:'hint',text:'칸을 누르면 체크, 길게 누르면 메모(벤치 60kg 등). 습관 이름을 누르면 아이콘·요일·목표·알림·쉬는 기간을 정해요. ≡ 를 끌면 순서가 바뀌어요.'}):null,
    recentMemos.length?h('div',{class:'mlist'},h('b',{text:'최근 메모'}),recentMemos.slice(0,6).map(m=>h('button',{type:'button',class:'mrow',on:{click:()=>memoSheet(m.hb,m.d)}},h('span',{class:'md',text:md(m.d)}),h('span',{class:'tc'+(okTag(m.hb.tag)?colOf(m.hb.tag):'n'),text:(m.hb.icon||'♥')+' '+m.hb.name.slice(0,8)}),h('span',{class:'mt',text:m.t})))):null,
    H.length&&upto.length?h('div',{class:'rbox'},h('b',{text:(st.m+1)+'월 달성률'}),H.map(hb=>{const r=habitRate(hb,upto),cls=okTag(hb.tag)?colOf(hb.tag):'n',streak=habitStreak(hb,t0);
      const pm=prevMonthDays(),pr=pm.some(d=>habitDone(hb,d))?habitRate(hb,pm).pc:null;
      return h('div',{class:'rrow2'},h('div',{class:'rrow'},h('span',{class:'rn tc'+cls,text:(hb.icon?hb.icon+' ':'')+hb.name.slice(0,10)}),h('span',{class:'rbar'},h('i',{class:'c'+cls,style:'width:'+r.pc+'%'})),h('span',{class:'rp',text:r.pc+'%'+(streak>=2?' 🔥'+streak+(hb.goal?'주':''):'')})),
        h('small',{class:'rsub',text:(hb.goal?'주 '+hb.goal+'번 목표 · ':habitDays(hb)+' · ')+(hb.time?'⏰'+hb.time+' · ':'')+r.n+'번 했어요'+diffTxt(r.pc,pr)}))})):null,
    moodBox(),
    H.length?h('button',{type:'button',class:'btn',style:'margin:8px 0',text:'🖼 이번 달 돌아보기 그림',on:{click:()=>monthImage()}}):null,
    ARCH.length?[h('div',{class:'sec',text:'보관한 습관 '+ARCH.length+' · 기록은 그대로 남아요'}),h('div',{class:'list'},ARCH.map(hb=>{const n=Object.values(D.hchk||{}).filter(a=>a.includes(hb.id)).length;
      return h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:(hb.icon?hb.icon+' ':'')+hb.name+' · '+n+'번 했어요'}),
        h('button',{type:'button',class:'chip on',text:'되살리기',on:{click:()=>{hb.arch=false;save();render();toast(hb.name+' 습관을 되살렸어요')}}}),
        h('button',{type:'button',class:'chip',text:'지우기',on:{click:()=>delHabit(hb)}})))}))]:null,
    reps.length?[h('div',{class:'sec',text:'반복 일정 중 습관으로 옮기기'}),h('p',{class:'hint',text:'예전에 반복으로 넣은 것 중 습관(헬스·공부 등)만 옮기면 달력에서 빠지고 여기서 체크해요. 학원·청소 같은 일정은 그대로 두세요.'}),
      h('div',{class:'list'},reps.map(r=>h('div',{class:'row'},h('div',{class:'top'},h('span',{class:'txt',text:r.text+' · '+repLabel(r)}),h('button',{type:'button',class:'chip on',text:'습관으로',on:{click:()=>repToHabit(r)}})))))]:null];
}
function repToHabit(r){
  const D=data();const hb={id:uid(),since:todayS(),name:r.text.slice(0,20),tag:r.tag,dows:r.type==='week'&&Array.isArray(r.dows)&&r.dows.length?[...r.dows]:null};D.habits.push(hb);D.hchk=D.hchk||{};
  for(const t of D.tasks)if((t.rep===r.id||t.fromRep===r.id)&&t.done){const d=t.doneAt||t.day;if(isDate(d)){D.hchk[d]=[...new Set([...(D.hchk[d]||[]),hb.id])]}}
  D.tasks=D.tasks.filter(t=>t.rep!==r.id&&t.fromRep!==r.id);
  D.reps=D.reps.filter(x=>x!==r);save();render();toast(eul(hb.name)+' 습관으로 옮겼어요');
}
function delHabit(hb,after){
  const D=data();
  const close=sheet(h('h3',{text:hb.name+' 지우기'}),h('p',{text:'체크와 메모 기록이 모두 지워져요. 기록을 남기려면 "보관함으로"를 쓰세요.'}),
    h('button',{class:'btn del',type:'button',text:'완전히 지우기',on:{click:()=>{D.habits=D.habits.filter(x=>x!==hb);
      for(const d in D.hchk){D.hchk[d]=D.hchk[d].filter(x=>x!==hb.id);if(!D.hchk[d].length)delete D.hchk[d]}
      for(const d in D.hnote){delete D.hnote[d][hb.id];if(!Object.keys(D.hnote[d]).length)delete D.hnote[d]}
      save();close();render();toast('지웠어요')}}}),
    h('button',{class:'btn',type:'button',text:'취소',on:{click:()=>{close();if(after)after()}}}));
}
// 습관 칸 메모 (길게 누르기): 적으면 그 날 한 것으로 체크
function memoSheet(hb,d){
  const D=data();const ti=h('input',{id:'hMemo',maxlength:'40',placeholder:'예: 벤치 60kg, 단어 30개, 5km'});ti.value=hNote(hb,d);
  const go=()=>{const v=ti.value.trim().slice(0,40);D.hnote=D.hnote||{};
    if(v){(D.hnote[d]=D.hnote[d]||{})[hb.id]=v;if(!habitDone(hb,d)){D.hchk[d]=[...(D.hchk[d]||[]),hb.id]}}
    else if(D.hnote[d]){delete D.hnote[d][hb.id];if(!Object.keys(D.hnote[d]).length)delete D.hnote[d]}
    save();close();render();toast(v?md(d)+' '+hb.name+' 메모 남겼어요':'메모를 지웠어요')};
  ti.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)go()});
  const close=sheet(h('h3',{text:md(d)+' '+(hb.icon?hb.icon+' ':'')+hb.name}),h('p',{text:habitDone(hb,d)?'했어요 ✓':'메모를 적으면 했다고 체크돼요'}),ti,
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:go}}),
    hNote(hb,d)?h('button',{class:'btn del',type:'button',text:'메모 지우기',on:{click:()=>{ti.value='';go()}}}):null);
  setTimeout(()=>ti.focus(),60);
}
// 습관 칸 길게 누르기 → 메모 (손가락)
const HL={timer:null,el:null,x:0,y:0,until:0};
document.addEventListener('touchstart',e=>{const el=e.target.closest('.ht-c[data-hb]');if(!el)return;const p=e.touches[0];
  Object.assign(HL,{el,x:p.clientX,y:p.clientY});clearTimeout(HL.timer);
  HL.timer=setTimeout(()=>{const hb=data().habits.find(x=>x.id===el.dataset.hb);HL.el=null;if(!hb)return;HL.fired=true;HL.until=Date.now()+5000;try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}memoSheet(hb,el.dataset.d)},500)},{passive:true});
document.addEventListener('touchmove',e=>{if(!HL.el)return;const p=e.touches[0];if(Math.abs(p.clientX-HL.x)>8||Math.abs(p.clientY-HL.y)>8){clearTimeout(HL.timer);HL.el=null}},{passive:true});
document.addEventListener('touchend',()=>{clearTimeout(HL.timer);HL.el=null;if(HL.fired){HL.fired=false;HL.until=Date.now()+350}});
function habitSheet(hb){
  const ni=h('input',{id:'hName',maxlength:'20'});ni.value=hb.name;let tag=hb.tag;
  let dows=new Set(Array.isArray(hb.dows)&&hb.dows.length?hb.dows:[0,1,2,3,4,5,6]);
  let icon=hb.icon||null,goal=hb.goal||null,iset=0;
  const iRow=h('div');
  const drawI=()=>iRow.replaceChildren(
    h('div',{class:'chips',style:'padding-left:0'},ICON_SETS.map(([n],i)=>h('button',{type:'button',class:'chip'+(i===iset?' on':''),text:n,on:{click:()=>{iset=i;drawI()}}}))),
    h('div',{class:'icgrid'},h('button',{type:'button',class:'ic'+(icon==null?' on':''),text:'없음',on:{click:()=>{icon=null;drawI()}}}),
      iconsOf(ICON_SETS[iset][1]).map(x=>h('button',{type:'button',class:'ic'+(icon===x?' on':''),text:x,'aria-label':'아이콘 '+x,on:{click:()=>{icon=x;drawI()}}}))));
  drawI();
  const gRow=h('div');
  const drawG=()=>gRow.replaceChildren(h('div',{class:'chips',style:'padding-left:0'},
    h('button',{type:'button',class:'chip'+(!goal?' on':''),text:'정한 요일마다',on:{click:()=>{goal=null;drawG()}}}),
    [1,2,3,4,5,6].map(n=>h('button',{type:'button',class:'chip'+(goal===n?' on':''),text:'주 '+n+'번',on:{click:()=>{goal=n;drawG()}}}))),
    h('p',{text:goal?'요일 상관없이 한 주(월~일)에 '+goal+'번 하면 성공이에요.':'아래 요일마다 하면 성공이에요.'}));
  drawG();
  const dRow=h('div');
  const drawD=()=>dRow.replaceChildren(h('div',{class:'chips dows'},DOW.map((x,i)=>h('button',{type:'button',class:'chip'+(dows.has(i)?' on':''),text:x,'aria-pressed':dows.has(i)?'true':'false',on:{click:()=>{dows.has(i)?dows.delete(i):dows.add(i);drawD()}}}))),
    h('div',{class:'chips',style:'padding-left:0'},[['매일',[0,1,2,3,4,5,6]],['평일',[0,1,2,3,4]],['주말',[5,6]],['월·수·금',[0,2,4]],['화·목',[1,3]]].map(([l,v])=>h('button',{type:'button',class:'chip',text:l,on:{click:()=>{dows=new Set(v);drawD()}}}))));
  drawD();
  const tagRow=h('div',{class:'chips',style:'padding-left:0'});
  const drawT=()=>tagRow.replaceChildren(...[null,...tagIdx()].map(i=>h('button',{type:'button',class:'chip'+(tag===i?' on':''),on:{click:()=>{tag=i;drawT()}}},i==null?'없음':[h('i',{class:'c'+colOf(i)}),tagName(i)])));
  drawT();
  const D=data();
  const tm=h('input',{type:'time',id:'hTime'});tm.value=hb.time||'';
  let pauses=(hb.pauses||[]).map(p=>({a:p.a,b:p.b}));
  const pa=h('input',{type:'date',id:'pA'}),pb=h('input',{type:'date',id:'pB'});
  {const t=todayS(),x=parse(t);x.setDate(x.getDate()+6);pa.value=t;pb.value=ymd(x)}
  const pRow=h('div');
  const drawP=()=>pRow.replaceChildren(...[
    pauses.length?pauses.map((p,i)=>h('div',{class:'set'},h('span',{text:'⏸ '+md(p.a)+' ~ '+md(p.b)}),h('button',{type:'button',class:'chip',text:'빼기',on:{click:()=>{pauses.splice(i,1);drawP()}}}))):h('p',{text:'여행이나 아플 때 기간을 정하면 그동안은 안 세고, 연속 기록도 안 끊겨요.'}),
    h('div',{class:'two'},h('label',null,h('span',{text:'시작'}),pa),h('label',null,h('span',{text:'끝'}),pb)),
    h('button',{type:'button',class:'btn',style:'margin-top:4px',text:'+ 쉬는 기간 넣기',on:{click:()=>{const a=pa.value,b=pb.value;if(!isDate(a)||!isDate(b)){toast('날짜를 골라 주세요');return}
      pauses.push(a<=b?{a,b}:{a:b,b:a});pauses.sort((x,y)=>x.a<y.a?-1:1);drawP()}}})].flat(Infinity).filter(x=>x!=null));
  drawP();
  const close=sheet(h('h3',{text:'습관 고치기'}),ni,h('div',{class:'sec',text:'아이콘'}),iRow,h('div',{class:'sec',text:'목표'}),gRow,h('div',{class:'sec',text:'하는 요일 (요일을 정할 때)'}),dRow,h('div',{class:'sec',text:'색 (카테고리)'}),tagRow,
    h('div',{class:'sec',text:'알림 시간'}),h('div',{class:'set'},h('span',null,'이 시간에 "'+hb.name.slice(0,10)+' 할 시간이에요"',h('small',{text:B?'이미 한 날과 쉬는 날은 울리지 않아요. 비워 두면 알림이 없어요':'알림은 안드로이드 앱에서 울려요'})),tm),
    h('div',{class:'sec',text:'쉬는 기간'}),pRow,
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{const v=ni.value.trim().slice(0,20);if(!v){toast('이름을 적어 주세요');return}if(!dows.size){toast('요일을 하나 이상 골라 주세요');return}
      hb.name=v;hb.tag=tag;hb.icon=icon;hb.goal=goal;hb.dows=dows.size===7?null:[...dows].sort();
      hb.time=isTime(tm.value)?tm.value:null;hb.pauses=pauses.length?pauses:null;if(hb.time&&B&&!demo)B.requestNoti();
      save();close();render();toast((icon?icon+' ':'')+v+' · '+habitDays(hb))}}}),
    h('button',{class:'btn',type:'button',text:'📦 보관함으로 (그만둬도 기록은 남아요)',on:{click:()=>{hb.arch=true;save();close();render();toast(hb.name+' 습관을 보관했어요')}}}),
    h('button',{class:'btn del',type:'button',text:'완전히 지우기',on:{click:()=>{close();delHabit(hb,()=>habitSheet(hb))}}}));
}

function searchBtn(){const b=h('button',{type:'button','aria-label':'찾기',on:{click:searchSheet}});b.append(svg('M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13 M15.5 15.5L20 20'));return b}
// 🔍 전체 찾기: 할 일·반복·기념일·습관·일기·시간표
function searchSheet(){
  const D=data();const inp=h('input',{id:'qAll',type:'search',maxlength:'30',placeholder:'예: 병원, 엄마 생일 (여러 단어도 돼요)',autocomplete:'off'});
  const out=h('div',{class:'list'});let tm=null,close=null;
  const goDay=d=>{const x=parse(d);st.y=x.getFullYear();st.m=x.getMonth();st.day=d;st.week=null;st.tab='daily';close();window.scrollTo(0,0);render()};
  const goMonth=mk=>{const [y,m]=mk.split('-').map(Number);st.y=y;st.m=m-1;st.week=null;st.tab='monthly';close();window.scrollTo(0,0);render()};
  const item=(title,sub,fn)=>h('button',{type:'button',class:'srow',on:{click:fn}},h('b',{text:title}),h('span',{text:sub}));
  let lim=60;
  const run=keep=>{if(!keep)lim=60;const q=inp.value.trim().toLowerCase();if(!q){out.replaceChildren(h('p',{class:'hint',style:'margin:8px 2px',text:'할 일·반복·기념일·습관·일기·시간표에서 찾아요.'}));return}
    const W=q.split(/\s+/).filter(Boolean);const has=x=>{const v=String(x||'').toLowerCase();return W.every(w=>v.includes(w))}; /* 띄어 쓴 단어는 따로따로 찾기 (모두 들어간 것) */
    const R=[]; // 찾은 것은 모두 세고, 화면에는 60개씩만 그려요 (더 보기)
    D.tasks.filter(t=>has((t.time||'')+' '+t.text)).sort((a,b)=>(b.day||b.month||'')<(a.day||a.month||'')?-1:1).forEach(t=>R.push(()=>item((t.done?'✓ ':'')+(t.time?t.time+' ':'')+t.text,t.day?md(t.day)+' 할 일':(+t.month.slice(5))+'월'+(t.week!=null?' '+(t.week+1)+'주차':'')+' 할 일',()=>t.day?goDay(t.day):goMonth(t.month))));
    D.reps.filter(r=>has(r.text)).forEach(r=>R.push(()=>item('↻ '+r.text,'반복 · '+repLabel(r),()=>{close();settingsSheet()})));
    D.annivs.filter(a=>has(a.name)).forEach(a=>R.push(()=>item('🎂 '+a.name,'기념일 · '+annivWhen(a),()=>{close();annivSheet(a.date,null,a)})));
    (D.habits||[]).filter(x=>!x.arch&&has(x.name)).forEach(x=>R.push(()=>item((x.icon?x.icon+' ':'♡ ')+x.name,'습관',()=>{st.tab='habit';close();window.scrollTo(0,0);render()})));
    Object.keys(D.diary||{}).filter(d=>has(D.diary[d])).sort().reverse().forEach(d=>R.push(()=>item('📝 '+String(D.diary[d]).slice(0,40),md(d)+' 일기',()=>goDay(d))));
    const seen=new Set();Object.keys(D.logs||{}).sort().reverse().forEach(d=>{const L=D.logs[d];for(const k in L){const it=logItem(L[k]);const tx=it&&it.text;if(tx&&has(tx)&&!seen.has(d+tx)){seen.add(d+tx);R.push(()=>item('⏱ '+tx,md(d)+' 시간표',()=>goDay(d)))}}});
    if(!R.length){out.replaceChildren(h('p',{class:'hint',style:'margin:8px 2px',text:'"'+inp.value.trim()+'"'+(jong(inp.value)?'이':'가')+' 들어간 기록이 없어요.'}));return}
    const more=R.length-lim;
    out.replaceChildren(h('div',{class:'sec',text:'찾은 것 '+R.length+'개'}),...R.slice(0,lim).map(f=>f()),
      more>0?h('button',{type:'button',class:'btn',text:'더 보기 ('+more+'개 더 있어요)',on:{click:()=>{lim+=60;run(true)}}}):null)};
  inp.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>run(),150)});
  close=sheet(h('h3',{text:'찾기'}),inp,out);run();setTimeout(()=>inp.focus(),60);
}
function gearBtn(){const b=h('button',{type:'button','aria-label':'설정',on:{click:settingsSheet}});b.append(svg(GEAR));return b}
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function head(title,sub){
  return h('div',{class:'head'},h('div',{class:'num en','aria-label':(st.m+1)+'월',text:MON[st.m]}),
    h('div',{class:'t'},h('b',{text:title}),h('span',{text:st.y+'년 '+(st.m+1)+'월 · '+sub})),
    h('div',{class:'nav'},h('button',{type:'button','aria-label':'이전 달',text:'‹',on:{click:()=>mv(-1)}}),h('button',{type:'button','aria-label':'다음 달',text:'›',on:{click:()=>mv(1)}}),searchBtn(),gearBtn()));
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
  demo.habits=[{id:'h1',name:'[예시] 헬스장',tag:1},{id:'h2',name:'[예시] 영어공부',tag:0}];demo.hchk={};demo.hchk[ys]=['h1','h2'];demo.hchk[t]=['h1'];
  const a=parse(t);a.setDate(a.getDate()+3);
  demo.annivs=[{id:'a1',name:'[예시] 아빠 생일',date:ymd(a),yearly:true}];
  st.y=now.getFullYear();st.m=now.getMonth();st.sel=t;ensureRepeats(st.y,st.m);
  render();
}

const ICONS={habit:'M5 5h14v14H5z M8.5 12.5l2.5 2.5 5-5',monthly:'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',weekly:'M4 6h16v12H4z M9 6v12 M14 6v12',daily:'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 8v4l3 2'};
const TABS=[['monthly','먼슬리'],['weekly','위클리'],['daily','데일리'],['habit','습관']];
function applyTheme(){const th=real.settings.theme,r=document.documentElement;if(th==='light'||th==='dark')r.dataset.theme=th;else delete r.dataset.theme;
  const dark=th==='dark'||(th!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?'#12151F':'#FBFAF6'}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme)}catch(e){}
function applyFont(){applyTheme();const z=data().settings.font||1,r=document.documentElement;r.style.zoom=z===1?'':String(z);
  const vw=Math.min(window.innerWidth||9999,(window.screen&&screen.width)||9999);r.classList.toggle('nz',vw/z<360)}
function render(){
  try{render0()}catch(e){safeScreen()}
}
// 화면을 그리다 문제가 생겨도 흰 화면이 되지 않게: 기록을 지키는 안전 화면
function safeScreen(){
  const app=document.getElementById('app');if(!app)return;
  app.replaceChildren(h('div',{class:'empty',style:'margin-top:40px'},
    h('b',{text:'화면을 여는 중에 문제가 생겼어요'}),
    h('p',{text:'적어 둔 기록은 그대로 있어요. 먼저 백업 파일로 저장해 두고 앱을 다시 열어 주세요.'}),
    h('button',{type:'button',class:'btn',text:'백업 파일로 저장',on:{click:()=>{try{exportSheet()}catch(e){toast('백업을 열지 못했어요')}}}}),
    h('button',{type:'button',class:'btn',text:'다시 열어 보기',on:{click:()=>location.reload()}})));
}
function render0(){
  applyFont();
  popDay=null;
  ensureRepeats(st.y,st.m);
  const app=document.getElementById('app');
  const sx=window.scrollY,foc=document.activeElement&&document.activeElement.id;
  // 다시 그려도 적던 글자는 그대로 (카테고리를 눌러도 안 지워지게)
  const keep={};app.querySelectorAll('input[id],textarea[id]').forEach(e=>{if(e.value&&e.id!=='diary')keep[e.id]=e.value}); // 일기 칸은 날짜마다 다르니 옮기지 않음
  app.replaceChildren(...[
    demo?h('div',{class:'demo'},h('span',{text:'예시 화면이에요 · 저장되지 않아요'}),h('button',{type:'button',class:'demo-x',text:'예시 닫기',on:{click:()=>{demo=null;st.pick=null;render()}}})):null,
    timerBar(),
    st.tab==='weekly'?vWeekly():st.tab==='daily'?vDaily():st.tab==='habit'?vHabit():vMonthly()].flat(Infinity).filter(x=>x!=null&&x!==false));
  document.getElementById('tabs').replaceChildren(...TABS.map(([k,l])=>{const b=h('button',{type:'button',class:k===st.tab?'on':'',on:{click:()=>{st.tab=k;st.pick=null;st.anc=null;if(k==='weekly'&&st.week==null)st.week=curWeekIdx();window.scrollTo(0,0);render()}}});
    b.append(svg(ICONS[k]),l);return b}));
  for(const id in keep){const e=document.getElementById(id);if(e&&!e.value&&e.closest('#app'))e.value=keep[id]}
  if(foc){const e=document.getElementById(foc);if(e)e.focus()}
  window.scrollTo(0,sx);
}

// 창
let closeLayer=null;
function sheet(...kids){const L=document.getElementById('layer');const t0=Date.now();const dim=h('div',{class:'dim',on:{click:e=>{if(e.target===dim&&Date.now()-t0>450)close()}}},h('div',{class:'sheet',role:'dialog'},h('button',{type:'button',class:'shx','aria-label':'닫기',text:'×',on:{click:()=>close()}}),...kids));
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
  const baseDay=t.day||todayS();
  const picker=rulePicker(baseDay,rep?repRule(rep):null,false);
  const close=sheet(h('h3',{text:'할 일 고치기'}),inp,
    t.done?h('p',{text:md(t.doneAt)+'에 완료했어요'}):null,
    h('div',{class:'two'},h('label',null,h('span',{text:'날짜'}),di),h('label',null,h('span',{text:'시간'}),ti)),
    rep?h('p',{text:'날짜를 바꾸면 이번 것만 반복에서 빠져요. 시간은 반복 전체에 적용돼요.'}):null,
    h('div',{class:'sec',text:'카테고리'}),tagRow,
    h('div',{class:'sec',text:rep?'반복 ↻ '+repLabel(rep):'반복하기'}),picker.el,
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{
      const v=inp.value.trim();if(!v){toast('내용을 적어 주세요');return}
      const nd=di.value&&isDate(di.value)?di.value:null,nt=ti.value&&isTime(ti.value)?ti.value:null;
      const rule=picker.get();
      if(rule&&rule.k==='week'&&!rule.dows.length){toast('반복할 요일을 골라 주세요');return}
      t.text=v.slice(0,200);t.tag=tag;
      if(nd!==t.day){
        if(rep)detach(t)
        if(nd)setDay(t,nd);else t.day=null;
      }
      if(nt!==t.time){if(t.rep)applyTime(t,nt);else t.time=nt}
      if(rep&&t.rep){ // 반복 내용·규칙 바꾸기
        rep.text=t.text;rep.tag=tag;
        if(!rule){save();close();stopRep(rep);return}
        const before=repLabel(rep);ruleToRep(rep,rule);const changed=before!==repLabel(rep);
        const t0=todayS();
        D.tasks=D.tasks.filter(x=>!(x.rep===rep.id&&!x.done&&x.day>=t0&&!repHits(rep,x.day)));
        D.tasks.forEach(x=>{if(x.rep===rep.id&&!x.done&&x.day>=t0){x.text=t.text;x.tag=tag}});
        save();ensureRepeats(st.y,st.m);close();render();if(changed)toast(repLabel(rep)+'로 바꿨어요');return}
      if(!rep&&rule){
        const r=ruleToRep({id:uid(),text:t.text,tag,time:t.time||null,start:t.day||todayS(),skip:[]},rule);
        D.reps.push(r);D.tasks.splice(D.tasks.indexOf(t),1);
        save();ensureRepeats(st.y,st.m);close();render();toast(repLabel(r)+' 반복으로 만들었어요');return}
      save();close();render()}}}),
    t.day&&!rep?h('button',{class:'btn',type:'button',text:'🎂 기념일로 바꾸기 (날짜 옆에 작게 표시)',on:{click:()=>{close();annivSheet(t.day,t)}}}):null,
    h('button',{class:'btn',type:'button',text:t.done?'완료 취소':'✓ 완료 (줄 긋기)',on:{click:()=>{close();toggle(t)}}}),
    !t.done&&t.day?h('button',{class:'btn',type:'button',text:'내일로 미루기',on:{click:()=>{const x=parse(t.day);x.setDate(x.getDate()+1);
      if(rep)detach(t)
      setDay(t,ymd(x));save();close();render();toast(md(t.day)+'로 미뤘어요')}}}):null,
    h('button',{class:'btn del',type:'button',text:rep?'이번 것만 지우기':'지우기',on:{click:()=>{
      const u=snap(t),skip0=rep?(rep.skip||[]).slice():null;if(rep)rep.skip=(rep.skip||[]).concat(t.day);
      D.tasks.splice(D.tasks.indexOf(t),1);save();close();render();toast('지웠어요',()=>{if(rep)rep.skip=skip0;u()})}}}),
    rep?h('button',{class:'btn del',type:'button',text:'반복 그만하기 (오늘 이후 것 지우기)',on:{click:()=>stopRep(rep,close)}}):null);
}
function stopRep(rep,close){
  const D=data();const t0=todayS();
  D.tasks=D.tasks.filter(x=>!(x.rep===rep.id&&!x.done&&x.day>=t0));
  D.tasks.forEach(x=>{if(x.rep===rep.id)x.rep=null});
  D.reps=D.reps.filter(r=>r!==rep);save();if(close)close();render();toast('반복을 그만했어요');
}

// 기념일·생일
function annivSheet(s,fromTask,edit){
  const ni=h('input',{id:'aName',maxlength:'12',placeholder:'예: 엄마 생신, 결혼기념일, 모임'});
  ni.value=edit?edit.name:fromTask?fromTask.text.slice(0,12):'';
  const picker=rulePicker(edit?edit.date:s,edit?annivRule(edit):null,true);
  const close=sheet(h('h3',{text:(edit?'기념일 고치기':md(s)+' 기념일')}),ni,
    h('div',{class:'sec',text:'반복할까요?'}),picker.el,
    h('p',{text:'날짜가 해마다 바뀌는 날은 "매년 5월 둘째 주 일요일", 모임은 "매월 셋째 주 토요일"처럼 골라요.'}),
    h('button',{class:'btn pri',type:'button',text:'저장',on:{click:()=>{const v=ni.value.trim().slice(0,12);if(!v){toast('이름을 적어 주세요');return}
      const r=picker.get();if(r&&r.k==='week'&&!r.dows.length){toast('요일을 골라 주세요');return}
      const rule=r||{k:'once'};
      const D=data();
      if(edit){edit.name=v;edit.rule=rule;delete edit.yearly;delete edit.lunar}
      else D.annivs.push({id:uid(),name:v,date:s,rule});
      if(fromTask){const i=D.tasks.indexOf(fromTask);if(i>=0)D.tasks.splice(i,1)}
      save();close();rerender();toast(v+' · '+ruleLabel(rule,edit?edit.date:s))}}}),
    edit?h('button',{class:'btn del',type:'button',text:'이 기념일 지우기',on:{click:()=>{close();delAnniv(edit)}}}):null);
  if(!fromTask&&!edit)setTimeout(()=>ni.focus(),50);
}
const annivWhen=a=>ruleLabel(annivRule(a),a.date);
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
    const w=h('div',{class:'widget'},h('div',{class:'wh'},h('span',{text:'덤푸 · 오늘 '+md(t0)}),h('span',{text:today.length?today.filter(t=>t.done).length+'/'+today.length:''})),
      D.habits.some(x=>!x.arch&&habitOn(x,t0))?h('div',{class:'wr',style:'color:var(--t6);font-weight:700;flex-wrap:wrap'},D.habits.filter(x=>!x.arch&&habitOn(x,t0)).map(x=>h('button',{type:'button',style:'color:inherit;font-weight:700;margin-right:10px',text:(habitDone(x,t0)?'♥ ':'♡ ')+(x.icon?x.icon+' ':'')+x.name,on:{click:()=>{toggleHabit(x,t0);settingsSheet()}}}))):null,
      today.length?today.slice(0,4).map(t=>h('div',{class:'wr'},h('button',{class:'ck'+(t.done?' on':''),type:'button','aria-label':'완료',on:{click:()=>{t.done=!t.done;t.doneAt=t.done?t0:null;save();render();settingsSheet()}}},t.done?'✓':''),h('span',{text:(t.time?t.time+' ':'')+t.text,style:t.done?'text-decoration:line-through;color:var(--muted)':''}))):h('div',{class:'wr',style:'color:var(--muted)',text:'오늘 할 일이 없어요'}));
    const sw=h('button',{type:'button',class:'sw'+(S.alarm?' on':''),'aria-label':'아침 알림',on:{click:()=>{S.alarm=!S.alarm;if(S.alarm&&B&&!demo)B.requestNoti();save();draw()}}});
    const hsw=h('button',{type:'button',class:'sw'+(S.hol?' on':''),'aria-label':'공휴일 표시',on:{click:()=>{S.hol=!S.hol;save();render();draw()}}});
    const tm=h('input',{type:'time',id:'sTime',value:S.time,on:{change:e=>{S.time=isTime(e.target.value)?e.target.value:'08:00';save();draw()}}});
    const preview=S.alarm?h('div',{class:'noti'},h('b',{text:'덤푸 · 매일 '+S.time}),left.length?'오늘 할 일 '+left.length+'개: '+(left[0].time?left[0].time+' ':'')+left[0].text+(left.length>1?' 외 '+(left.length-1)+'개':''):'오늘 할 일이 없어요. 데일리에 하나 적어 볼까요?'):null;
    const tagInputs=[S.tags.map((n,i)=>{const x=h('input',{id:'tg'+i,maxlength:'8',style:'margin:4px 0;flex:1;min-width:0'});x.value=n;x.addEventListener('input',()=>{if(x.value.length>=8&&!x.dataset.w){x.dataset.w=1;toast('카테고리 이름은 8자까지예요')}});x.addEventListener('change',()=>{const v=x.value.trim().slice(0,8)||n;if(S.tags.some((o,k)=>k!==i&&o===v)){x.value=n;toast('"'+v+'" 카테고리가 이미 있어요');return}S.tags[i]=v;save();render();setTimeout(draw,0)});
        return h('div',{class:'catrow','data-cat':i},h('span',{class:'grip','aria-hidden':'true',text:'≡'}),h('button',{type:'button',class:'dot c'+colOf(i),'aria-label':n+' 색 바꾸기 (지금 '+COLORS[colOf(i)]+')',on:{click:()=>{S.tagColor[i]=(colOf(i)+1)%8;save();render();draw()}}}),x,
          S.tags.length>1?h('button',{type:'button',class:'chip',text:'지우기','aria-label':n+' 카테고리 지우기',on:{click:()=>delTag(i,draw)}}):null)}),
      S.tags.length<8?h('button',{type:'button',class:'btn',text:'+ 카테고리 추가 ('+S.tags.length+'/8)',on:{click:()=>{const used=new Set(S.tags.map((_,k)=>colOf(k)));let c=0;while(used.has(c)&&c<7)c++;
        let nn='새 카테고리',q=2;while(S.tags.includes(nn))nn='새 카테고리'+q++;S.tags.push(nn);S.tagColor.push(c);save();render();draw();const e=document.getElementById('tg'+(S.tags.length-1));if(e){e.focus();e.select()}}}}):null,
      h('p',{text:'동그라미를 누르면 색이 바뀌고, ≡ 를 끌면 순서가 바뀌어요.'})];
    body.replaceChildren(...[
      h('div',{class:'sec',text:'홈 화면 위젯'}),h('p',null,B?'홈 화면 빈 곳을 길게 눌러 위젯 → 덤푸를 추가하면, 앱을 안 열고 오늘 할 일을 체크해요.':'오늘 할 일을 앱을 안 열고 바로 체크해요',B?null:h('span',{class:'app-only',text:'안드로이드 앱에서 돼요'})),w,
      h('div',{class:'sec',text:'아침 알림'}),
      h('div',{class:'set'},h('span',null,'매일 아침 오늘 할 일 알려주기',h('small',{text:B?'정한 시간에 오늘 할 일을 알려줘요':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'})),sw),
      S.alarm?h('div',{class:'set'},h('span',{text:'알림 시간'}),tm):null,preview,
      h('div',{class:'sec',text:'할 일 시간 알림'}),
      h('div',{class:'set'},h('span',null,'"3시 병원"처럼 시간을 정한 할 일',h('small',{text:B?'정한 때에 알려줘요. 끝낸 일은 알리지 않아요.':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'}))),
      h('div',{class:'chips',style:'padding-left:0;margin-bottom:6px'},[[-1,'끄기'],[0,'정각에'],[10,'10분 전'],[30,'30분 전'],[60,'1시간 전']].map(([v,l])=>h('button',{type:'button',class:'chip'+(((S.remind??10)===v)?' on':''),text:l,'aria-pressed':((S.remind??10)===v)?'true':'false',on:{click:()=>{S.remind=v;if(v>=0&&B&&!demo)B.requestNoti();save();draw()}}}))),
      h('div',{class:'sec',text:'매시간 기록 알림'}),
      h('div',{class:'set'},h('span',null,'"지난 1시간 동안 무엇을 했나요?" 알림',h('small',{text:B?'정한 시간 동안 매시 정각쯤 알려줘요. 이미 적은 시간은 건너뛰어요.':'아이폰·웹에서는 알림이 울리지 않아요 (안드로이드 앱에서 돼요)'})),
        h('button',{type:'button',class:'sw'+(S.hourly?' on':''),'aria-label':'매시간 기록 알림',on:{click:()=>{S.hourly=!S.hourly;if(S.hourly&&B&&!demo)B.requestNoti();save();draw()}}})),
      S.hourly?h('div',{class:'set'},h('span',{text:'알림 받을 시간'}),hourSel('hFrom',S.hFrom),h('span',{text:'~',style:'flex:none'}),hourSel('hTo',S.hTo)):null,
      h('div',{class:'sec',text:'시간표에 보일 시간'}),
      h('div',{class:'set'},h('span',null,'새벽 시간 보기',h('small',{text:'새벽 4시부터 보여요'})),h('button',{type:'button',class:'sw'+(S.early?' on':''),'aria-label':'새벽 시간 보기',on:{click:()=>{S.early=!S.early;save();render();draw()}}})),
      h('div',{class:'set'},h('span',null,'밤 시간 보기',h('small',{text:'밤 11시~새벽 2시까지 보여요'})),h('button',{type:'button',class:'sw'+(S.late?' on':''),'aria-label':'밤 시간 보기',on:{click:()=>{S.late=!S.late;save();render();draw()}}})),
      h('div',{class:'sec',text:'글자 크기'}),
      h('div',{class:'chips',style:'padding-left:0;margin-bottom:6px'},[[1,'보통'],[1.15,'크게'],[1.3,'아주 크게']].map(([v,l])=>h('button',{type:'button',class:'chip'+(((S.font||1)===v)?' on':''),text:l,'aria-pressed':((S.font||1)===v)?'true':'false',on:{click:()=>{S.font=v;save();applyFont();render();draw()}}}))),
      h('div',{class:'sec',text:'화면 색'}),
      h('div',{class:'chips',style:'padding-left:0;margin-bottom:6px'},[['auto','폰 설정 따라'],['light','밝게'],['dark','어둡게']].map(([v,l])=>{const cur=real.settings.theme||'auto';return h('button',{type:'button',class:'chip'+(cur===v?' on':''),text:l,'aria-pressed':cur===v?'true':'false',on:{click:()=>{real.settings.theme=v;save();applyTheme();render();draw()}}})})),
      h('div',{class:'sec',text:'달력'}),
      h('div',{class:'set'},h('span',null,'공휴일·기념일 표시',h('small',{text:'설날·추석·대체공휴일, 어버이날 등 (2026~2028년)'})),hsw),
      h('div',{class:'sec',text:'기념일·생일 '+D.annivs.length}),
      D.annivs.length?D.annivs.slice().sort((a,b)=>a.date.slice(5)<b.date.slice(5)?-1:1).map(a=>h('div',{class:'set'},h('span',null,a.name,h('small',{text:annivWhen(a)})),h('button',{type:'button',class:'chip',text:'고치기',on:{click:()=>annivSheet(a.date,null,a)}}))):h('p',{text:'먼슬리 달력에서 날짜를 누르고 "+ 기념일·생일"로 넣어요.'}),
      h('div',{class:'sec',text:'카테고리 '+S.tags.length}),tagInputs,
      h('div',{class:'sec',text:'백업 (폰 바꿀 때)'}),h('p',{text:'할 일·반복·기념일·습관·기분·일기·시간표를 한 파일로 옮겨요.'}),
      backupBlock(),
      h('div',{class:'sec',text:'반복 일정 '+D.reps.length}),
      D.reps.length?D.reps.map(r=>h('div',{class:'set'},h('span',null,r.text,h('small',{text:'↻ '+repLabel(r)+(r.time?' '+r.time:'')})),h('button',{type:'button',class:'chip',text:'그만하기',on:{click:()=>{stopRep(r);settingsSheet()}}}))):h('p',{text:'할 일을 누르고 "반복하기"를 고르면 여기에 모여요.'})].flat(Infinity).filter(x=>x!=null&&x!==false));
  };
  draw();
  sheet(h('h3',{text:'설정'}),body);
}
function delTag(i,redraw){
  const D=data(),S=D.settings,name=S.tags[i];
  const n=D.tasks.filter(t=>t.tag===i).length;
  const fix=o=>{if(o.tag===i)o.tag=null;else if(o.tag!=null&&o.tag>i)o.tag--};
  const ok=()=>{D.tasks.forEach(fix);D.reps.forEach(fix);Object.values(D.ents||{}).forEach(fix);(D.habits||[]).forEach(fix);S.tags.splice(i,1);S.tagColor.splice(i,1);
    if(st.brush==='cat:'+i)st.brush=null;else if(st.brush&&st.brush.startsWith('cat:')&&+st.brush.slice(4)>i)st.brush='cat:'+(+st.brush.slice(4)-1);
    if(st.addTag===i)st.addTag=null;else if(st.addTag!=null&&st.addTag>i)st.addTag--;save();render();settingsSheet();toast('"'+name+'" 카테고리를 지웠어요')};
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
  if(grip&&grip.closest('.ht-r[data-hab]')){const row=grip.closest('.ht-r[data-hab]');const pt=dragPoint(e);
    Object.assign(DR,{kind:'hab',cat:+row.dataset.hab,x0:pt.x,y0:pt.y,moved:false});beginDrag(pt,(data().habits[+row.dataset.hab]||{name:''}).name);if(e.type==='mousedown')e.preventDefault();return}
  if(grip){const row=grip.closest('.catrow');if(!row)return;
    const pt=dragPoint(e);Object.assign(DR,{kind:'cat',cat:+row.dataset.cat,x0:pt.x,y0:pt.y,moved:false});beginDrag(pt,row.querySelector('input').value);if(e.type==='mousedown')e.preventDefault();return}
  const el=e.target.closest('[data-tid]');
  if(!el||e.target.closest('.chip,input,textarea'))return;
  const pt=dragPoint(e);
  Object.assign(DR,{kind:'task',id:el.dataset.tid,x0:pt.x,y0:pt.y,moved:false});
  clearTimeout(DR.timer);
  DR.timer=setTimeout(()=>{const t=data().tasks.find(x=>x.id===DR.id);if(!t)return;
    try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
    beginDrag(pt,(t.time?t.time+' ':'')+t.text);el.classList.add('dragging')},480);
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
  else if(DR.kind==='hab')tgt=hit&&hit.closest('.ht-r[data-hab]');
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
  if(kind==='hab'){if(over&&+over.dataset.hab!==DR.cat){const pt=dragPoint(e);const r=over.getBoundingClientRect();const H=data().habits;const it=H.splice(DR.cat,1)[0];
    let to=+over.dataset.hab;if(to>DR.cat)to--;if(pt.y>r.top+r.height/2)to++;H.splice(to,0,it);save();render();toast('습관 순서를 바꿨어요')}return}
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
    detach(t)
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
  D.tasks.forEach(fix);D.reps.forEach(fix);Object.values(D.ents||{}).forEach(fix);(D.habits||[]).forEach(fix);
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
function setSlot(slot){
  const D=data();if(!(slot>=0&&slot<SLOTS))return null;
  D.logs[PT.day]=D.logs[PT.day]||{};const L=D.logs[PT.day];
  if(PT.mode==='erase'){
    const it=logItem(L[slot]);
    if(PT.all||(PT.qt!=null?(it&&it.kind==='e'&&it.text===PT.qt):PT.cat!=null?(it&&it.kind==='e'&&it.tag===PT.cat):L[slot]===PT.val))delete L[slot];
    return null}
  L[slot]=PT.val;return logItem(PT.val);
}
function paintCell(el){
  if(!el||!el.dataset.slot)return;
  const it=setSlot(+el.dataset.slot);
  el.className=el.className.replace(/ c\d| cn/g,'')+(it?' '+itemCls(it):'');
}
// 칠할 것 정하기 (처음 누른 칸 기준: 이미 같은 걸로 칠해져 있으면 지우기)
function prepBrush(day,slot){
  PT.day=day;PT.cat=null;PT.qt=null;PT.a=PT.b=slot;
  const L=(data().logs||{})[day]||{};
  if(st.brush==null){PT.mode='sel';return true}
  if(st.brush==='erase'){PT.mode='erase';PT.all=true;PT.val=null;return true}
  PT.all=false;
  if(st.brush.startsWith('cat:')){
    const i=+st.brush.slice(4);PT.cat=i;const it=logItem(L[slot]);
    if(it&&it.kind==='e'&&it.tag===i)PT.mode='erase';
    else{PT.mode='paint';const id=uid();ents()[id]={text:tagName(i),tag:i};PT.val='e:'+id}
  }else{if(!data().tasks.some(t=>t.id===st.brush)){st.brush=null;PT.mode='sel';return true}PT.val=st.brush;PT.mode=L[slot]===st.brush?'erase':'paint'}
  return true;
}
// 칠한 칸이 지금 고른 칠하기와 같은 것인지
function sameBrush(v){if(!st.brush)return false;if(st.brush.startsWith('cat:')){const it=logItem(v);return !!(it&&it.kind==='e'&&it.tag===+st.brush.slice(4))}return v===st.brush}
// 처음 칸~끝 칸 한 번에
function applyRange(day,lo,hi){
  prepBrush(day,lo);
  if(PT.mode==='sel'){const L=(data().logs||{})[day]||{};render();if(lo===hi&&L[lo])editRun(day,lo);else writeSheet(day,lo,hi);return}
  for(let n=lo;n<=hi;n++)setSlot(n);
  finishPaint();
  toast(slotT(lo)+'~'+slotT(hi+1)+(PT.mode==='erase'?' 지웠어요':' 칠했어요'));
}
// 짧게 톡: 첫 칸 고르기 → 끝 칸 톡
function tapCell(el){
  const tt=el.closest('.tt');if(!tt)return;
  const day=tt.dataset.day,slot=+el.dataset.slot,L=(data().logs||{})[day]||{};
  if(st.anc&&st.anc.day===day){const a=st.anc.slot;st.anc=null;applyRange(day,Math.min(a,slot),Math.max(a,slot));return}
  if(L[slot]&&st.brush!=='erase'&&(st.brush==null||!sameBrush(L[slot]))){editRun(day,slot);return}
  if(st.brush==='erase'&&L[slot]){applyRange(day,slot,slot);return} // 지우개는 한 번 톡으로 그 칸 지우기 (여러 칸은 끌거나 빈 칸부터 눌러요)
  st.anc={day,slot};render();
  try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}
}
function markPick(){const lo=Math.min(PT.a,PT.b),hi=Math.max(PT.a,PT.b);
  document.querySelectorAll('.tt .cell').forEach(c=>{const n=+c.dataset.slot;c.classList.toggle('pick',n>=lo&&n<=hi)})}
const PH={el:null,x:0,y:0,timer:null};
function paintBegin(el){
  const tt=el.closest('.tt');if(!tt)return false;
  st.anc=null;document.querySelectorAll('.cell.anc').forEach(c=>c.classList.remove('anc'));
  prepBrush(tt.dataset.day,+el.dataset.slot);PT.on=true;PT.moved=false;
  if(PT.mode==='sel'){markPick();return true}
  paintCell(el);return true;
}
let pGhost=null;
function showPGhost(p){
  if(!pGhost){pGhost=h('div',{class:'ghost pg'});document.body.append(pGhost)}
  const lo=Math.min(PT.a,PT.b),hi=Math.max(PT.a,PT.b);
  const nm=PT.mode==='sel'?'칠하고 적기':PT.mode==='erase'?'지우기':(logItem(PT.val)||{text:''}).text.slice(0,10);
  pGhost.textContent='↕ '+nm+' '+slotT(lo)+'~'+slotT(hi+1);
  pGhost.style.left=p.x+'px';pGhost.style.top=p.y+'px';
}
function paintStart(e){
  const el=e.target.closest('.tt-g .cell');if(!el)return;
  if(e.type==='mousedown'){if(e.cancelable)e.preventDefault();const tt=el.closest('.tt'),L=tt?((data().logs||{})[tt.dataset.day]||{}):{},v=L[+el.dataset.slot];if(tt&&v&&st.brush&&st.brush!=='erase'&&!sameBrush(v)){editRun(tt.dataset.day,+el.dataset.slot);return}paintBegin(el);return}
  // 손가락: 0.35초 가만히 누르고 있으면 칠하기 시작, 그 전에 움직이면 그냥 스크롤
  const p=e.touches[0];clearTimeout(PH.timer);
  Object.assign(PH,{el,x:p.clientX,y:p.clientY});
  PH.timer=setTimeout(()=>{const t=PH.el;if(!t)return;PH.el=null;try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}if(paintBegin(t)){t.classList.add('hold');document.body.classList.add('painting');showPGhost({x:PH.x,y:PH.y})}},350);
}
function paintMove(e){
  if(PH.el&&e.touches){const p=e.touches[0];if(Math.abs(p.clientX-PH.x)>8||Math.abs(p.clientY-PH.y)>8){clearTimeout(PH.timer);PH.el=null}return}
  if(!PT.on)return;if(e.cancelable)e.preventDefault();
  const el=cellAt(e);if(!el)return;
  const n=+el.dataset.slot;if(n!==PT.b){PT.moved=true;PT.b=n}
  if(PT.mode==='sel')markPick();else paintCell(el);
  if(e.touches)showPGhost({x:e.touches[0].clientX,y:e.touches[0].clientY});
}
function paintEnd(){
  if(PH.el){ // 짧게 톡: 첫 칸 → 끝 칸
    clearTimeout(PH.timer);const el=PH.el;PH.el=null;tapCell(el);return}
  document.querySelectorAll('.cell.hold').forEach(c=>c.classList.remove('hold'));
  document.body.classList.remove('painting');if(pGhost){pGhost.remove();pGhost=null}
  if(!PT.on)return;PT.on=false;finishPaint();
}
function finishPaint(){
  const D=data();
  if(PT.mode==='sel'){
    document.querySelectorAll('.tt .cell.pick').forEach(c=>c.classList.remove('pick'));
    const lo=Math.min(PT.a,PT.b),hi=Math.max(PT.a,PT.b),L=(D.logs||{})[PT.day]||{};
    if(lo===hi&&L[lo])editRun(PT.day,lo);else writeSheet(PT.day,lo,hi);
    return}
  // 할 일로 칠하면 그 일은 한 것으로 (줄 긋기)
  if(PT.mode==='paint'&&PT.val&&!PT.val.startsWith('e:')&&slotPast(PT.day,Math.min(PT.a,PT.b))){const t=D.tasks.find(x=>x.id===PT.val);if(t&&!t.done){t.done=true;t.doneAt=PT.day;t.autoDone=true}}
  if(D.logs[PT.day]&&!Object.keys(D.logs[PT.day]).length)delete D.logs[PT.day];
  if(PT.mode==='erase')undoAutoDone();
  pruneEnts();save();render();
}
// 칠해서 저절로 완료된 할 일은, 칠한 칸을 모두 지우면 다시 안 한 일로 (Jane 의견: 실수로 칠했다 지워도 완료가 남던 문제)
function undoAutoDone(){const D=data(),used=new Set();for(const d in D.logs)for(const k in D.logs[d])used.add(D.logs[d][k]);
  for(const t of D.tasks)if(t.autoDone&&t.done&&!used.has(t.id)){t.done=false;t.doneAt=null;delete t.autoDone}}
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
    const D=data();
    if(!entId){const tk=D.tasks.find(x=>x.day===day&&x.text.trim().toLowerCase()===v.toLowerCase());
      if(tk){D.logs[day]=D.logs[day]||{};for(let n=lo;n<=hi;n++)D.logs[day][n]=tk.id;if(!tk.done&&slotPast(day,lo)){tk.done=true;tk.doneAt=day;tk.autoDone=true}
        pruneEnts();save();close();render();toast(slotT(lo)+'~'+slotT(hi+1)+' '+tk.text+' (계획한 일로 칠했어요)');return}}
    const id=entId||uid();ents()[id]={text:v,tag:tag==null?null:tag};
    D.logs[day]=D.logs[day]||{};for(let n=lo;n<=hi;n++)D.logs[day][n]='e:'+id;
    pruneEnts();save();close();render();toast(slotT(lo)+'~'+slotT(hi+1)+' '+v)};
  ti.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.isComposing)go()});
  const close=sheet(h('h3',{text:md(day)+' '+(lo>=144?'다음날 ':'')+slotT(lo)+' ~ '+slotT(hi+1)}),h('p',{text:(hi-lo+1)*10+'분 동안 무엇을 했나요?'}),ti,
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
    h('button',{class:'btn del',type:'button',text:'이 시간 지우기',on:{click:()=>{for(let n=a;n<=b;n++)delete L[n];if(!Object.keys(L).length)delete data().logs[day];undoAutoDone();save();close();render();toast('지웠어요')}}}),
    h('button',{class:'btn',type:'button',text:'할 일 고치기',on:{click:()=>{close();editSheet(it.t)}}}));
}
document.addEventListener('touchstart',paintStart,{passive:true});
document.addEventListener('touchmove',paintMove,{passive:false});
document.addEventListener('touchend',paintEnd);
document.addEventListener('touchcancel',paintEnd);
document.addEventListener('mousedown',e=>{if(e.button===0&&!('ontouchstart' in window))paintStart(e)});
document.addEventListener('mousemove',e=>{if(PT.on)paintMove(e)});
document.addEventListener('mouseup',paintEnd);

// ── 백업: 백업 파일로 저장·백업 불러오기 (폰을 바꿀 때)
function cntTxt(o){const n=k=>Object.keys(o[k]||{}).length;const p=[['할 일',(o.tasks||[]).length],['반복',(o.reps||[]).length],['기념일',(o.annivs||[]).length],['습관',(o.habits||[]).length],['기분',n('mood')],['일기',n('diary')],['시간표',n('logs')+'일']].filter(x=>x[1]&&x[1]!=='0일');
  return p.length?p.map(x=>x[0]+' '+x[1]+(String(x[1]).endsWith('일')?'':'개')).join(', '):'기록 없음'}
// 백업 잠금: 비밀번호로 암호화 (PBKDF2-SHA256 60만 번 + AES-GCM, 7개 앱 같은 방식 · 폰 안에서만 처리)
// 파일에 반복 횟수를 it 칸으로 적어요. it 칸이 없는 옛 백업은 예전 값(20만 번)으로 열어요.
const LOCK=(()=>{
  const IT=600000,OLD=200000;
  const ok=()=>!!(window.crypto&&crypto.subtle&&crypto.getRandomValues&&window.TextEncoder);
  const b64=u=>{let t='';for(let i=0;i<u.length;i+=0x8000)t+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(t)};
  const unb64=t=>{const b=atob(String(t||'')),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  const key=(pw,salt,it)=>crypto.subtle.importKey('raw',new TextEncoder().encode(String(pw)),'PBKDF2',false,['deriveKey']).then(k=>crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']));
  const seal=(text,pw)=>{const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    return key(pw,salt,IT).then(k=>crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(text))).then(ct=>({v:1,it:IT,s:b64(salt),i:b64(iv),d:b64(new Uint8Array(ct))}))};
  const open=(o,pw)=>{if(!o||typeof o.s!=='string'||typeof o.i!=='string'||typeof o.d!=='string')return Promise.reject(0);
    const it=o.it==null?OLD:o.it;if(!Number.isInteger(it)||it<100000||it>5000000)return Promise.reject(0);
    return key(pw,unb64(o.s),it).then(k=>crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.i)},k,unb64(o.d))).then(pt=>new TextDecoder().decode(pt))};
  return {ok,seal,open};
})();
const PW_HINT='비밀번호 (선택, 8글자 이상)';
// 새로 잠글 비밀번호 확인: 8글자 이상, 숫자만이면 한 번 더 확인 (막지는 않아요)
let pwNumOk='';
function pwCheck(v){
  if(v.length<8){toast('비밀번호는 8글자 이상으로 해 주세요');return false}
  if(/^\d+$/.test(v)&&pwNumOk!==v){pwNumOk=v;toast('숫자만 쓰면 쉽게 풀릴 수 있어요. 글자를 섞어 주세요. 이대로 하려면 한 번 더 눌러 주세요');return false}
  return true}
function backupPlain(){return JSON.stringify({app:'dumpu',v:1,at:new Date().toISOString(),data:real})}
function backupCode(plain,v){if(!v)return Promise.resolve(plain);if(!pwCheck(v))return Promise.reject('short');
  return LOCK.seal(plain,v).then(o=>'DUMPU2L:'+JSON.stringify(o),()=>{toast('이 폰에서는 잠글 수 없어요');throw 'lock'})}
// 백업 파일 저장 (앱은 저장 위치 고르기, 웹은 다운로드)
function backupFile(c,locked,onDone){
  const fname='dumpu-backup-'+todayS()+'.json';
  window.__bkDone=(ok,why)=>{if(ok){onDone&&onDone();toast((locked?'잠근 ':'')+'백업 파일을 저장했어요. 새 폰에서는 "백업 불러오기"로 넣으면 돼요')}else if(why!=='cancel')toast('백업 파일을 저장하지 못했어요. 다시 해 주세요')};
  if(B&&B.backupSave){B.backupSave(fname,c);return}
  try{const url=URL.createObjectURL(new Blob([c],{type:'application/json'}));const a=h('a',{href:url,download:fname});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    onDone&&onDone();toast((locked?'잠근 ':'')+'백업 파일을 저장했어요 (다운로드 폴더)')}catch(e){toast('이 브라우저에서는 파일로 저장이 안 돼요. "다른 방법"의 글로 복사하기를 써 주세요')}}
// 설정·정보 창에 바로 들어가는 백업 칸 (비밀번호 칸 + 저장·불러오기, 두 번째 창 없이)
function backupBlock(after){
  const pw=LOCK.ok()?h('input',{type:'password',maxlength:'40',autocomplete:'new-password',placeholder:PW_HINT,'aria-label':PW_HINT}):null;
  const saveNow=()=>{if(demo){toast('예시로 둘러보는 중에는 백업이 안 돼요');return}
    const v=pw?pw.value:'';backupCode(backupPlain(),v).then(c=>backupFile(c,!!v,()=>{if(pw)pw.value='';after&&after()}),()=>{})};
  return [h('p',{class:'hint',style:'margin:4px 0 0',text:'일기·기분이 들어 있어서 비밀번호로 잠가 두면 안전해요. 비밀번호를 잊으면 열 수 없어요. 잠근 백업을 불러올 때도 이 칸에 넣어요.'}),pw,
    h('div',{class:'two'},h('button',{class:'btn pri',style:'margin:0',type:'button',text:'백업 파일로 저장',on:{click:saveNow}}),
      h('button',{class:'btn',style:'margin:0',type:'button',text:'백업 불러오기',on:{click:()=>{const v=pw?pw.value:'';after&&after();importSheet(v)}}})),
    h('button',{class:'btn',type:'button',text:'다른 방법 (글로 복사 · 카톡으로 보내기)',on:{click:()=>{const v=pw?pw.value:'';after&&after();backupSaveClick(v)}}})];
}
function exportSheet(pre){
  const plain=backupPlain();
  const pw=LOCK.ok()?h('input',{type:'password',id:'expPw',maxlength:'40',autocomplete:'new-password',placeholder:PW_HINT,'aria-label':PW_HINT}):null;
  if(pw&&pre)pw.value=pre;
  // 비밀번호를 넣었으면 잠근 글, 비었으면 그냥 글
  const code=()=>backupCode(plain,pw?pw.value:'');
  let close;
  const saveFile=()=>code().then(c=>backupFile(c,c!==plain,()=>{if(close)close()}),()=>{});
  const copy=()=>code().then(c=>{
    const fb=()=>{const ta=h('textarea',{readonly:'readonly',class:'code',rows:'4'});ta.value=c;close&&document.querySelector('.sheet').append(ta);ta.focus();ta.select();toast('글이 선택됐어요. 길게 눌러 복사해 주세요')};
    try{navigator.clipboard.writeText(c).then(()=>toast(c===plain?'복사했어요 (잠그지 않은 글이에요)':'잠근 백업을 복사했어요'),fb)}catch(e){fb()}},()=>{});
  close=sheet(h('h3',{text:'백업 파일로 저장'}),
    h('p',{text:'들어 있는 기록: '+cntTxt(real)+'. 폰을 바꿀 때 이 파일을 새 폰으로 옮긴 뒤 "백업 불러오기"로 넣으면 그대로 옮겨져요.'}),
    pw?[h('p',{class:'hint',style:'margin:8px 0 0',text:'🔒 일기·기분이 들어 있어서 잠가 두면 안전해요. 비밀번호를 잊으면 열 수 없어요.'}),pw]:null,
    h('button',{class:'btn pri',type:'button',text:'백업 파일로 저장',on:{click:saveFile}}),
    h('button',{class:'btn',type:'button',text:'글로 복사하기 (카톡·메모에 붙여 두기)',on:{click:copy}}),
    B&&B.share?h('button',{class:'btn',type:'button',text:'카톡·메모로 보내기',on:{click:()=>code().then(c=>{if(c.length>200000){toast('너무 커서 보내기가 안 돼요. 백업 파일로 저장해 주세요');return}B.share(c)},()=>{})}}):
      navigator.share?h('button',{class:'btn',type:'button',text:'카톡·메모로 보내기',on:{click:()=>code().then(c=>navigator.share({title:'덤푸 백업',text:c}).catch(()=>{}),()=>{})}}):null);
}
function backupSaveClick(pre){if(demo){toast('예시로 둘러보는 중에는 백업이 안 돼요');return}exportSheet(typeof pre==='string'?pre:'')}
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
      day:isDate(t.day)?t.day:null,time:isTime(t.time)?t.time:null,done:t.done===true,doneAt:t.done===true?(isDate(t.doneAt)?t.doneAt:(isDate(t.day)?t.day:todayS())):null,
      ord:Number.isFinite(t.ord)?t.ord:undefined,src:['d','m','w'].includes(t.src)?t.src:undefined,fromRep:okId(t.fromRep)?t.fromRep:undefined,autoDone:t.autoDone===true&&t.done===true?true:undefined})}
  for(const r of (Array.isArray(d.reps)?d.reps:[]).slice(0,500)){if(!r||!okId(r.id))continue;
    const text=cleanStr(r.text,200).trim();if(!text||(r.type!=='week'&&r.type!=='month'&&r.type!=='nthM'))continue;
    const dows=Array.isArray(r.dows)?[...new Set(r.dows.filter(x=>Number.isInteger(x)&&x>=0&&x<7))]:Number.isInteger(r.dow)&&r.dow>=0&&r.dow<7?[r.dow]:[]; // 옛 버전: 요일 하나(dow)
    if(r.type==='week'&&!dows.length)continue;
    out.reps.push({id:r.id,text,tag:Number.isInteger(r.tag)&&r.tag>=0&&r.tag<8?r.tag:null,type:r.type,dows,n:r.type==='nthM'?(r.n===-1||(Number.isInteger(r.n)&&r.n>=1&&r.n<=5)?r.n:1):undefined,w:r.type==='nthM'&&Number.isInteger(r.w)&&r.w>=0&&r.w<7?r.w:undefined,dom:Number.isInteger(r.dom)&&r.dom>=1&&r.dom<=31?r.dom:1,
      time:isTime(r.time)?r.time:null,start:isDate(r.start)?r.start:todayS(),skip:(Array.isArray(r.skip)?r.skip:[]).filter(isDate).slice(-2000)})}
  for(const a of (Array.isArray(d.annivs)?d.annivs:[]).slice(0,500)){if(!a||!okId(a.id)||!isDate(a.date))continue;
    const name=cleanStr(a.name,12).trim();if(!name)continue;
    const x={id:a.id,name,date:a.date,yearly:a.yearly!==false};
    const r=a.rule;
    if(r&&typeof r==='object'&&['once','week','month','nthM','year','nthY','lunar'].includes(r.k)){const y={k:r.k};const I=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
      if(r.k==='week'){y.dows=Array.isArray(r.dows)?[...new Set(r.dows.filter(v=>I(v,0,6)))]:[];if(!y.dows.length)y.dows=[dowOf(a.date)]}
      if(r.k==='month')y.dom=I(r.dom,1,31)?r.dom:+a.date.slice(8);
      if(r.k==='nthM'||r.k==='nthY'){y.n=r.n===-1||I(r.n,1,5)?r.n:1;y.w=I(r.w,0,6)?r.w:dowOf(a.date)}
      if(r.k==='nthY')y.m=I(r.m,1,12)?r.m:+a.date.slice(5,7);
      if(r.k==='lunar'){if(I(r.lm,1,12)&&I(r.ld,1,30)){y.lm=r.lm;y.ld=r.ld}else y.k='year'}
      x.rule=y}
    if(a.lunar===true&&Number.isInteger(a.lm)&&a.lm>=1&&a.lm<=12&&Number.isInteger(a.ld)&&a.ld>=1&&a.ld<=30){x.lunar=true;x.lm=a.lm;x.ld=a.ld}
    out.annivs.push(x)}
  if(d.mood&&typeof d.mood==='object'&&!Array.isArray(d.mood)){for(const k in d.mood){if(isDate(k)&&MOODS.includes(d.mood[k]))out.mood[k]=d.mood[k]}}
  if(d.diary&&typeof d.diary==='object'&&!Array.isArray(d.diary)){let n=0;for(const k in d.diary){if(!isDate(k)||++n>20000)continue;const v=cleanStr(d.diary[k],200).trim();if(v)out.diary[k]=v}}
  if(d.logs&&typeof d.logs==='object'&&!Array.isArray(d.logs)){let n=0;
    for(const day in d.logs){if(!isDate(day)||++n>5000)continue;const v=d.logs[day];if(!v||typeof v!=='object')continue;const o={};
      for(const k in v){const i=+k,x=v[k];if(Number.isInteger(i)&&i>=0&&i<162&&typeof x==='string'&&(okId(x)||(/^e:/.test(x)&&okId(x.slice(2)))))o[i]=x}if(Object.keys(o).length)out.logs[day]=o}}
  if(d.ents&&typeof d.ents==='object'&&!Array.isArray(d.ents)){let n=0;
    for(const id in d.ents){if(!okId(id)||++n>50000)continue;const e=d.ents[id];if(!e)continue;const text=cleanStr(e.text,30).trim();if(!text)continue;
      out.ents[id]={text,tag:Number.isInteger(e.tag)&&e.tag>=0&&e.tag<8?e.tag:null}}}
  for(const day in out.logs){const o=out.logs[day];for(const k in o)if(o[k].startsWith('e:')&&!out.ents[o[k].slice(2)])delete o[k];if(!Object.keys(o).length)delete out.logs[day]}
  for(const x of (Array.isArray(d.habits)?d.habits:[]).slice(0,100)){if(!x||!okId(x.id))continue;const name=cleanStr(x.name,20).trim();if(!name)continue;
    const dw=Array.isArray(x.dows)?[...new Set(x.dows.filter(v=>Number.isInteger(v)&&v>=0&&v<7))].sort():[];
    const okIcon=typeof x.icon==='string'&&ICON_SETS.some(([,v])=>iconsOf(v).includes(x.icon));
    const ps=(Array.isArray(x.pauses)?x.pauses:[]).filter(p=>p&&isDate(p.a)&&isDate(p.b)).slice(0,50).map(p=>p.a<=p.b?{a:p.a,b:p.b}:{a:p.b,b:p.a});
    out.habits.push({id:x.id,arch:x.arch===true,time:isTime(x.time)?x.time:null,pauses:ps.length?ps:null,name,tag:Number.isInteger(x.tag)&&x.tag>=0&&x.tag<8?x.tag:null,dows:dw.length&&dw.length<7?dw:null,since:isDate(x.since)?x.since:undefined,icon:okIcon?x.icon:null,goal:Number.isInteger(x.goal)&&x.goal>=1&&x.goal<=7?x.goal:null})}
  if(d.hchk&&typeof d.hchk==='object'&&!Array.isArray(d.hchk)){const ids=new Set(out.habits.map(x=>x.id));let n=0;
    for(const k in d.hchk){if(!isDate(k)||++n>20000||!Array.isArray(d.hchk[k]))continue;const a=[...new Set(d.hchk[k].filter(v=>ids.has(v)))];if(a.length)out.hchk[k]=a}}
  if(d.hnote&&typeof d.hnote==='object'&&!Array.isArray(d.hnote)){const ids=new Set(out.habits.map(x=>x.id));let n=0;
    for(const k in d.hnote){if(!isDate(k)||++n>20000)continue;const v=d.hnote[k];if(!v||typeof v!=='object')continue;const o={};
      for(const id in v){if(ids.has(id)){const t=cleanStr(v[id],40).trim();if(t)o[id]=t}}if(Object.keys(o).length)out.hnote[k]=o}}
  const S=d.settings||{};
  out.settings.alarm=S.alarm===true;out.settings.theme=['auto','light','dark'].includes(S.theme)?S.theme:'auto';out.settings.font=[1,1.15,1.3].includes(S.font)?S.font:1;out.settings.time=isTime(S.time)?S.time:'08:00';out.settings.hol=S.hol!==false;out.settings.early=S.early===true;out.settings.late=S.late===true;out.settings.palV=2;out.settings.remind=[-1,0,10,30,60].includes(S.remind)?S.remind:10;out.settings.hourly=S.hourly===true;out.settings.hFrom=Number.isInteger(S.hFrom)&&S.hFrom>=0&&S.hFrom<24?S.hFrom:9;out.settings.hTo=Number.isInteger(S.hTo)&&S.hTo>=0&&S.hTo<24?S.hTo:22;
  if(Array.isArray(S.tags)&&S.tags.length){const seen=new Set();out.settings.tags=S.tags.slice(0,8).map((x,i)=>{let v=cleanStr(x,8).trim()||('카테고리'+(i+1)),q=2;const b=v.slice(0,7);while(seen.has(v))v=b+q++;seen.add(v);return v})}
  out.settings.tagColor=out.settings.tags.map((_,i)=>Array.isArray(S.tagColor)&&Number.isInteger(S.tagColor[i])&&S.tagColor[i]>=0&&S.tagColor[i]<8?S.tagColor[i]:i%8);
  if(S.palV!==2){const MAP=[4,3,1,6,5,2,3,7];out.settings.tagColor=out.settings.tagColor.map(o=>MAP[o])}
  const nT=out.settings.tags.length;out.tasks.forEach(t=>{if(t.tag!=null&&t.tag>=nT)t.tag=null});Object.values(out.ents).forEach(e=>{if(e.tag!=null&&e.tag>=nT)e.tag=null});out.habits.forEach(e=>{if(e.tag!=null&&e.tag>=nT)e.tag=null});out.reps.forEach(r=>{if(r.tag!=null&&r.tag>=nT)r.tag=null});
  return out;
}
function importSheet(pre){
  const ta=h('textarea',{id:'impTxt',rows:'4',class:'code',placeholder:'또는 복사해 둔 백업 글을 여기에 붙여 넣어요'});
  const pw=h('input',{type:'password',id:'impPw',maxlength:'40',autocomplete:'off',placeholder:'잠근 백업이면 비밀번호','aria-label':'백업 비밀번호'});
  if(typeof pre==='string'&&pre)pw.value=pre;
  const go=()=>{
      const txt=ta.value.trim();if(!txt){toast('백업 파일을 고르거나 백업 글을 붙여 넣어 주세요');return}
      if(txt.length>12000000){toast('백업이 너무 커서 한 번에 못 불러와요');return}
      const bad=()=>toast('덤푸 백업이 아니에요. 덤푸에서 저장한 백업 파일을 골라 주세요');
      if(txt.startsWith('DUMPU2L:')){if(!pw.value){toast('잠근 백업이에요. 비밀번호를 넣고 "불러오기"를 눌러 주세요');pw.focus();return}
        let o;try{o=JSON.parse(txt.slice(8))}catch(e){bad();return}
        LOCK.open(o,pw.value).then(t=>{let out;try{out=importData(JSON.parse(t))}catch(e){bad();return}confirmImp(out)},()=>toast('비밀번호가 맞지 않아요'));return}
      let out;try{out=importData(JSON.parse(txt))}catch(e){bad();return}
      confirmImp(out)};
  const got=t=>{if(t==null){return}ta.value=t;go()};
  window.__bkOpened=(t,why)=>{if(t==null){if(why!=='cancel')toast('파일을 읽지 못했어요. 다시 골라 주세요');return}got(t)};
  const fi=h('input',{type:'file',accept:'.json,.txt,application/json,text/plain',hidden:'hidden',on:{change:()=>{const f=fi.files&&fi.files[0];fi.value='';if(!f)return;if(f.size>12000000){toast('백업이 너무 커서 한 번에 못 불러와요');return}
    const r=new FileReader();r.onload=()=>got(String(r.result||''));r.onerror=()=>toast('파일을 읽지 못했어요. 다시 골라 주세요');r.readAsText(f)}}});
  sheet(h('h3',{text:'백업 불러오기'}),h('p',{text:'불러오기 전에 지금 기록과 백업에 든 개수를 보여 드리고 한 번 더 물어봐요.'}),pw,
    h('button',{class:'btn pri',type:'button',text:'백업 파일 고르기',on:{click:()=>{if(B&&B.backupOpen)B.backupOpen();else fi.click()}}}),fi,
    h('div',{class:'sec',text:'백업 글로 불러오기'}),ta,
    h('button',{class:'btn',type:'button',text:'불러오기',on:{click:go}}));
  function confirmImp(out){
      const c2=sheet(h('h3',{text:'정말 바꿀까요?'}),h('p',{text:'백업 내용('+cntTxt(out)+')으로 바뀌어요. 지금 이 폰의 기록('+cntTxt(real)+')은 지워져요. 바꾸기 전에 지금 기록을 백업 파일로 저장해 두면 안전해요.'}),
        h('button',{class:'btn del',type:'button',text:'바꾸기',on:{click:()=>{const prev=real;demo=null;real=out;save();c2();render();toast('불러왔어요',()=>{real=prev;save();render();toast('원래 기록으로 돌아왔어요')})}}}),
        h('button',{class:'btn',type:'button',text:'그만두기',on:{click:()=>c2()}}))}
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
  if(st.anc){st.anc=null;render();return true}
  if(st.pick){st.pick=null;render();return true}
  if(st.tab!=='monthly'){st.tab='monthly';render();return true}
  return false};
applyWidgetOps();
render();
syncNative();
if(brokenSaved)setTimeout(()=>toast('예전 기록을 읽지 못했어요. 원래 내용은 따로 보관해 두었어요'),300);
if(window.APP_INFO)window.APP_INFO.backup={save:backupSaveClick,open:importSheet,block:backupBlock}; // 버전 창에서도 백업
if(window.AppInfo)AppInfo.init();
function onBack2App(){applyWidgetOps();render();syncNative()}
window.__onResume=onBack2App;
document.addEventListener('focusin',e=>{if(e.target.closest('#app input,#app textarea'))document.body.classList.add('typing')});
document.addEventListener('focusout',()=>document.body.classList.remove('typing'));
window.__openHabit=function(){closePop();if(closeLayer)closeLayer();st.tab='habit';st.y=now.getFullYear();st.m=now.getMonth();st.hpage=null;render();return true};
window.__openDaily=function(){closePop();if(closeLayer)closeLayer();st.day=todayS();st.tab='daily';render();setTimeout(()=>{const n=document.querySelector('.tt-r.now');if(n)n.scrollIntoView({block:'center'})},50)};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onBack2App()});
})();
