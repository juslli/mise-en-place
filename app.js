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
const onlineView = $('view-online');
const onlineInput = $('online-search');
const onlineForm = $('online-search-form');
const onlineStatus = $('online-status');
const onlineResults = $('online-results');

let onlineMeals = [];
let onlineRequest = 0;

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

  if (view === 'online') title = 'Buscar receitas';
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
  onlineView.hidden = view !== 'online';

  renderCategoryList();

  if (view === 'collections') renderCollections();
  else if (view === 'recipes') renderRecipes();
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

  view = target === 'collections' ? 'collections'
    : target === 'search' ? 'online' : 'recipes';
  activeCategory = null;
  fromTile = false;
  searchInput.value = '';
  render();
  window.scrollTo(0, 0);

  if (target === 'search') setTimeout(() => onlineInput.focus(), 60);
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


/* ---------- Importação assistida de receita ---------- */
const reelPrepareButton = document.getElementById('reel-prepare');
const reelTextInput = document.getElementById('reel-text');

if (reelPrepareButton && reelTextInput) {
  reelPrepareButton.addEventListener('click', () => {
    const raw = reelTextInput.value.trim();
    const status = document.getElementById('reel-status');

    if (!raw) {
      status.textContent = 'Cole primeiro a legenda ou transcrição do Reel.';
      reelTextInput.focus();
      return;
    }

    const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const isIngredientHeader = line =>
      /^(ingredientes|ingredients|o que vai|você vai precisar)\s*:?\s*$/i.test(line);
    const isStepHeader = line =>
      /^(modo de preparo|preparo|instruções|instrucoes|passo a passo|instructions)\s*:?\s*$/i.test(line);

    const name = lines[0].replace(/^#\s*/, '');
    const ingredients = [];
    const steps = [];
    let section = '';

    for (const line of lines.slice(1)) {
      if (isIngredientHeader(line)) {
        section = 'ingredients';
        continue;
      }
      if (isStepHeader(line)) {
        section = 'steps';
        continue;
      }

      const cleaned = line.replace(/^[-•*]\s*/, '').replace(/^\d+[\s.)-]+/, '');

      if (section === 'ingredients') ingredients.push(cleaned);
      if (section === 'steps') steps.push(cleaned);
    }

    if (!name || !ingredients.length || !steps.length) {
      status.textContent =
        'Organize o texto com o nome da receita, a seção Ingredientes e a seção Modo de preparo.';
      return;
    }

    openNewForm();
    document.getElementById('name').value = name;
    document.getElementById('ingredients').value = ingredients.join('\n');
    document.getElementById('steps').value = steps.join('\n');

    status.textContent =
      'Formulário preenchido. Confira a receita e clique em Salvar receita.';
  });
}

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


/* ---------- Busca online: separada das receitas salvas ---------- */

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mealIngredients(meal) {
  const items = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal['strIngredient' + i];
    const measure = meal['strMeasure' + i];
    if (ingredient && ingredient.trim()) {
      items.push(((measure || '').trim() + ' ' + ingredient.trim()).trim());
    }
  }
  return items;
}

