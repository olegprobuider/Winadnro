// Phone-Windows LIGHT — script.js
// Простая, компактная реализация окон, Пуск, Проводник, Корзина, Google-поиск и Блокнот.
// Сохраняет состояние файлов/корзины в localStorage.

const state = {
  files: JSON.parse(localStorage.getItem('pw_files') || 'null') || [
    {id: id(), name: 'photo.jpg', size: '1.2 MB', type: 'image'},
    {id: id(), name: 'notes.txt', size: '2 KB', type: 'text'},
    {id: id(), name: 'game.apk', size: '8.9 MB', type: 'app'}
  ],
  recycle: JSON.parse(localStorage.getItem('pw_recycle') || '[]'),
  windows: []
};

function saveState(){
  localStorage.setItem('pw_files', JSON.stringify(state.files));
  localStorage.setItem('pw_recycle', JSON.stringify(state.recycle));
}

// Helpers
function id(){ return Math.random().toString(36).slice(2,9); }
function $(s,root=document){return root.querySelector(s)}
function $all(s,root=document){return [...root.querySelectorAll(s)]}

// UI references
const windowsRoot = $('#windows');
const taskbarWindows = $('#taskbarWindows');
const startBtn = $('#startBtn');
const startMenu = $('#startMenu');
const timeEl = $('#time');
const icons = $('#icons');

