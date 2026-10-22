const UNCAT = '__none__';
const PASTELS = ['#ffe58a', '#bcd8ff', '#ffd2a1', '#cfeab1', '#ffc9d4', '#d9ccff'];

const $ = (id) => document.getElementById(id);

const screen = $('screen');
const list = $('recipe-list');
const tiles = $('tiles');
const searchInput = $('search');
const countLabel = $('count');
const form = $('recipe-form');
const formTitle = $('form-title');
const submitBtn = $('submit-btn');
const categoryList = $('category-list');
const importFile = $('import-file');

const sheets = {
  form: $('form-sheet'),
  detail: $('detail-sheet'),
  more: $('more-sheet')
};

function loadRecipes() {
  try {
    const data = JSON.parse(localStorage.getItem('recipes'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

let recipes = loadRecipes();
let editingIndex = null;
let currentIndex = null;
let view = 'collections';
let activeCategory = null;
let fromTile = false;
let sortMode = 'recent';

function save() {
  localStorage.setItem('recipes', JSON.stringify(recipes));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/"/g, '&quot;');
}

function pastel(text) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PASTELS[h % PASTELS.length];
}

/* ---------- Janelas ---------- */

function lockScroll() {
  const open = Object.values(sheets).some((s) => !s.classList.contains('hidden'));
  document.body.classList.toggle('no-scroll', open);
}

function openSheet(name) {
  sheets[name].classList.remove('hidden');
  lockScroll();
}

function closeSheet(name) {
  sheets[name].classList.add('hidden');
  lockScroll();
}

Object.entries(sheets).forEach(([name, el]) => {
  el.addEventListener('click', (e) => {
    if (e.target !== el) return;
    if (name === 'form') cancelForm();
    else closeSheet(name);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  cancelForm();
  closeSheet('detail');
  closeSheet('more');
});

$('detail-close').addEventListener('click', () => closeSheet('detail'));
$('more-close').addEventListener('click', () => closeSheet('more'));

/* ---------- Coleções ---------- */

function getCategories() {
  const set = new Set();
  recipes.forEach((r) => { if (r.category) set.add(r.category); });
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function renderCategoryList() {
  categoryList.innerHTML = '';
  getCategories().forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    categoryList.appendChild(option);
  });
}

function cellHtml(r) {
  if (!r) return '<div class="cell blank"></div>';
  return `<div class="cell" style="background:${pastel(r.name)}"><span>🍽️</span>${
    r.image ? `<img src="${escapeHtml(r.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''
  }</div>`;
}

function emptyHtml() {
  return `
    <div class="empty">
      <span class="big">🍳</span>
      <p>Nenhuma receita ainda.<br>Toque no + para cadastrar a primeira!</p>
      <button type="button" class="btn btn-primary empty-add">+ Nova receita</button>
    </div>
  `;
}

function renderCollections() {
  tiles.innerHTML = '';

  if (recipes.length === 0) {
    tiles.innerHTML = emptyHtml();
    return;
  }

  const cats = getCategories();
  const groups = [{ key: null, label: 'Todas as receitas', items: recipes }];

  cats.forEach((cat) => {
    groups.push({ key: cat, label: cat, items: recipes.filter((r) => r.category === cat) });
  });

  const uncat = recipes.filter((r) => !r.category);
  if (cats.length && uncat.length) {
    groups.push({ key: UNCAT, label: 'Sem coleção', items: uncat });
  }

  groups.forEach((g) => {
    const latest = g.items.slice().reverse().slice(0, 4);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    if (g.key === null) tile.dataset.all = '1';
    else tile.dataset.key = g.key;
    tile.innerHTML = `
      <div class="mosaic">${[0, 1, 2, 3].map((i) => cellHtml(latest[i])).join('')}</div>
      <div class="tile-name">${escapeHtml(g.label)}</div>
      <div class="tile-count">${g.items.length === 1 ? '1 receita' : g.items.length + ' receitas'}</div>
    `;
    tiles.appendChild(tile);
  });
}

/* ---------- Lista de receitas ---------- */

function matchesSearch(recipe, term) {
  if (!term) return true;
  const text = (recipe.name + ' ' + recipe.ingredients.join(' ') + ' ' + (recipe.category || '')).toLowerCase();
  return text.includes(term);
}

function matchesCategory(recipe) {
  if (activeCategory === null) return true;
  if (activeCategory === UNCAT) return !recipe.category;
  return recipe.category === activeCategory;
}

function renderRecipes() {
  list.innerHTML = '';

  if (recipes.length === 0) {
    countLabel.textContent = '';
    list.innerHTML = emptyHtml();
    return;
  }

  const term = searchInput.value.trim().toLowerCase();

  const items = recipes
    .map((recipe, index) => ({ recipe, index }))
    .filter(({ recipe }) => matchesCategory(recipe) && matchesSearch(recipe, term));

  if (sortMode === 'az') {
    items.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name, 'pt-BR'));
  } else {
    items.sort((a, b) => b.index - a.index);
  }

  countLabel.textContent = items.length === 1 ? '1 receita' : `${items.length} receitas`;

  if (items.length === 0) {
    list.innerHTML = '<div class="empty"><span class="big">🔎</span><p>Nenhuma receita encontrada.</p></div>';
    return;
  }

  items.forEach(({ recipe, index }) => {
    const card = document.createElement('article');
    card.className = 'rcard';
    card.dataset.index = index;
    card.innerHTML = `
      <div class="rimg" style="background:${pastel(recipe.name)}">
        <span>🍽️</span>
        ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <h3>${escapeHtml(recipe.name)}</h3>
      <p>${recipe.ingredients.length} ingredientes${recipe.category ? ' · ' + escapeHtml(recipe.category) : ''}</p>
    `;
    list.appendChild(card);
  });
}

/* ---------- Tela principal ---------- */

function renderAppbar() {
  let title = 'Coleções';
  if (view === 'recipes') {
    if (activeCategory === null) title = 'Todas as receitas';
    else if (activeCategory === UNCAT) title = 'Sem coleção';
    else title = activeCategory;
  }

  $('screen-title').textContent = title;
  $('back-btn').hidden = !(view === 'recipes' && fromTile);
  $('sort-btn').hidden = view !== 'recipes';
  $('sort-btn').textContent = sortMode === 'az' ? '⇅ A–Z' : '⇅ Recentes';
}

function render() {
  // Se a coleção aberta deixou de existir, volta para "todas"
  if (typeof activeCategory === 'string') {
    const exists = activeCategory === UNCAT
      ? recipes.some((r) => !r.category)
      : getCategories().includes(activeCategory);
    if (!exists) activeCategory = null;
  }

  renderAppbar();

  document.querySelectorAll('.tab[data-tab]').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === view);
  });

  $('view-collections').hidden = view !== 'collections';
  $('view-recipes').hidden = view !== 'recipes';

  renderCategoryList();

  if (view === 'collections') renderCollections();
  else renderRecipes();
}

screen.addEventListener('click', (e) => {
  if (e.target.closest('.empty-add')) {
    openNewForm();
    return;
  }

  const tile = e.target.closest('.tile');
  if (tile) {
    activeCategory = tile.dataset.all ? null : tile.dataset.key;
    view = 'recipes';
    fromTile = true;
    searchInput.value = '';
    render();
    window.scrollTo(0, 0);
    return;
  }

  const card = e.target.closest('.rcard');
  if (card) openDetail(Number(card.dataset.index));
});

$('back-btn').addEventListener('click', () => {
  view = 'collections';
  activeCategory = null;
  fromTile = false;
  searchInput.value = '';
  render();
  window.scrollTo(0, 0);
});

$('sort-btn').addEventListener('click', () => {
  sortMode = sortMode === 'recent' ? 'az' : 'recent';
  render();
});

searchInput.addEventListener('input', render);

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab[data-tab]');
  if (!tab) return;
  const target = tab.dataset.tab;

  if (target === 'more') {
    openSheet('more');
    return;
  }

  view = target === 'collections' ? 'collections' : 'recipes';
  activeCategory = null;
  fromTile = false;
  if (target !== 'search') searchInput.value = '';
  render();
  window.scrollTo(0, 0);

  if (target === 'search') setTimeout(() => searchInput.focus(), 60);
});

/* ---------- Detalhe da receita ---------- */

function setSegment(name) {
  document.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.seg === name);
  });
  $('detail-ingredients').hidden = name !== 'ingredients';
  $('detail-steps').hidden = name !== 'steps';
}

document.querySelectorAll('.seg-btn').forEach((b) => {
  b.addEventListener('click', () => setSegment(b.dataset.seg));
});

function openDetail(index) {
  const r = recipes[index];
  if (!r) return;
  currentIndex = index;

  $('detail-media').style.background = pastel(r.name);

  const img = $('detail-img');
  if (r.image) {
    img.hidden = false;
    img.alt = r.name;
    img.onerror = () => { img.hidden = true; };
    img.src = r.image;
  } else {
    img.hidden = true;
    img.removeAttribute('src');
  }

  const tag = $('detail-tag');
  tag.textContent = r.category || '';
  tag.hidden = !r.category;

  $('detail-title').textContent = r.name;

  $('detail-ingredients').innerHTML = r.ingredients
    .map((i) => `<li><label><input type="checkbox"><span>${escapeHtml(i)}</span></label></li>`)
    .join('');

  const steps = r.steps.split('\n').map((s) => s.trim()).filter(Boolean);
  $('detail-steps').innerHTML = steps.map((s) => `<li><span>${escapeHtml(s)}</span></li>`).join('');

  setSegment('ingredients');
  openSheet('detail');
  sheets.detail.querySelector('.sheet-content').scrollTop = 0;
}

$('detail-edit').addEventListener('click', () => {
  const index = currentIndex;
  closeSheet('detail');
  startEdit(index);
});

$('detail-delete').addEventListener('click', () => {
  if (!confirm('Excluir essa receita?')) return;
  recipes.splice(currentIndex, 1);
  save();
  closeSheet('detail');
  render();
});

/* ---------- Formulário (criar e editar) ---------- */

function resetForm() {
  form.reset();
  editingIndex = null;
  formTitle.textContent = 'Nova receita';
  submitBtn.textContent = 'Salvar receita';
}

function cancelForm() {
  if (sheets.form.classList.contains('hidden')) return;
  resetForm();
  closeSheet('form');
}

function openNewForm() {
  resetForm();
  if (view === 'recipes' && typeof activeCategory === 'string' && activeCategory !== UNCAT) {
    $('category').value = activeCategory;
  }
  openSheet('form');
  $('name').focus();
}

function startEdit(index) {
  const recipe = recipes[index];
  if (!recipe) return;
  editingIndex = index;

  $('name').value = recipe.name;
  $('category').value = recipe.category || '';
  $('image').value = recipe.image || '';
  $('ingredients').value = recipe.ingredients.join('\n');
  $('steps').value = recipe.steps;

  formTitle.textContent = 'Editar receita';
  submitBtn.textContent = 'Salvar alterações';
  openSheet('form');
}

$('fab').addEventListener('click', openNewForm);
$('cancel-btn').addEventListener('click', cancelForm);

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const recipe = {
    name: $('name').value.trim(),
    category: $('category').value.trim(),
    image: $('image').value.trim(),
    ingredients: $('ingredients').value.split('\n').map((i) => i.trim()).filter(Boolean),
    steps: $('steps').value.trim()
  };

  if (editingIndex === null) {
    recipes.push(recipe);
  } else {
    recipes[editingIndex] = recipe;
  }

  save();
  resetForm();
  closeSheet('form');
  render();
});

/* ---------- Backup (exportar e importar) ---------- */

function exportRecipes() {
  if (recipes.length === 0) {
    alert('Você ainda não tem receitas para exportar.');
    return;
  }

  const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'receitas-backup.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isValidRecipe(r) {
  return r
    && typeof r.name === 'string'
    && Array.isArray(r.ingredients)
    && typeof r.steps === 'string';
}

function cleanRecipe(r) {
  return {
    name: r.name,
    category: typeof r.category === 'string' ? r.category : '',
    image: typeof r.image === 'string' ? r.image : '',
    ingredients: r.ingredients.map(String),
    steps: r.steps
  };
}

$('export-btn').addEventListener('click', exportRecipes);
$('import-btn').addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('formato inválido');

      const valid = data.filter(isValidRecipe).map(cleanRecipe);
      if (valid.length === 0) throw new Error('nenhuma receita válida');

      if (confirm(`Importar ${valid.length} receita(s)? Elas serão adicionadas às que você já tem.`)) {
        recipes = recipes.concat(valid);
        save();
        closeSheet('more');
        render();
      }
    } catch (err) {
      alert('Arquivo inválido. Use um arquivo gerado pelo botão Exportar.');
    }

    importFile.value = '';
  };

  reader.readAsText(file);
});

render();

/* ---------- PWA: registrar o service worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
