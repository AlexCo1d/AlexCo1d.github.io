'use strict';
(() => {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 let language=document.documentElement.lang.startsWith('zh')?'zh':'en';
 let records=[],selectedExample='positive',selectedMatch=0,heroKey='';
 const hero=$('#hero-video');
 const names={causal:['Causal','因果'],sequential:['Sequential','顺序'],synchronous:['Synchronous','同步'],bounded:['Bounded','时间范围'],static:['Static','静态'],dynamic:['Dynamic','动态'],identity:['Identity','身份'],negative:['Negative','无匹配']};
 const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
 const status=(element,en,zh)=>{if(element)element.textContent=language==='zh'?zh:en;};
 function installMedia(video,statusElement){
  video.addEventListener('playing',()=>{video.classList.remove('media-unavailable');status(statusElement,'Playing the selected video segment.','正在播放所选视频片段。');});
  video.addEventListener('error',()=>{video.classList.add('media-unavailable');status(statusElement,'Video unavailable here; open the original on HF.','当前无法播放视频，可打开 HF 原视频。');});
  video.addEventListener('loadedmetadata',()=>{if(video.dataset.pendingStart)video.currentTime=Number(video.dataset.pendingStart);});
  video.addEventListener('play',()=>{$$('video').forEach(other=>{if(other!==video)other.pause();});});
  video.addEventListener('timeupdate',()=>{
   const end=Number(video.dataset.segmentEnd);
   if(end&&video.currentTime>=end-.04&&!video.paused){video.pause();status(statusElement,`Segment ends at ${time(end)}. Click another timestamp to continue.`,`片段在 ${time(end)} 结束，可点击其他时间区间继续。`);}
  });
 }
 function play(video,start,end,statusElement){
  video.dataset.pendingStart=String(start);video.dataset.segmentEnd=String(end);
  status(statusElement,`Loading ${time(start)}–${time(end)}…`,`正在加载 ${time(start)}–${time(end)}…`);
  if(video.readyState>=1)video.currentTime=start;
  const promise=video.play();if(promise)promise.catch(()=>status(statusElement,'Use the video play control, or open the HF source.','请使用视频播放控件，或打开 HF 原视频。'));
 }
 function renderHero(){
  if(!records.length)return;
  const item=records.find(r=>r.key===(selectedExample==='negative'?'negative':'jaguar'));
  $('#example-query').textContent=language==='zh'?item.queryZh:item.queryText;
  $('#event-count').textContent=item.count;
  $('#window-label').textContent=item.window?`${time(item.window[0])}–${time(item.window[1])}`:`00:00–${time(item.duration)}`;
  $('#video-end').textContent=time(item.duration);
  if(item.window){const x=12+416*item.window[0]/item.duration,w=416*(item.window[1]-item.window[0])/item.duration;$('#search-window').setAttribute('x',x);$('#search-window').setAttribute('width',w);$('#scope-boundaries').setAttribute('d',`M${x} 7v33M${x+w} 7v33`);}
  const tags=$('#hero-condition-tags');tags.replaceChildren();
  item.conditions.forEach(condition=>{const span=document.createElement('span');const kind=['causal','sequential','synchronous','bounded'].includes(condition)?'temporal':condition==='negative'?'negative':'spatial';span.className=`condition-tag condition-${kind}`;span.textContent=names[condition][language==='zh'?1:0];tags.append(span);});
  if(heroKey!==item.key){hero.pause();heroKey=item.key;hero.poster=item.poster;hero.src=`${item.src}#t=${item.start},${item.end}`;hero.dataset.pendingStart=String(item.start);hero.dataset.segmentEnd=String(item.end);status($('#hero-media-status'),item.count?'Video begins at the first annotated moment.':'Context preview; no matching event is annotated.',item.count?'视频从第一个标注事件开始。':'播放背景片段；标注中没有匹配事件。');}
 }
 installMedia(hero,$('#hero-media-status'));
 $$('[data-case]').forEach(card=>{
  const video=card.querySelector('video');const mediaStatus=card.querySelector('.card-media-status');installMedia(video,mediaStatus);
  const fragment=video.getAttribute('src').split('#t=')[1];if(fragment){const [start,end]=fragment.split(',');video.dataset.pendingStart=start;video.dataset.segmentEnd=end;}
  card.querySelectorAll('[data-card-moment]').forEach(button=>button.addEventListener('click',()=>{
   const item=records.find(r=>r.key===card.dataset.case);if(!item)return;const index=Number(button.dataset.cardMoment);const [start,end]=item.intervals[index];
   card.querySelectorAll('[data-card-moment]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));play(video,start,end,mediaStatus);
  }));
 });
 $$('[data-condition-filter]').forEach(button=>button.addEventListener('click',()=>{
  const condition=button.dataset.conditionFilter;
  $$('[data-condition-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  $$('[data-case]').forEach(card=>{card.hidden=condition!=='all'&&!card.dataset.conditions.split(' ').includes(condition);if(card.hidden)card.querySelector('video').pause();});
 }));
 document.addEventListener('comet-language',event=>{language=event.detail.lang;renderHero();});
 document.addEventListener('comet-example',event=>{selectedExample=event.detail.example;selectedMatch=event.detail.index;language=event.detail.lang;renderHero();});
 document.addEventListener('comet-match',event=>{
  selectedExample=event.detail.example;selectedMatch=event.detail.index;renderHero();
  if(!event.detail.play||!records.length)return;
  const item=records.find(r=>r.key===(selectedExample==='negative'?'negative':'jaguar'));
  const interval=item.intervals[selectedMatch]||[item.start,item.end];play(hero,interval[0],interval[1],$('#hero-media-status'));
 });
 fetch('assets/examples.json').then(response=>{if(!response.ok)throw Error('Examples unavailable');return response.json();}).then(data=>{records=data;renderHero();}).catch(()=>{status($('#hero-media-status'),'Open the HF dataset to view the original examples.','可在 HF 数据集中查看原始示例。');});
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause();}),{threshold:.05});$$('video').forEach(video=>observer.observe(video));}
})();
