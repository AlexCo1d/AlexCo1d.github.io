'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lang = 'en';
  let example = 'positive';
  let match = 0;
  let stage = 0;
  let model = 'gpt';
  let replayTimers = [];
  const examples = {
    positive: {
      en: 'Between 16:00 and 34:00, how many distinct segments show a jaguar swimming against the river current?',
      zh: '在 16:00 至 34:00 之间，美洲豹逆着河水游泳的不同片段共有多少个？',
      window: '16:00–34:00', end: '44:00', x: 163.3, width: 170.2, count: 3
    },
    negative: {
      en: 'Between 00:00 and 05:00, how many times does a male adult enter the room to take care of the baby?',
      zh: '在 00:00 至 05:00 之间，一名成年男性进入房间照看婴儿的次数是多少？',
      window: '00:00–05:00', end: '30:17', x: 12, width: 68.69, count: 0
    }
  };
  const stages = [
    {en:'The Planner Agent interprets the query, selects graph settings, and narrows the search to any explicitly bounded time window.',zh:'Planner Agent 解析查询、选择图结构参数，并根据显式时间约束缩小搜索范围。'},
    {en:'A hierarchical temporal graph organizes coarse events and fine-grained actions. The Filter Agent removes clearly irrelevant event segments.',zh:'分层时序图组织粗粒度事件与细粒度动作。Filter Agent 筛除明显无关的事件片段。'},
    {en:'The Verifier Agent expands a candidate’s graph neighborhood, checks spatial and temporal conditions, and writes verified hits to global memory.',zh:'Verifier Agent 扩展候选节点的图邻域，核验空间与时间条件，并将确认的事件写入全局记忆。'},
    {en:'The Aggregator Agent reads the global memory, resolves duplicate and identity-related matches, and returns all grounded intervals with the final count.',zh:'Aggregator Agent 读取全局记忆，处理重复与身份一致性问题，输出所有定位区间及最终计数。'}
  ];
  const comparisons = {
    gpt:{name:'GPT-5',baseline:10.1,agent:16.2},
    qwen:{name:'Qwen3-VL',baseline:3.4,agent:8.8},
    gemini:{name:'Gemini 3 Flash',baseline:14.6,agent:19.0}
  };
  const intervals=['30:43–30:52','30:56–31:10','31:19–31:40'];
  function cancelReplay(){replayTimers.forEach(window.clearTimeout);replayTimers=[];}
  function updateMatch(play=false){
    $$('[data-match]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.match)===match)));
    $$('[data-block]').forEach(block=>block.classList.toggle('active',Number(block.dataset.block)===match));
    $$('.block-number').forEach((number,index)=>number.classList.toggle('active',index===match));
    document.dispatchEvent(new CustomEvent('comet-match',{detail:{index:match,example,play}}));
    $('#demo-status').textContent=lang==='zh'?`所选事件 ${match+1}：${intervals[match]}。共 3 个事件。`:`Selected event ${match+1}: ${intervals[match]}. Three events in total.`;
  }
  function updateExample(){
    const selected=examples[example];
    $('#example-query').textContent=selected[lang];
    $('#window-label').textContent=selected.window;
    $('#video-end').textContent=selected.end;
    $('#search-window').setAttribute('x',selected.x);
    $('#search-window').setAttribute('width',selected.width);
    $('#scope-boundaries').setAttribute('d',`M${selected.x} 7v33M${selected.x+selected.width} 7v33`);
    $('#event-count').textContent=selected.count;
    $('#evidence-view').hidden=example==='negative';
    $('#empty-evidence').hidden=example==='positive';
    $('#replay').hidden=example==='negative';
    $$('[data-example]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.example===example)));
    if(example==='positive')updateMatch();
    else $('#demo-status').textContent=lang==='zh'?'该时间范围内没有匹配事件。答案为 0，定位结果为空。':'No matching event in this window. The count is zero and the grounded set is empty.';
    document.dispatchEvent(new CustomEvent('comet-example',{detail:{example,lang,index:match}}));
  }
  function updateStage(){
    $$('[data-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.step)===stage)));
    $('#step-description').textContent=stages[stage][lang];
  }
  function updateResults(){
    const selected=comparisons[model];
    $$('[data-model]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.model===model)));
    $('#baseline-label').textContent=`${selected.name} · ${lang==='zh'?'单次推理':'single pass'}`;
    $('#agent-label').textContent=`CoMET-Agent · ${selected.name}`;
    $('#baseline-value').textContent=`${selected.baseline.toFixed(1)}%`;
    $('#agent-value').textContent=`${selected.agent.toFixed(1)}%`;
    $('#gain-value').textContent=`+${(selected.agent-selected.baseline).toFixed(1)}`;
    $('#baseline-bar').style.width=`${selected.baseline/24*100}%`;
    $('#agent-bar').style.width=`${selected.agent/24*100}%`;
    $('#result-status').textContent=lang==='zh'?`${selected.name}：单次推理 ${selected.baseline.toFixed(1)}%，CoMET-Agent ${selected.agent.toFixed(1)}%，提升 ${(selected.agent-selected.baseline).toFixed(1)} 个百分点。`:`${selected.name}: single pass ${selected.baseline.toFixed(1)}%, CoMET-Agent ${selected.agent.toFixed(1)}%, a gain of ${(selected.agent-selected.baseline).toFixed(1)} percentage points.`;
  }
  function setLanguage(next){
    lang=next;
    document.documentElement.lang=lang==='zh'?'zh-CN':'en';
    // Keep the attribute short as well: CSS uses this page's language class.
    document.documentElement.classList.toggle('language-zh',lang==='zh');
    $$('[data-en][data-zh]').forEach(element=>element.textContent=element.dataset[lang]);
    $$('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===lang)));
    $('#copy-status').textContent='';
    updateExample();updateStage();updateResults();
    document.dispatchEvent(new CustomEvent('comet-language',{detail:{lang}}));
    try{localStorage.setItem('comet-project-language',lang);}catch(error){/* Content remains usable without storage. */}
  }
  $$('[data-lang]').forEach(button=>button.addEventListener('click',()=>{cancelReplay();setLanguage(button.dataset.lang);}));
  $$('[data-example]').forEach(button=>button.addEventListener('click',()=>{cancelReplay();example=button.dataset.example;match=0;updateExample();}));
  $$('[data-match]').forEach(button=>button.addEventListener('click',()=>{cancelReplay();match=Number(button.dataset.match);updateMatch(true);}));
  $$('[data-step]').forEach(button=>button.addEventListener('click',()=>{stage=Number(button.dataset.step);updateStage();}));
  $$('[data-model]').forEach(button=>button.addEventListener('click',()=>{model=button.dataset.model;updateResults();}));
  $('#replay').addEventListener('click',()=>{cancelReplay();updateMatch(true);});
  reducedMotion.addEventListener('change',()=>{cancelReplay();});
  let bibtex='';
  fetch('assets/citation.bib').then(response=>{if(!response.ok)throw new Error('Citation unavailable');return response.text();}).then(text=>{bibtex=text;$('#bibtex').textContent=text;}).catch(()=>{
    $('#bibtex').textContent=lang==='zh'?'请下载 BibTeX 文件查看引用信息。':'Download the BibTeX file to view the citation.';
    $('#copy-citation').disabled=true;
  });
  $('#copy-citation').addEventListener('click',async()=>{
    if(!bibtex)return;
    try{
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(bibtex);
      else{
        const range=document.createRange();range.selectNodeContents($('#bibtex'));
        const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
        const copied=document.execCommand('copy');selection.removeAllRanges();if(!copied)throw new Error('Clipboard unavailable');
      }
      $('#copy-status').textContent=lang==='zh'?'已复制 BibTeX。':'BibTeX copied.';
    }catch(error){$('#copy-status').textContent=lang==='zh'?'无法自动复制；可以选中文本复制或下载 .bib 文件。':'Select the text to copy it, or download the .bib file.';}
  });
  try{const saved=localStorage.getItem('comet-project-language');if(saved==='en'||saved==='zh')lang=saved;}catch(error){/* Use English by default. */}
  setLanguage(lang);
  if('IntersectionObserver' in window&&!reducedMotion.matches){
    document.documentElement.classList.add('has-motion');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
    }),{threshold:0.08,rootMargin:'0px 0px 25px 0px'});
    $$('.reveal').forEach(element=>observer.observe(element));
  }
})();
