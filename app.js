(() => {
  const { words, total } = VocabularyData;
  const M = VocabularyModel;
  const validIds = new Set(words.map(word => word.id));
  const gradeMeta = {
    1:{name:'红岩起点',color:'#ef6457'}, 2:{name:'紫谷回声',color:'#7c5bb6'}, 3:{name:'绿林密径',color:'#23875a'},
    4:{name:'橙峰远眺',color:'#db762f'}, 5:{name:'蓝海终章',color:'#173fb2'}
  };
  const colorLabels = { gray:'灰色', red:'红色', yellow:'黄色', green:'绿色' };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const deepClone = value => JSON.parse(JSON.stringify(value));
  const byId = id => words.find(word => word.id === id);
  const fmt = number => new Intl.NumberFormat('zh-CN').format(number);
  const today = () => M.localISO();

  function loadState() {
    try {
      return M.normalizeState(JSON.parse(localStorage.getItem(M.STORAGE_KEY) || 'null'), validIds);
    } catch {
      return M.createState();
    }
  }
  let state = loadState();
  let activeSession = null;

  function saveState() {
    localStorage.setItem(M.STORAGE_KEY, JSON.stringify(state));
  }

  function toast(message) {
    const element = document.querySelector('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 2300);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [year, month, day] = iso.split('-');
    return `${Number(month)}月${Number(day)}日`;
  }

  function statusInfo(word, referenceDate = today()) {
    const item = M.stateFor(state, word.id);
    if (item.color === 'gray') return { label:'等待筛查', className:'' };
    if (item.stable) return { label:'稳定掌握', className:'stable' };
    if (item.dueDate && item.dueDate <= referenceDate) return { label:`已到期 · ${formatDate(item.dueDate)}`, className:'due' };
    if (item.color === 'green') return { label:`绿色巩固 ${item.greenStage}/3 · ${formatDate(item.dueDate)}`, className:'' };
    return { label:`${formatDate(item.dueDate)}复习`, className:'' };
  }

  function renderDashboard() {
    const stats = M.stats(words, state, today());
    document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
    document.querySelector('#statDue').textContent = fmt(stats.due);
    document.querySelector('#statGray').textContent = fmt(stats.gray);
    document.querySelector('#statGreen').textContent = fmt(stats.green);
    document.querySelector('#statStable').textContent = fmt(stats.stable);
    document.querySelector('#statXp').textContent = fmt(stats.xp);
    document.querySelector('#heroStreak').textContent = stats.streak;
    document.querySelector('#reviewButtonCount').textContent = Math.min(stats.due, state.settings.dailyReviewLimit);
    document.querySelector('#screenButtonCount').textContent = Math.min(stats.gray, state.settings.screeningTarget);
    const greenPercent = Math.round(stats.green / total * 100);
    const stablePercent = Math.round(stats.stable / total * 100);
    document.querySelector('#greenPercent').textContent = `${greenPercent}%`;
    document.querySelector('#stablePercent').textContent = `${stablePercent}%`;
    document.querySelector('#greenBar').style.width = `${greenPercent}%`;
    document.querySelector('#stableBar').style.width = `${stablePercent}%`;
    const missionTitle = document.querySelector('#missionTitle');
    const missionCopy = document.querySelector('#missionCopy');
    if (stats.due) {
      missionTitle.textContent = `清理${Math.min(stats.due, state.settings.dailyReviewLimit)}个到期词`;
      missionCopy.textContent = stats.due > state.settings.dailyReviewLimit ? `还有${stats.due - state.settings.dailyReviewLimit}个会自动留到下一队，不需要加量。` : '完成今天这一小队，就可以安心收工。';
    } else if (stats.gray) {
      missionTitle.textContent = `侦察${Math.min(stats.gray, state.settings.screeningTarget)}个新词`;
      missionCopy.textContent = '只判断认识度，遇到红词也不停下来精讲。';
    } else if (stats.stable < total) {
      missionTitle.textContent = '今日没有到期任务';
      missionCopy.textContent = '记忆正在加固，等下一批词按约定日期回来。';
    } else {
      missionTitle.textContent = '五域全部通关！';
      missionCopy.textContent = '872个词目都已通过长期检查。';
    }
    renderRealms();
  }

  function renderRealms() {
    document.querySelector('#realmMap').innerHTML = [1,2,3,4,5].map(grade => {
      const gradeWords = words.filter(word => word.grade === grade);
      const units = [...new Set(gradeWords.map(word => word.unit))];
      const green = gradeWords.filter(word => M.stateFor(state, word.id).color === 'green').length;
      const stable = gradeWords.filter(word => M.stateFor(state, word.id).stable).length;
      const nodes = units.map(unit => {
        const unitWords = gradeWords.filter(word => word.unit === unit);
        const allGreen = unitWords.every(word => M.stateFor(state, word.id).color === 'green');
        const allStable = unitWords.every(word => M.stateFor(state, word.id).stable);
        const className = allStable ? 'stable' : allGreen ? 'green' : '';
        const complete = unitWords.filter(word => M.stateFor(state, word.id).color === 'green').length;
        return `<span class="unit-node ${className}" title="G${grade} Unit ${unit}：${complete}/${unitWords.length}绿色">${unit}</span>`;
      }).join('');
      return `<article class="realm" style="--realm-color:${gradeMeta[grade].color}">
        <div class="realm-top"><span class="realm-grade">G${grade}</span><span class="realm-badge">${stable === gradeWords.length ? '🧰' : green === gradeWords.length ? '⚑' : '⌁'}</span></div>
        <p>${gradeMeta[grade].name} · ${gradeWords.length}词</p><div class="unit-path">${nodes}</div>
        <div class="realm-footer"><span>${green}/${gradeWords.length} 绿色</span><button data-open-grade="${grade}">查看词库 →</button></div>
      </article>`;
    }).join('');
  }

  function navigate(view) {
    document.querySelectorAll('.view').forEach(item => item.classList.toggle('active', item.id === `view-${view}`));
    document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('active', item.dataset.nav === view));
    if (view === 'library') renderLibrary();
    if (view === 'history') renderHistory();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function setupFilters() {
    document.querySelector('#filterGrade').innerHTML += [1,2,3,4,5].map(grade => `<option value="${grade}">G${grade}</option>`).join('');
    updateUnitOptions();
  }

  function updateUnitOptions() {
    const grade = Number(document.querySelector('#filterGrade').value || 0);
    const unitSelect = document.querySelector('#filterUnit');
    const oldValue = unitSelect.value;
    const max = grade ? Math.max(...words.filter(word => word.grade === grade).map(word => word.unit)) : 18;
    unitSelect.innerHTML = '<option value="">全部</option>' + Array.from({length:max},(_,i) => `<option value="${i+1}">Unit ${i+1}</option>`).join('');
    if (Number(oldValue) <= max) unitSelect.value = oldValue;
  }

  function filteredWords() {
    const search = document.querySelector('#filterSearch').value.trim().toLowerCase();
    const grade = Number(document.querySelector('#filterGrade').value || 0);
    const unit = Number(document.querySelector('#filterUnit').value || 0);
    const color = document.querySelector('#filterColor').value;
    const status = document.querySelector('#filterStatus').value;
    return words.filter(word => {
      const item = M.stateFor(state, word.id);
      return (!search || word.word.includes(search)) && (!grade || word.grade === grade) && (!unit || word.unit === unit) &&
        (!color || item.color === color) && (!status || (status === 'due' && item.dueDate && item.dueDate <= today() && !item.stable) || (status === 'stable' && item.stable) || (status === 'learning' && item.color === 'green' && !item.stable));
    });
  }

  function renderLibrary() {
    const matches = filteredWords();
    const spellingCounts = words.reduce((map, word) => map.set(word.word, (map.get(word.word) || 0) + 1), new Map());
    document.querySelector('#libraryCount').textContent = `${fmt(matches.length)}条`;
    document.querySelector('#libraryHint').textContent = matches.length === words.length ? '按年级与Unit排列' : `已从${total}条中筛选`;
    document.querySelector('#wordTable').innerHTML = matches.length ? matches.map(word => {
      const item = M.stateFor(state, word.id);
      const status = statusInfo(word);
      const duplicate = spellingCounts.get(word.word) > 1 ? `<span class="duplicate-tag">跨级重复×${spellingCounts.get(word.word)}</span>` : '';
      return `<tr data-word-id="${word.id}"><td><span class="word-name">${esc(word.word)}</span>${duplicate}</td><td><span class="position-text">G${word.grade} · Unit ${word.unit} · 首见p.${word.sourcePage}</span></td>
        <td><select class="color-select" data-color-word="${word.id}" aria-label="修改${esc(word.word)}颜色"><option value="gray" ${item.color==='gray'?'selected':''}>灰 · 未筛查</option><option value="red" ${item.color==='red'?'selected':''}>红 · 不会</option><option value="yellow" ${item.color==='yellow'?'selected':''}>黄 · 模糊</option><option value="green" ${item.color==='green'?'selected':''}>绿 · 会了</option></select></td>
        <td><span class="status-pill ${status.className}">${status.label}</span></td><td class="no-print"><div class="row-actions"><button class="mini-btn" data-speak="${word.id}">🔊</button><button class="mini-btn" data-edit="${word.id}">编辑</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="5"><div class="empty-state">没有符合条件的词，换个筛选条件试试。</div></td></tr>';
  }

  function speak(word) {
    if (!('speechSynthesis' in window)) return toast('当前浏览器不支持朗读，但不影响学习记录');
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US'; utterance.rate = .82;
    speechSynthesis.speak(utterance);
  }

  function renderDefinitions(panel, definitions) {
    panel.innerHTML = definitions.map(item => `<div class="definition-entry"><b>${esc(item.partOfSpeech || 'meaning')}</b><span>${esc(item.definition)}</span></div>`).join('');
    panel.hidden = false;
  }

  async function showEnglishDefinition() {
    const word = currentSessionWord();
    if (!word) return;
    const panel = document.querySelector('#definitionPanel');
    const button = document.querySelector('#showDefinition');
    const cached = M.stateFor(state, word.id).definitions || [];
    if (cached.length) {
      if (!panel.hidden) {
        panel.hidden = true;
        button.textContent = '查看英文释义 · 已保存';
      } else {
        renderDefinitions(panel, cached);
        button.textContent = '收起英文释义 · 已保存';
      }
      return;
    }
    panel.hidden = false;
    panel.textContent = '正在查找简明英文释义…';
    button.disabled = true;
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.word)}`);
      if (!response.ok) throw new Error('not found');
      const payload = await response.json();
      const definitions = [];
      (payload[0]?.meanings || []).forEach(meaning => {
        const first = (meaning.definitions || []).find(item => item.definition);
        if (first && definitions.length < 3 && !definitions.some(item => item.definition === first.definition)) {
          definitions.push({ partOfSpeech: meaning.partOfSpeech || '', definition: first.definition });
        }
      });
      if (!definitions.length) throw new Error('not found');
      if (currentSessionWord()?.id !== word.id) return;
      state = M.updateDetails(state, word.id, { definitions });
      saveState();
      renderDefinitions(panel, definitions);
      button.textContent = '收起英文释义 · 已保存';
    } catch {
      panel.innerHTML = '<span class="definition-error">暂时无法取得释义，请检查网络后重试。</span>';
    } finally {
      button.disabled = false;
    }
  }

  function startSession(type) {
    const queue = type === 'screening' ? M.screeningQueue(words, state) : M.reviewQueue(words, state, today());
    if (!queue.length) return toast(type === 'screening' ? '所有词都已完成首轮筛查' : '今天没有到期词，记忆正在安静加固');
    activeSession = { type, queue, index:0, undo:[], startHistoryLength:state.reviewHistory.length, ratings:{red:0,yellow:0,green:0}, skipped:0 };
    document.querySelector('#sessionDialog').showModal();
    renderSession();
  }

  function currentSessionWord() { return activeSession?.queue[activeSession.index]; }
  function renderSession() {
    const word = currentSessionWord();
    if (!word) return finishSession();
    const item = M.stateFor(state, word.id);
    document.querySelector('#sessionKind').textContent = activeSession.type === 'screening' ? '首轮快速筛查' : '今日到期复习';
    document.querySelector('#sessionProgress').textContent = `${activeSession.index + 1} / ${activeSession.queue.length}`;
    document.querySelector('#sessionBar').style.width = `${activeSession.index / activeSession.queue.length * 100}%`;
    document.querySelector('#wordMeta').textContent = `G${word.grade} · Unit ${word.unit} · 首见 p.${word.sourcePage}`;
    document.querySelector('#sessionWord').textContent = word.word;
    document.querySelector('#definitionPanel').hidden = true;
    document.querySelector('#definitionPanel').innerHTML = '';
    document.querySelector('#showDefinition').disabled = false;
    document.querySelector('#showDefinition').textContent = item.definitions?.length ? '查看英文释义 · 已保存' : '查看英文释义';
    document.querySelector('#sessionBack').disabled = !activeSession.undo.length;
    document.querySelector('#greenNextLabel').textContent = item.color === 'green' && item.greenStage === 1 ? '14天后确认' : item.color === 'green' && item.greenStage === 2 ? '30天后确认' : item.color === 'green' && item.greenStage >= 3 ? '通过即稳定' : '7天后确认';
    const backlog = activeSession.type === 'review' ? Math.max(0, M.allDue(words, state, today()).length - activeSession.queue.length) : 0;
    document.querySelector('#backlogNote').textContent = backlog ? `另有${backlog}词自动留到下一队` : '每次选择都会自动保存';
  }

  function rateCurrent(color) {
    const word = currentSessionWord();
    if (!word) return;
    const stateBefore = deepClone(state);
    state = M.applyRating(state, word.id, color, today(), activeSession.type);
    saveState();
    activeSession.undo.push({ stateBefore, color });
    activeSession.ratings[color] += 1;
    activeSession.index += 1;
    renderSession();
  }

  function undoSession() {
    const action = activeSession?.undo.pop();
    if (!action) return;
    state = action.stateBefore;
    activeSession.ratings[action.color] = Math.max(0, activeSession.ratings[action.color] - 1);
    activeSession.index = Math.max(0, activeSession.index - 1);
    saveState(); renderSession(); renderAll();
  }

  function skipCurrent() {
    if (!activeSession) return;
    activeSession.skipped += 1;
    activeSession.index += 1;
    renderSession();
  }

  function finishSession() {
    const session = activeSession;
    if (!session) return;
    activeSession = null;
    document.querySelector('#sessionDialog').close();
    const reviewed = session.ratings.red + session.ratings.yellow + session.ratings.green;
    document.querySelector('#reportTitle').textContent = session.type === 'screening' ? '侦察任务完成' : '今日复习完成';
    document.querySelector('#reportCopy').textContent = reviewed ? `完成${reviewed}次诚实判断，获得${(state.reviewHistory.length - session.startHistoryLength) * 2}点基础经验。颜色不是分数，而是下一步路线。` : '这次没有留下判断，随时可以重新出发。';
    document.querySelector('#reportCounts').innerHTML = `<span>红 ${session.ratings.red}</span><span>黄 ${session.ratings.yellow}</span><span>绿 ${session.ratings.green}</span>${session.skipped?`<span>跳过 ${session.skipped}</span>`:''}`;
    document.querySelector('#reportDialog').showModal();
    renderAll();
  }

  function openEdit(wordId) {
    const word = byId(wordId); if (!word) return;
    const item = M.stateFor(state, wordId);
    const form = document.querySelector('#editForm');
    form.elements.wordId.value = wordId;
    form.elements.color.value = item.color;
    form.elements.dueDate.value = item.dueDate || '';
    document.querySelector('#editWord').textContent = word.word;
    document.querySelector('#editMeta').textContent = `G${word.grade} · Unit ${word.unit} · 首见 p.${word.sourcePage}`;
    const history = state.reviewHistory.filter(entry => entry.wordId === wordId).slice(-10).reverse();
    document.querySelector('#wordHistory').innerHTML = history.length ? '<b>最近记录</b>' + history.map(entry => `<div>${esc(entry.reviewedAt.slice(0,10))}：${colorLabels[entry.previousColor]} → ${colorLabels[entry.newColor]}${entry.becameStable?' · 稳定掌握':''}</div>`).join('') : '还没有颜色变化记录。';
    document.querySelector('#editDialog').showModal();
  }

  function renderHistory() {
    const stats = M.stats(words, state, today());
    document.querySelector('#archiveXp').textContent = fmt(stats.xp);
    document.querySelector('#archiveDays').textContent = M.studyDates(state).length;
    document.querySelector('#archiveReviews').textContent = fmt(state.reviewHistory.length);
    document.querySelector('#archiveStable').textContent = fmt(stats.stable);
    const bars = [
      ['灰色',stats.gray,'#b7b7b7'],['红色',stats.red,'#e7574f'],['黄色',stats.yellow,'#efc94c'],['绿色',stats.green,'#53aa78'],['稳定',stats.stable,'#173fb2']
    ];
    document.querySelector('#distributionBars').innerHTML = bars.map(([label,count,color]) => `<div class="dist-row"><span>${label}</span><div class="dist-track"><i style="width:${count/total*100}%;background:${color}"></i></div><b>${count}</b></div>`).join('');
    const daily = state.reviewHistory.reduce((map, entry) => {
      const date = entry.reviewedAt.slice(0,10); const item = map.get(date) || {total:0,green:0,stable:0};
      item.total += 1; if (entry.newColor === 'green') item.green += 1; if (entry.becameStable) item.stable += 1; map.set(date,item); return map;
    }, new Map());
    const dailyRows = [...daily.entries()].sort((a,b) => b[0].localeCompare(a[0])).slice(0,30);
    document.querySelector('#dailyLog').innerHTML = dailyRows.length ? dailyRows.map(([date,item]) => `<div class="day-log"><b>${item.total}</b><span>${date.slice(5).replace('-','/')}</span><span>绿${item.green}${item.stable?` · 稳${item.stable}`:''}</span></div>`).join('') : '<div class="empty-state">完成第一次筛查后，每日战报会出现在这里。</div>';
    const recent = state.reviewHistory.slice(-100).reverse();
    document.querySelector('#historyList').innerHTML = recent.length ? recent.map(entry => {
      const word = byId(entry.wordId); if (!word) return '';
      return `<article class="history-item"><time>${entry.reviewedAt.slice(0,10)}</time><div><b>${esc(word.word)}</b><small>G${word.grade} · Unit ${word.unit} · ${entry.source==='screening'?'首轮筛查':entry.source==='manual'?'词库修改':'到期复习'}</small></div><div class="color-arrow"><span class="color-chip ${entry.previousColor}">${colorLabels[entry.previousColor]}</span>→<span class="color-chip ${entry.newColor}">${colorLabels[entry.newColor]}</span>${entry.becameStable?' ★':''}</div></article>`;
    }).join('') : '<div class="empty-state">航行日志还是空的。第一次颜色判断后就会自动记录。</div>';
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function csvExport() {
    const header = ['word','grade','unit','sourcePage','color','greenStage','dueDate','stable','englishDefinitions'];
    const quote = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
    const rows = filteredWords().map(word => { const item = M.stateFor(state,word.id); const definitions = (item.definitions || []).map(entry => `${entry.partOfSpeech}: ${entry.definition}`).join(' | '); return [word.word,word.grade,word.unit,word.sourcePage,item.color,item.greenStage,item.dueDate||'',item.stable,definitions].map(quote).join(','); });
    download(`Jayden-G1-G5-word-list-${today()}.csv`, '\ufeff' + [header.join(','),...rows].join('\r\n'), 'text/csv;charset=utf-8');
  }

  function renderAll() { renderDashboard(); if (document.querySelector('#view-library').classList.contains('active')) renderLibrary(); if (document.querySelector('#view-history').classList.contains('active')) renderHistory(); }

  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); navigate(button.dataset.nav); }));
  document.querySelector('#realmMap').addEventListener('click', event => { const button = event.target.closest('[data-open-grade]'); if (!button) return; document.querySelector('#filterGrade').value = button.dataset.openGrade; updateUnitOptions(); navigate('library'); });
  document.querySelector('#startReview').addEventListener('click', () => startSession('review'));
  document.querySelector('#startScreening').addEventListener('click', () => startSession('screening'));
  document.querySelectorAll('[data-rate]').forEach(button => button.addEventListener('click', () => rateCurrent(button.dataset.rate)));
  document.querySelector('#showDefinition').addEventListener('click', showEnglishDefinition);
  document.querySelector('#speakWord').addEventListener('click', () => { const word = currentSessionWord(); if (word) speak(word.word); });
  document.querySelector('#pauseSession').addEventListener('click', () => { activeSession = null; document.querySelector('#sessionDialog').close(); renderAll(); toast('进度已保存，下次从未筛查或到期词继续'); });
  document.querySelector('#sessionBack').addEventListener('click', undoSession);
  document.querySelector('#skipWord').addEventListener('click', skipCurrent);
  document.querySelector('#closeReport').addEventListener('click', () => document.querySelector('#reportDialog').close());
  document.addEventListener('keydown', event => { if (!activeSession || ['TEXTAREA','INPUT','SELECT'].includes(document.activeElement.tagName)) return; if (['1','2','3'].includes(event.key)) rateCurrent({1:'red',2:'yellow',3:'green'}[event.key]); });

  ['filterSearch','filterUnit','filterColor','filterStatus'].forEach(id => document.querySelector(`#${id}`).addEventListener(id==='filterSearch'?'input':'change', renderLibrary));
  document.querySelector('#filterGrade').addEventListener('change', () => { updateUnitOptions(); renderLibrary(); });
  document.querySelector('#clearFilters').addEventListener('click', () => { ['filterSearch','filterGrade','filterUnit','filterColor','filterStatus'].forEach(id => document.querySelector(`#${id}`).value=''); updateUnitOptions(); renderLibrary(); });
  document.querySelector('#wordTable').addEventListener('change', event => { const select = event.target.closest('[data-color-word]'); if (!select) return; const current = M.stateFor(state,select.dataset.colorWord); if (current.color !== select.value) { state = M.applyRating(state,select.dataset.colorWord,select.value,today(),'manual'); saveState(); renderAll(); toast('颜色已更新，复习日期已重新计算'); } });
  document.querySelector('#wordTable').addEventListener('click', event => { const speech = event.target.closest('[data-speak]'); const edit = event.target.closest('[data-edit]'); if (speech) speak(byId(speech.dataset.speak).word); if (edit) openEdit(edit.dataset.edit); });
  document.querySelector('#exportCsv').addEventListener('click', csvExport);
  document.querySelector('#printLibrary').addEventListener('click', () => window.print());

  document.querySelector('#closeEdit').addEventListener('click', () => document.querySelector('#editDialog').close());
  document.querySelector('#editSpeak').addEventListener('click', () => speak(document.querySelector('#editWord').textContent));
  document.querySelector('#editForm').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget; const id = form.elements.wordId.value; const current = M.stateFor(state,id); const color = form.elements.color.value;
    if (color !== current.color) state = M.applyRating(state,id,color,today(),'manual');
    state = M.updateDetails(state,id,{dueDate:form.elements.dueDate.value});
    saveState(); document.querySelector('#editDialog').close(); renderAll(); toast('单词资料与复习安排已保存');
  });

  const settingsDialog = document.querySelector('#settingsDialog');
  document.querySelector('#openSettings').addEventListener('click', () => { const form=document.querySelector('#settingsForm'); form.elements.screeningTarget.value=state.settings.screeningTarget; form.elements.dailyReviewLimit.value=state.settings.dailyReviewLimit; settingsDialog.showModal(); });
  document.querySelector('#closeSettings').addEventListener('click', () => settingsDialog.close());
  document.querySelector('#settingsForm').addEventListener('submit', event => { event.preventDefault(); state.settings.screeningTarget=Math.max(1,Math.min(200,Number(event.currentTarget.elements.screeningTarget.value)||60)); state.settings.dailyReviewLimit=Math.max(1,Math.min(100,Number(event.currentTarget.elements.dailyReviewLimit.value)||25)); saveState(); settingsDialog.close(); renderAll(); toast('远征设置已保存'); });
  document.querySelector('#exportJson').addEventListener('click', () => download(`Jayden-vocabulary-backup-${today()}.json`,JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json'));
  document.querySelector('#importJson').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const raw = JSON.parse(await file.text()); if (Number(raw.schemaVersion) !== M.SCHEMA_VERSION) throw new Error('版本不兼容');
      const keys = Object.keys(raw.wordStates || {}); const valid = keys.filter(id => validIds.has(id)).length; const ignored = keys.length-valid;
      if (!confirm(`备份中有${valid}条有效词目状态，${ignored}条无法匹配。确定替换当前全部学习记录吗？`)) return;
      state=M.normalizeState(raw,validIds); saveState(); settingsDialog.close(); renderAll(); toast('备份导入成功');
    } catch (error) { alert(`无法导入：${error.message}`); }
    finally { event.target.value=''; }
  });
  document.querySelector('#resetData').addEventListener('click', () => { if (!confirm('第一次确认：这会清空所有颜色、英文释义缓存和复习历史。继续吗？')) return; if (!confirm('第二次确认：请先确保已经导出需要保留的JSON备份。确定重新开始？')) return; state=M.createState(); saveState(); settingsDialog.close(); renderAll(); toast('已建立一张全新的词汇地图'); });

  setupFilters(); saveState(); renderAll();
})();