function onlineCardHtml(meal) {
  const ingredients = mealIngredients(meal);
  const instructions = String(meal.strInstructions || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
  const title = escapeHtml(meal.strMeal || 'Receita');
  const image = escapeHtml(meal.strMealThumb || '');
  const id = escapeHtml(meal.idMeal || '');

  return `
    <article class="rcard online-card" data-meal-id="${id}">
      <div class="rimg">
        <span>🍽️</span>
        ${image ? `<img src="${image}" alt="${title}" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <h3>${title}</h3>
      <p>${ingredients.length} ingredientes${meal.strCategory ? ' · ' + escapeHtml(meal.strCategory) : ''}</p>
      <details class="online-details">
        <summary>Ver ingredientes e preparo</summary>
        <h4>Ingredientes</h4>
        <ul>${ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
        <h4>Modo de preparo</h4>
        <ol>${instructions.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ol>
      </details>
      <button type="button" class="btn btn-primary save-online" data-meal-id="${id}">
        Salvar na minha coleção
      </button>
    </article>`;
}

async function searchOnlineRecipes() {
  const query = onlineInput.value.trim();
  const requestId = ++onlineRequest;
  onlineResults.innerHTML = '';
  onlineMeals = [];

  if (!query) {
    onlineStatus.textContent = 'Digite o nome de uma receita ou ingrediente.';
    return;
  }

  onlineStatus.textContent = 'Buscando receitas online...';

  try {
    const translations = {
      frango: 'chicken', galinha: 'chicken',
      carne: 'beef', porco: 'pork', peixe: 'fish',
      salmao: 'salmon', camarao: 'shrimp',
      arroz: 'rice', macarrao: 'pasta', massa: 'pasta',
      pao: 'bread', ovo: 'egg', ovos: 'eggs',
      batata: 'potato', tomate: 'tomato', queijo: 'cheese',
      cogumelo: 'mushroom', cebola: 'onion', alho: 'garlic',
      cenoura: 'carrot', milho: 'corn', feijao: 'beans',
      salada: 'salad', sopa: 'soup', bolo: 'cake',
      atum: 'tuna', peru: 'turkey'
    };

    const normalized = normalizeText(query);
    const terms = normalized.split(/\s+/);
    const translated = terms.map(term => translations[term] || term);
    const candidates = [...new Set([query, translated.join(' ')])];
    let meals = [];

    // Pesquisa pelo nome.
    for (const candidate of candidates) {
      const response = await fetch(
        'https://www.themealdb.com/api/json/v1/1/search.php?s=' +
        encodeURIComponent(candidate)
      );
      if (!response.ok) throw new Error('Falha na busca por nome');

      const data = await response.json();
      if (data.meals && data.meals.length) {
        meals = data.meals;
        break;
      }
    }

    // Se não encontrar pelo nome, pesquisa pelo ingrediente principal.
    if (!meals.length) {
      const ignored = ['com', 'de', 'da', 'do', 'e', 'with', 'and'];
      const ingredient = translated.find(term => !ignored.includes(term));

      if (ingredient) {
        const response = await fetch(
          'https://www.themealdb.com/api/json/v1/1/filter.php?i=' +
          encodeURIComponent(ingredient)
        );
        if (!response.ok) throw new Error('Falha na busca por ingrediente');

        const data = await response.json();
        const matches = (data.meals || []).slice(0, 8);

        meals = (await Promise.all(matches.map(async meal => {
          const detail = await fetch(
            'https://www.themealdb.com/api/json/v1/1/lookup.php?i=' +
            encodeURIComponent(meal.idMeal)
          );
          if (!detail.ok) return null;
          const result = await detail.json();
          return result.meals?.[0] || null;
        }))).filter(Boolean);
      }
    }

    if (requestId !== onlineRequest) return;

    onlineMeals = meals;

    if (!meals.length) {
      onlineStatus.textContent =
        'Nenhuma receita encontrada. Tente outro nome ou ingrediente.';
      return;
    }

    onlineStatus.textContent = meals.length === 1
      ? '1 receita encontrada'
      : `${meals.length} receitas encontradas`;

    onlineResults.innerHTML = meals.map(onlineCardHtml).join('');
  } catch (error) {
    if (requestId !== onlineRequest) return;
    onlineStatus.textContent =
      'Não foi possível consultar as receitas. Verifique a conexão e tente novamente.';
    console.error('Erro na busca online:', error);
  }
}

onlineForm.addEventListener('submit', event => {
  event.preventDefault();
  searchOnlineRecipes();
});

onlineResults.addEventListener('click', event => {
  const button = event.target.closest('.save-online');
  if (!button) return;

  const meal = onlineMeals.find(item => item.idMeal === button.dataset.mealId);
  if (!meal) return;

  const name = meal.strMeal || 'Receita online';
  const exists = recipes.some(r => normalizeText(r.name) === normalizeText(name));

  if (exists && !confirm('Você já tem uma receita com esse nome. Deseja salvar outra cópia?')) {
    return;
  }

  const steps = String(meal.strInstructions || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n');

  recipes.push({
    name,
    category: meal.strCategory || 'Receitas online',
    image: meal.strMealThumb || '',
    ingredients: mealIngredients(meal),
    steps
  });

  save();
  button.textContent = 'Salva na coleção';
  button.disabled = true;
});


render();

/* ---------- PWA: registrar o service worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
