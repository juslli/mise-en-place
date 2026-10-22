const form = document.getElementById('recipe-form');
const list = document.getElementById('recipe-list');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search');
const countLabel = document.getElementById('count');
const chips = document.getElementById('chips');
const categoryList = document.getElementById('category-list');
const fab = document.getElementById('fab');
const sheet = document.getElementById('form-sheet');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

let recipes = JSON.parse(localStorage.getItem('recipes')) || [];
let editingIndex = null;
let activeCategory = 'Todas';

function save() {
  localStorage.setItem('recipes', JSON.stringify(recipes));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/"/g, '&quot;');
}

/* ---------- Janelas (abrir e fechar) ---------- */

const modal = document.createElement('div');
modal.className = 'modal hidden';
modal.innerHTML = '<div class="modal-content"><button class="modal-close" aria-label="Fechar">✕</button><div id="modal-body"></div></div>';
document.body.appendChild(modal);

function updateScrollLock() {
  const open = !sheet.classList.contains('hidden') || !modal.classList.contains('hidden');
  document.body.classList.toggle('no-scroll', open);
}

function openSheet() {
  sheet.classList.remove('hidden');
  updateScrollLock();
  document.getElementById('name').focus();
}

function closeSheet() {
  sheet.classList.add('hidden');
  updateScrollLock();
}

function openModal(recipe) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="detail-media">
      ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" onerror="this.style.display='none'">` : ''}
    </div>
    <div class="detail-body">
      ${recipe.category ? `<span class="tag">${escapeHtml(recipe.category)}</span>` : ''}
      <h2>${escapeHtml(recipe.name)}</h2>
      <h3>Ingredientes</h3>
      <ul>${recipe.ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      <h3>Modo de preparo</h3>
      <p class="steps">${escapeHtml(recipe.steps)}</p>
    </div>
  `;
  modal.classList.remove('hidden');
  updateScrollLock();
}

function closeModal() {
  modal.classList.add('hidden');
  updateScrollLock();
}

modal.addEventListener('click', (e) => {
  if (e.target === modal || e.target.classList.contains('modal-close')) closeModal();
});

sheet.addEventListener('click', (e) => {
  if (e.target === sheet) cancelForm();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    cancelForm();
  }
});

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

function makeChip(label, value) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chip' + (activeCategory === value ? ' active' : '');
  btn.dataset.cat = value;
  btn.textContent = label;
  return btn;
}

function renderChips() {
  const cats = getCategories();

  if (activeCategory !== 'Todas' && !cats.includes(activeCategory)) {
    activeCategory = 'Todas';
  }

  chips.innerHTML = '';
  if (cats.length === 0) return;

  chips.appendChild(makeChip('Todas', 'Todas'));
  cats.forEach((cat) => chips.appendChild(makeChip(cat, cat)));
}

chips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
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
  if (sheet.classList.contains('hidden')) return;
  resetForm();
  closeSheet();
}

function startEdit(index) {
  const recipe = recipes[index];
  editingIndex = index;

  document.getElementById('name').value = recipe.name;
  document.getElementById('category').value = recipe.category || '';
  document.getElementById('image').value = recipe.image || '';
  document.getElementById('ingredients').value = recipe.ingredients.join('\n');
  document.getElementById('steps').value = recipe.steps;

  formTitle.textContent = 'Editar receita';
  submitBtn.textContent = 'Salvar alterações';
  openSheet();
}

fab.addEventListener('click', () => {
  resetForm();
  // Já abre com a coleção que está filtrada, pra agilizar
  if (activeCategory !== 'Todas') {
    document.getElementById('category').value = activeCategory;
  }
  openSheet();
});

cancelBtn.addEventListener('click', cancelForm);

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const recipe = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim(),
    image: document.getElementById('image').value.trim(),
    ingredients: document.getElementById('ingredients').value.split('\n').map(i => i.trim()).filter(Boolean),
    steps: document.getElementById('steps').value.trim()
  };

  if (editingIndex === null) {
    recipes.push(recipe);
  } else {
    recipes[editingIndex] = recipe;
  }

  save();
  render();
  resetForm();
  closeSheet();
});

/* ---------- Busca ---------- */

function matchesSearch(recipe, term) {
  if (!term) return true;
  const text = (recipe.name + ' ' + recipe.ingredients.join(' ') + ' ' + (recipe.category || '')).toLowerCase();
  return text.includes(term);
}

function matchesCategory(recipe) {
  return activeCategory === 'Todas' || recipe.category === activeCategory;
}

searchInput.addEventListener('input', render);

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

exportBtn.addEventListener('click', exportRecipes);

importBtn.addEventListener('click', () => importFile.click());

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
        render();
      }
    } catch (err) {
      alert('Arquivo inválido. Use um arquivo gerado pelo botão Exportar.');
    }

    importFile.value = '';
  };

  reader.readAsText(file);
});

/* ---------- Lista de receitas ---------- */

function render() {
  renderChips();
  renderCategoryList();
  list.innerHTML = '';

  if (recipes.length === 0) {
    countLabel.textContent = '0 receitas';
    list.innerHTML = `
      <div class="empty">
        <span class="big">🍳</span>
        <p>Nenhuma receita ainda.<br>Que tal cadastrar a primeira?</p>
        <button type="button" class="btn btn-primary empty-add">+ Nova receita</button>
      </div>
    `;
    return;
  }

  const term = searchInput.value.trim().toLowerCase();
  let shown = 0;

  recipes.forEach((recipe, index) => {
    if (!matchesSearch(recipe, term) || !matchesCategory(recipe)) return;
    shown++;

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.index = index;
    card.innerHTML = `
      <div class="card-media">
        ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="card-actions">
          <button class="icon-btn edit" aria-label="Editar">✏️</button>
          <button class="icon-btn delete" aria-label="Excluir">🗑️</button>
        </div>
      </div>
      <div class="card-body">
        ${recipe.category ? `<span class="tag">${escapeHtml(recipe.category)}</span><br>` : ''}
        <h3>${escapeHtml(recipe.name)}</h3>
        <small>${recipe.ingredients.length} ingredientes</small>
      </div>
    `;
    list.appendChild(card);
  });

  countLabel.textContent = shown === 1 ? '1 receita' : `${shown} receitas`;

  if (shown === 0) {
    list.innerHTML = '<div class="empty"><span class="big">🔎</span><p>Nenhuma receita encontrada.</p></div>';
  }
}

list.addEventListener('click', (e) => {
  // Botão de nova receita (estado vazio)
  if (e.target.closest('.empty-add')) {
    resetForm();
    openSheet();
    return;
  }

  const card = e.target.closest('.card');
  if (!card) return;
  const index = Number(card.dataset.index);

  // Excluir
  if (e.target.closest('.delete')) {
    if (confirm('Excluir essa receita?')) {
      recipes.splice(index, 1);
      save();
      render();
    }
    return;
  }

  // Editar
  if (e.target.closest('.edit')) {
    startEdit(index);
    return;
  }

  // Abrir detalhe
  openModal(recipes[index]);
});

render();

/* ---------- PWA: registrar o service worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