// Clock
function updateClock(){ const d=new Date(); timeEl.textContent = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
setInterval(updateClock,1000); updateClock();

// Start menu toggle
startBtn.addEventListener('click', ()=> startMenu.classList.toggle('hidden'));

// Open app via desktop icons or start menu
icons.addEventListener('click', e=>{
  const icon = e.target.closest('.icon');
  if(!icon) return;
  const app = icon.dataset.app;
  openApp(app);
});
startMenu.addEventListener('click', e=>{
  const btn = e.target.closest('.start-item');
  if(!btn) return;
  const app = btn.dataset.app;
  const action = btn.dataset.action;
  startMenu.classList.add('hidden');
  if(action==='open' && app) openApp(app);
});
$('#openRecycle').addEventListener('click', ()=>{ startMenu.classList.add('hidden'); openApp('recycle') });
$('#shutdownBtn').addEventListener('click', ()=>{
  // simple shutdown: clear windows + show message
  closeAllWindows();
  const w = createWindow('Выключение', `<div class="empty">Устройство выключено ☾<br><button class="btn" id="wake">Включить</button></div>`);
  windowsRoot.appendChild(w);
  w.querySelector('#wake').addEventListener('click', ()=>{ w.remove(); });
});

// Open application dispatcher
function openApp(app){
  if(app==='explorer') openExplorer();
  if(app==='google') openGoogle();
  if(app==='notepad') openNotepad();
  if(app==='recycle') openRecycle();
  if(app==='settings') openSettings();
}

// Window lifecycle
function createWindow(title, bodyContent){
  const tpl = $('#window-template');
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.title').textContent = title;
  const body = node.querySelector('.window-body');
  if(typeof bodyContent === 'string') body.innerHTML = bodyContent;
  else body.appendChild(bodyContent);
  // controls
  node.querySelector('.close').addEventListener('click', ()=> { node.remove(); renderTaskbar(); });
  node.querySelector('.minimize').addEventListener('click', ()=> { node.style.display = 'none'; renderTaskbar(); });
  // bring to front on pointerdown
  node.addEventListener('pointerdown', ()=>{ bringToFront(node) });
  // draggable titlebar (touch friendly)
  const titlebar = node.querySelector('.window-titlebar');
  titlebar.addEventListener('pointerdown', dragStart);
  node.style.zIndex = 10 + windowsRoot.children.length;
  windowsRoot.appendChild(node);
  node.style.pointerEvents = 'auto';
  renderTaskbar();
  return node;
}
function bringToFront(node){
  const z = 100 + windowsRoot.children.length;
  node.style.zIndex = z;
}
function renderTaskbar(){
  taskbarWindows.innerHTML = '';
  [...windowsRoot.children].forEach((w,i)=>{
    const t = document.createElement('div');
    t.className = 'tb-item';
    t.textContent = w.querySelector('.title').textContent;
    t.addEventListener('click', ()=> {
      w.style.display = w.style.display === 'none' ? '' : (isOnTop(w) ? 'none' : '');
      bringToFront(w);
    });
    taskbarWindows.appendChild(t);
  });
}
function isOnTop(w){ return Number(w.style.zIndex||0) > 500; }
function closeAllWindows(){ [...windowsRoot.children].forEach(n=>n.remove()); renderTaskbar(); }

// Simple drag for window
let dragInfo = null;
function dragStart(e){
  const w = e.currentTarget.closest('.window');
  dragInfo = {w, startX: e.clientX, startY: e.clientY, rect: w.getBoundingClientRect()};
  window.addEventListener('pointermove', dragMove);
  window.addEventListener('pointerup', dragEnd, {once:true});
}
function dragMove(e){
  if(!dragInfo) return;
  const {w, startX, startY, rect} = dragInfo;
  const dx = e.clientX - startX, dy = e.clientY - startY;
  w.style.left = Math.max(6, rect.left + dx) + 'px';
  w.style.top = Math.max(6, rect.top + dy) + 'px';
  w.style.transform = 'none';
}
function dragEnd(){ dragInfo = null; window.removeEventListener('pointermove', dragMove); }

// -- Explorer --
function openExplorer(){
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="controls small">
      <button class="btn" id="newFile">Новый</button>
      <button class="btn" id="toggleMode">Режим: Прост</button>
      <input id="searchFiles" placeholder="Поиск..." style="padding:8px;border-radius:8px;border:1px solid #eee;flex:1" />
    </div>
    <div id="explorerList" class="explorer-list"></div>
  `;
  const win = createWindow('Проводник', container);
  let fullMode = false;
  const list = $('#explorerList', container);
  function render(){
    list.innerHTML = '';
    const files = state.files.filter(f=> f.name.toLowerCase().includes($('#searchFiles', container).value.toLowerCase()));
    if(files.length===0) list.innerHTML = `<div class="empty">Пусто</div>`;
    files.forEach(f=>{
      const el = document.createElement('div');
      el.className = 'explorer-item';
      el.innerHTML = `<div style="font-size:22px">${iconFor(f)}</div>
        <div style="flex:1">
          <div class="name">${f.name}</div>
          ${fullMode ? `<div class="muted small">${f.size} · ${f.type} · id:${f.id}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn" data-id="${f.id}" data-action="open">Открыть</button>
          <button class="btn" style="background:#ff6b6b" data-id="${f.id}" data-action="del">Удалить</button>
        </div>`;
      list.appendChild(el);
    });
  }
  $('#searchFiles', container).addEventListener('input', render);
  $('#newFile', container).addEventListener('click', ()=>{
    const name = prompt('Имя файла', `file_${state.files.length+1}.txt`);
    if(!name) return;
    state.files.push({id:id(),name, size:'1 KB', type:'file'});
    saveState(); render();
  });
  $('#toggleMode', container).addEventListener('click', (e)=>{
    fullMode = !fullMode;
    e.target.textContent = `Режим: ${fullMode? 'Полный' : 'Прост'}`;
    render();
  });
  list.addEventListener('click', e=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const idd = btn.dataset.id;
    const action = btn.dataset.action;
    if(action==='del'){
      const idx = state.files.findIndex(f=>f.id===idd);
      if(idx===-1) return;
      const [f] = state.files.splice(idx,1);
      state.recycle.push(f);
      saveState();
      render();
    } else if(action==='open'){
      alert('Открытие: ' + state.files.find(f=>f.id===idd).name);
    }
  });
  render();
}

// small icon helper
function iconFor(f){
  if(f.type==='image') return '🖼️';
  if(f.type==='text') return '📄';
  if(f.type==='app') return '📦';
  return '📁';
}

