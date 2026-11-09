// 앱 정보 (버전은 index.html의 app-version 한 곳에서만 바꿔요)
(function(){
var VERSION=(document.querySelector('meta[name=app-version]')||{}).content||'1.0';
window.APP_INFO={name:'덤푸',repo:'dlsdml99-create/dumpu',apkName:'dumpu.apk',version:VERSION,online:location.protocol!=='file:',mount:'#ver',
  notes:[['1.0','2026.11.09','처음 나왔어요. 먼슬리에 우다다 적고 주차 버튼으로 위클리, 요일 버튼으로 데일리 정리. 완료 날짜 기록과 달력 표시, 밀린 일 옮기기, 반복 할 일, 색깔, 홈 화면 위젯, 아침 알림.']],
  privacy:'적은 할 일과 완료 기록은 이 기기에만 저장돼요. 계정·서버·광고·사용 기록 전송이 없어요. 인터넷은 새 버전 확인(GitHub 공개 정보 읽기)에만 써요.'};
})();
