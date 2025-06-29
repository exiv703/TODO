const STORAGE_KEY = 'todo2025-tasks-v2';
const THEME_KEY = 'todo2025-theme';
const exampleTasks = [];
let tasks = [];
let currentFilter = 'all';
let currentSort = 'date';
let currentGroup = 'none';
let searchQuery = '';
let filterPriority = '';
let filterDateFrom = '';
let filterDateTo = '';
let filterTags = [];

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
function loadTasks() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    tasks = JSON.parse(data);
  } else {
    tasks = [...exampleTasks];
    saveTasks();
  }
}
function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
function setTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  saveTheme(theme);
  document.getElementById('themeToggle').innerHTML = theme === 'light'
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}
function toggleTheme() {
  const theme = document.body.classList.contains('light') ? 'dark' : 'light';
  setTheme(theme);
}
function renderStats() {
  const all = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = all - completed;
  document.getElementById('statAll').textContent = `All: ${all}`;
  document.getElementById('statActive').textContent = `Active: ${active}`;
  document.getElementById('statCompleted').textContent = `Completed: ${completed}`;
  const percent = all ? Math.round((completed / all) * 100) : 0;
  document.getElementById('progressBar').style.width = percent + '%';
}
function sortTasks(list) {
  if (currentSort === 'date') {
    return [...list].sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
  }
  if (currentSort === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    return [...list].sort((a, b) => order[a.priority] - order[b.priority]);
  }
  if (currentSort === 'alpha') {
    return [...list].sort((a, b) => a.text.localeCompare(b.text));
  }
  return list;
}
function groupTasks(list) {
  if (currentGroup === 'category') {
    const groups = {};
    list.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }
  return { All: list };
}
function applyFilters(list) {
  return list.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      task.text.toLowerCase().includes(q) ||
      (task.description && task.description.toLowerCase().includes(q)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(q)));
    const matchesPriority = !filterPriority || task.priority === filterPriority;
    const matchesDateFrom = !filterDateFrom || (task.deadline && task.deadline >= filterDateFrom);
    const matchesDateTo = !filterDateTo || (task.deadline && task.deadline <= filterDateTo);
    const matchesTags =
      !filterTags.length ||
      (task.tags && filterTags.every(tag => task.tags.includes(tag)));
    return matchesSearch && matchesPriority && matchesDateFrom && matchesDateTo && matchesTags;
  });
}
function renderTasks() {
  const list = document.getElementById('todoList');
  const emptyState = document.getElementById('emptyState');
  list.innerHTML = '';
  let filtered = applyFilters(tasks);
  filtered = sortTasks(filtered);
  const grouped = groupTasks(filtered);
  let hasTasks = false;
  for (const group in grouped) {
    if (currentGroup !== 'none') {
      const groupLabel = document.createElement('li');
      groupLabel.className = 'todo-group-label';
      groupLabel.textContent = group.charAt(0).toUpperCase() + group.slice(1);
      list.appendChild(groupLabel);
    }
    grouped[group].forEach(task => {
      hasTasks = true;
      list.appendChild(renderTaskItem(task));
    });
  }
  emptyState.style.display = hasTasks ? 'none' : 'flex';
  renderStats();
  renderTagList();
  enableDragDrop();
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}
function renderTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (task.completed ? ' completed' : '');
  li.setAttribute('data-id', task.id);
  const row = document.createElement('div');
  row.className = 'todo-main-row';
  const prio = document.createElement('div');
  prio.className = 'todo-priority priority-' + task.priority;
  prio.title = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  const prioDot = document.createElement('span');
  prioDot.className = 'priority-dot';
  prioDot.innerHTML = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🔵' : '🟢';
  const prioLine = document.createElement('span');
  prioLine.className = 'priority-line';
  prio.appendChild(prioDot);
  prio.appendChild(prioLine);
  row.appendChild(prio);
  const checkbox = document.createElement('div');
  checkbox.className = 'todo-checkbox' + (task.completed ? ' checked' : '');
  checkbox.tabIndex = 0;
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-checked', task.completed);
  checkbox.onclick = () => toggleTask(task.id);
  checkbox.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') toggleTask(task.id); };
  row.appendChild(checkbox);
  const text = document.createElement('input');
  text.className = 'todo-text';
  text.value = task.text;
  text.readOnly = false;
  text.placeholder = 'New task';
  text.onblur = () => finishEditTask(task.id, text.value);
  text.onkeydown = e => { if (e.key === 'Enter') text.blur(); };
  row.appendChild(text);
  if (task.deadline) {
    const deadline = document.createElement('span');
    deadline.className = 'todo-deadline' + (isOverdue(task) ? ' overdue' : '');
    deadline.textContent = formatDate(task.deadline);
    row.appendChild(deadline);
  }
  const cat = document.createElement('span');
  cat.className = 'todo-category';
  cat.textContent = task.category;
  row.appendChild(cat);
  if (task.tags && task.tags.length) {
    const tagsEl = document.createElement('span');
    tagsEl.className = 'tag-list';
    task.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;
      tagsEl.appendChild(tagEl);
    });
    row.appendChild(tagsEl);
  }
  const actions = document.createElement('div');
  actions.className = 'todo-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.title = 'Edit';
  editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
  editBtn.onclick = () => { text.readOnly = false; text.focus(); text.select(); };
  actions.appendChild(editBtn);
  const descBtn = document.createElement('button');
  descBtn.className = 'desc-btn';
  descBtn.title = 'Description';
  descBtn.innerHTML = '<i class="fa-solid fa-align-left"></i>';
  descBtn.onclick = () => toggleDesc(task.id);
  actions.appendChild(descBtn);
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.title = 'Delete';
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  delBtn.onclick = () => deleteTask(task.id, li);
  actions.appendChild(delBtn);
  row.appendChild(actions);
  li.appendChild(row);
  const desc = document.createElement('div');
  desc.className = 'todo-desc';
  desc.id = 'desc-' + task.id;
  desc.innerHTML = `<textarea rows="2" placeholder="Add description...">${task.description || ''}</textarea>`;
  desc.querySelector('textarea').onblur = e => updateDesc(task.id, e.target.value);
  li.appendChild(desc);
  const subtasks = document.createElement('div');
  subtasks.className = 'todo-subtasks';
  (task.subtasks || []).forEach(st => {
    const row = document.createElement('div');
    row.className = 'subtask-row';
    const cb = document.createElement('div');
    cb.className = 'subtask-checkbox' + (st.done ? ' checked' : '');
    cb.tabIndex = 0;
    cb.setAttribute('role', 'checkbox');
    cb.setAttribute('aria-checked', st.done);
    cb.onclick = () => toggleSubtask(task.id, st.id);
    cb.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') toggleSubtask(task.id, st.id); };
    row.appendChild(cb);
    const stxt = document.createElement('input');
    stxt.className = 'subtask-text';
    stxt.value = st.text;
    stxt.readOnly = false;
    stxt.placeholder = 'New subtask';
    stxt.onblur = () => updateSubtaskText(task.id, st.id, stxt.value);
    stxt.onkeydown = e => { if (e.key === 'Enter') stxt.blur(); };
    row.appendChild(stxt);
    subtasks.appendChild(row);
  });
  const addSubBtn = document.createElement('button');
  addSubBtn.className = 'add-subtask-btn';
  addSubBtn.innerHTML = 'Subtask';
  addSubBtn.onclick = () => addSubtask(task.id);
  subtasks.appendChild(addSubBtn);
  li.appendChild(subtasks);
  li.style.animation = 'fadeIn 0.5s';
  return li;
}
function addTask() {
  const input = document.getElementById('todoInput');
  const prio = document.getElementById('priorityInput');
  const date = document.getElementById('dateInput');
  const cat = document.getElementById('categoryInput');
  const tags = getTagsFromInput();
  const text = input.value.trim();
  if (!text) {
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 600);
    return;
  }
  const task = {
    id: Date.now(),
    text,
    completed: false,
    priority: prio.value,
    deadline: date.value,
    category: cat.value,
    description: '',
    subtasks: [],
    tags
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
  input.value = '';
  date.value = '';
  prio.value = 'medium';
  cat.value = 'other';
  document.getElementById('tagsInput').value = '';
  input.focus();
  renderTagList();
  afterTaskChange();
}
function toggleTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx].completed = !tasks[idx].completed;
    saveTasks();
    const li = document.querySelector(`li[data-id="${id}"]`);
    if (tasks[idx].completed) {
      li.classList.add('completed');
      li.style.animation = 'fadeOut 0.5s forwards';
      setTimeout(renderTasks, 500);
    } else {
      renderTasks();
    }
    afterTaskChange();
  }
}
function deleteTask(id, li) {
  li.style.animation = 'fadeOut 0.5s forwards';
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }, 500);
  afterTaskChange();
}
function startEditTask(id, input) {
  input.readOnly = false;
  input.focus();
  input.select();
}
function finishEditTask(id, value) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1 && value.trim()) {
    tasks[idx].text = value.trim();
    saveTasks();
    renderTasks();
  }
  afterTaskChange();
}
function toggleDesc(id) {
  const desc = document.getElementById('desc-' + id);
  desc.classList.toggle('open');
}
function updateDesc(id, value) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx].description = value;
    saveTasks();
  }
  afterTaskChange();
}
function addSubtask(taskId) {
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx !== -1) {
    const st = { id: Date.now(), text: 'New subtask', done: false };
    tasks[idx].subtasks.push(st);
    saveTasks();
    renderTasks();
  }
  afterTaskChange();
}
function toggleSubtask(taskId, subId) {
  const t = tasks.find(t => t.id === taskId);
  if (t) {
    const st = t.subtasks.find(s => s.id === subId);
    if (st) {
      st.done = !st.done;
      saveTasks();
      renderTasks();
    }
  }
  afterTaskChange();
}
function updateSubtaskText(taskId, subId, value) {
  const t = tasks.find(t => t.id === taskId);
  if (t) {
    const st = t.subtasks.find(s => s.id === subId);
    if (st && value.trim()) {
      st.text = value.trim();
      saveTasks();
      renderTasks();
    }
  }
  afterTaskChange();
}
function isOverdue(task) {
  if (!task.deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return !task.completed && task.deadline < today;
}
function setFilter(filter) {
  currentFilter = filter;
  renderTasks();
}
function renderTagList() {
  const tagList = document.getElementById('tagList');
  tagList.innerHTML = '';
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || [])));
  allTags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.textContent = tag;
    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-tag';
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = () => removeTagFromAll(tag);
    tagEl.appendChild(removeBtn);
    tagList.appendChild(tagEl);
  });
}
function removeTagFromAll(tag) {
  tasks.forEach(t => {
    if (t.tags) t.tags = t.tags.filter(tg => tg !== tag);
  });
  saveTasks();
  renderTasks();
  renderTagList();
}
if (window.flatpickr) {
  flatpickr('#dateInput', { dateFormat: 'Y-m-d' });
  flatpickr('#filterDate', { dateFormat: 'Y-m-d' });
  flatpickr('#filterDateTo', { dateFormat: 'Y-m-d' });
}
function enableDragDrop() {
  if (window.Sortable) {
    Sortable.create(document.getElementById('todoList'), {
      animation: 150,
      handle: '.todo-main-row',
      onEnd: function (evt) {
        if (evt.oldIndex !== evt.newIndex) {
          const moved = tasks.splice(evt.oldIndex, 1)[0];
          tasks.splice(evt.newIndex, 0, moved);
          saveTasks();
          renderTasks();
        }
      }
    });
  }
}
function setupFilters() {
  document.getElementById('searchInput').oninput = e => {
    searchQuery = e.target.value;
    renderTasks();
  };
  document.getElementById('filterPriority').onchange = e => {
    filterPriority = e.target.value;
    renderTasks();
  };
  document.getElementById('filterDate').onchange = e => {
    filterDateFrom = e.target.value;
    renderTasks();
  };
  document.getElementById('filterDateTo').onchange = e => {
    filterDateTo = e.target.value;
    renderTasks();
  };
  document.getElementById('filterTags').oninput = e => {
    filterTags = e.target.value.split(/[, ]+/).filter(Boolean);
    renderTasks();
  };
}
function getTagsFromInput() {
  const tagsInput = document.getElementById('tagsInput');
  return tagsInput.value.split(/[, ]+/).filter(Boolean);
}
function notify(msg, type = 'info') {
  if (window.Toastify) {
    Toastify({
      text: msg,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      backgroundColor: type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#8e44ad',
      stopOnFocus: true
    }).showToast();
  } else {
    alert(msg);
  }
}
function exportJson() {
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'todo-list.json';
  a.click();
  notify('Exported JSON!', 'success');
}
function importJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          tasks = imported;
          saveTasks();
          renderTasks();
          notify('Imported tasks!', 'success');
        } else {
          notify('Invalid JSON file!', 'error');
        }
      } catch {
        notify('JSON import error!', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
function exportCsv() {
  const header = ['Name','Priority','Due date','Category','Description','Tags','Completed'];
  const rows = tasks.map(t => [
    t.text,
    t.priority,
    t.deadline,
    t.category,
    t.description,
    (t.tags||[]).join(','),
    t.completed ? 'YES' : 'NO'
  ]);
  const csv = [header, ...rows].map(r => r.map(x => '"'+(x||'')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'todo-list.csv';
  a.click();
  notify('Exported CSV!', 'success');
}
if (document.getElementById('exportJsonBtn')) document.getElementById('exportJsonBtn').onclick = exportJson;
if (document.getElementById('importJsonBtn')) document.getElementById('importJsonBtn').onclick = importJson;
if (document.getElementById('exportCsvBtn')) document.getElementById('exportCsvBtn').onclick = exportCsv;
let statsChart;
function renderStatsChart() {
  if (!window.Chart) return;
  const ctx = document.getElementById('statsChart').getContext('2d');
  const done = tasks.filter(t => t.completed).length;
  const active = tasks.length - done;
  const data = {
    labels: ['Completed', 'Active'],
    datasets: [{
      data: [done, active],
      backgroundColor: ['#27ae60', '#8e44ad'],
      borderWidth: 0
    }]
  };
  if (statsChart) statsChart.destroy();
  statsChart = new Chart(ctx, {
    type: 'doughnut',
    data,
    options: {
      cutout: '70%',
      plugins: { legend: { display: true, position: 'bottom' } },
      animation: { animateRotate: true, animateScale: true }
    }
  });
}
function renderBadges() {
  const badges = document.getElementById('badges');
  badges.innerHTML = '';
  const done = tasks.filter(t => t.completed).length;
  if (done >= 10) badges.innerHTML += '<span class="badge">🏅 10+ completed!</span>';
  if (done >= 25) badges.innerHTML += '<span class="badge">🥈 25+ completed!</span>';
  if (done >= 50) badges.innerHTML += '<span class="badge">🥇 50+ completed!</span>';
  if (tasks.length >= 20) badges.innerHTML += '<span class="badge">📈 20+ tasks!</span>';
}
function setBackground(bg) {
  document.body.classList.remove('bg-1','bg-2','bg-3');
  if (bg) document.body.classList.add(bg);
  localStorage.setItem('todo2025-bg', bg);
}
function loadBackground() {
  setBackground(localStorage.getItem('todo2025-bg')||'');
}
document.getElementById('backgroundPicker').onclick = () => {
  const next = { '':'bg-1', 'bg-1':'bg-2', 'bg-2':'bg-3', 'bg-3':'' }[document.body.className.match(/bg-\d/)?.[0]||''] || '';
  setBackground(next);
  notify('Background changed!','success');
};
function copyTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) {
    const copy = JSON.parse(JSON.stringify(t));
    copy.id = Date.now();
    copy.text += ' (Copy)';
    tasks.unshift(copy);
    saveTasks();
    renderTasks();
    notify('Task copied!','success');
  }
  afterTaskChange();
}
function updateProgressBar() {
  const all = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = all ? Math.round((completed / all) * 100) : 0;
  document.getElementById('progressBar').style.width = percent + '%';
}
let history = [];
let historyIndex = -1;
function saveHistory() {
  history = history.slice(0, historyIndex+1);
  history.push(JSON.stringify(tasks));
  historyIndex++;
}
function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    tasks = JSON.parse(history[historyIndex]);
    saveTasks();
    renderTasks();
    notify('Change undone','info');
  }
}
function redo() {
  if (historyIndex < history.length-1) {
    historyIndex++;
    tasks = JSON.parse(history[historyIndex]);
    saveTasks();
    renderTasks();
    notify('Change redone','info');
  }
}
function afterTaskChange() {
  saveTasks();
  renderTasks();
  renderStatsChart();
  renderBadges();
  updateProgressBar();
  saveHistory();
}
function checkDeadlines() {
  const soon = tasks.filter(t => t.deadline && !t.completed && new Date(t.deadline) <= new Date(Date.now() + 2*24*60*60*1000));
  if (soon.length) {
    soon.forEach(t => notify(`Deadline soon: ${t.text} (${t.deadline})`,'error'));
  }
}
setInterval(checkDeadlines, 60*60*1000);
document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  setTheme(loadTheme());
  renderTasks();
  document.getElementById('addTodoBtn').onclick = addTask;
  document.getElementById('todoInput').onkeypress = e => { if (e.key === 'Enter') addTask(); };
  document.getElementById('sortSelect').onchange = e => { currentSort = e.target.value; renderTasks(); };
  document.getElementById('groupSelect').onchange = e => { currentGroup = e.target.value; renderTasks(); };
  document.getElementById('themeToggle').onclick = toggleTheme;
  const filters = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' }
  ];
  const controls = document.querySelector('.todo-controls');
  const filterGroup = document.createElement('div');
  filterGroup.className = 'filter-group';
  filters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (currentFilter === f.value ? ' active' : '');
    btn.textContent = f.label;
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setFilter(f.value);
    };
    filterGroup.appendChild(btn);
  });
  controls.appendChild(filterGroup);
  setupFilters();
  renderTagList();
  enableDragDrop();
  loadBackground();
  renderStatsChart();
  renderBadges();
  updateProgressBar();
  saveHistory();
  checkDeadlines();
});