// -- Google (simple) --
function openGoogle(){
  const node = document.createElement('div');
  node.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input id="gQuery" placeholder="Поиск в Google..." style="flex:1;padding:10px;border-radius:10px;border:1px solid #eee" />
      <button class="btn" id="gGo">Искать</button>
    </div>
    <div id="gResults" class="empty">Результаты откроются в новой вкладке (мобильный браузер).</div>
  `;
  const w = createWindow('Google', node);
  $('#gGo', node).addEventListener('click', ()=>{
    const q = encodeURIComponent($('#gQuery', node).value || '');
    if(!q) return alert('Введи запрос');
    window.open('https://www.google.com/search?q='+q, '_blank');
  });
}

// -- Notepad --
function openNotepad(){
  const node = document.createElement('div');
  node.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button class="btn" id="saveNote">Сохранить в файл</button>
      <button class="btn" id="clearNote" style="background:#ccc;color:#222">Очистить</button>
    </div>
    <textarea id="noteArea" style="width:100%;height:60%;border-radius:8px;padding:10px;border:1px solid #eee" placeholder="Набери текст..."></textarea>
  `;
  const w = createWindow('Блокнот', node);
  $('#saveNote', node).addEventListener('click', ()=>{
    const text = $('#noteArea', node).value;
    const name = prompt('Имя файла для сохранения', `note_${Date.now()}.txt`);
    if(!name) return;
    state.files.push({id:id(), name, size: (text.length/1024).toFixed(2) + ' KB', type:'text'});
    saveState();
    alert('Сохранено')
  });
  $('#clearNote', node).addEventListener('click', ()=> $('#noteArea', node).value = '');
}

// -- Recycle bin --
function openRecycle(){
  const node = document.createElement('div');
  node.innerHTML = `
    <div class="controls small">
      <button class="btn" id="restoreAll">Восстановить все</button>
      <button class="btn" id="deleteAll" style="background:#ff6b6b">Удалить навсегда</button>
    </div>
    <div id="recycleList" class="explorer-list"></div>
  `;
  const w = createWindow('Корзина', node);
  const list = $('#recycleList', node);
  function render(){
    list.innerHTML = '';
    if(state.recycle.length===0){ list.innerHTML = `<div class="empty">Корзина пуста</div>`; return; }
    state.recycle.forEach(f=>{
      const el = document.createElement('div');
      el.className = 'explorer-item';
      el.innerHTML = `<div style="font-size:22px">🗑️</div>
        <div style="flex:1">
          <div class="name">${f.name}</div>
          <div class="muted small">${f.size} · ${f.type}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn" data-id="${f.id}" data-action="restore">Восстановить</button>
          <button class="btn" style="background:#ff6b6b" data-id="${f.id}" data-action="del">Удалить</button>
        </div>`;
      list.appendChild(el);
    });
  }
  list.addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const idd = btn.dataset.id; const action = btn.dataset.action;
    const idx = state.recycle.findIndex(x=>x.id===idd);
    if(idx===-1) return;
    if(action==='restore'){ state.files.push(state.recycle[idx]); state.recycle.splice(idx,1); saveState(); render(); }
    if(action==='del'){ state.recycle.splice(idx,1); saveState(); render(); }
  });
  $('#restoreAll', node).addEventListener('click', ()=>{ state.files.push(...state.recycle); state.recycle=[]; saveState(); render(); });
  $('#deleteAll', node).addEventListener('click', ()=>{ if(confirm('Удалить всё навсегда?')){ state.recycle=[]; saveState(); render(); }});
  render();
}

// -- Settings (demo) --
function openSettings(){
  const node = document.createElement('div');
  node.innerHTML = `
    <div class="small muted">Настройки LIGHT (демо)</div>
    <div style="margin-top:12px">
      <label class="small">Тема:</label>
      <select id="themeSelect" style="padding:8px;border-radius:8px">
        <option value="light">Light</option>
        <option value="compact">Compact</option>
      </select>
    </div>
    <div style="margin-top:12px">
      <button class="btn" id="clearAll">Сбросить файлы и корзину</button>
    </div>
  `;
  const w = createWindow('Настройки', node);
  $('#themeSelect', node).addEventListener('change', (e)=> {
    if(e.target.value==='compact') document.documentElement.style.setProperty('--round','8px');
    else document.documentElement.style.setProperty('--round','14px');
  });
  $('#clearAll', node).addEventListener('click', ()=> {
    if(confirm('Очистить файлы и корзину?')){ state.files=[]; state.recycle=[]; saveState(); alert('Готово'); }
  });
}

// Initialize: load persisted position and render any persisted UI (none)
(function init(){
  // small: show hint if first time
  if(!localStorage.getItem('pw_seen')) {
    localStorage.setItem('pw_seen','1');
    setTimeout(()=> createWindow('Добро пожаловать', '<div class="empty">Это мини-имитация Windows для телефона.<br>Открой Пуск → Проводник, Google или Блокнот.</div>'), 700);
  }
})();
