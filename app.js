const form = document.getElementById('recipe-form');
const list = document.getElementById('recipe-list');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');

let recipes = JSON.parse(localStorage.getItem('recipes')) || [];
let editingIndex = null;

function save() {
  localStorage.setItem('recipes', JSON.stringify(recipes));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/"/g, '&quot;');
}

/* ---------- Modal de detalhe ---------- */

const modal = document.createElement('div');
modal.className = 'modal hidden';
modal.innerHTML = '<div class="modal-content"><button class="modal-close" aria-label="Fechar">✕</button><div id="modal-body"></div></div>';
document.body.appendChild(modal);

function openModal(recipe) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}">` : ''}
    <h2>${escapeHtml(recipe.name)}</h2>
    <h3>Ingredientes</h3>
    <ul>${recipe.ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
    <h3>Modo de preparo</h3>
    <p class="steps">${escapeHtml(recipe.steps)}</p>
  `;
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

modal.addEventListener('click', (e) => {
  if (e.target === modal || e.target.classList.contains('modal-close')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ---------- Formulário (criar e editar) ---------- */

function resetForm() {
  form.reset();
  editingIndex = null;
  formTitle.textContent = 'Nova receita';
  submitBtn.textContent = 'Salvar receita';
  cancelBtn.hidden = true;
}

function startEdit(index) {
  const recipe = recipes[index];
  editingIndex = index;

  document.getElementById('name').value = recipe.name;
  document.getElementById('image').value = recipe.image || '';
  document.getElementById('ingredients').value = recipe.ingredients.join('\n');
  document.getElementById('steps').value = recipe.steps;

  formTitle.textContent = 'Editar receita';
  submitBtn.textContent = 'Salvar alterações';
  cancelBtn.hidden = false;

  form.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('name').focus();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const recipe = {
    name: document.getElementById('name').value,
    image: document.getElementById('image').value,
    ingredients: document.getElementById('ingredients').value.split('\n').filter(Boolean),
    steps: document.getElementById('steps').value
  };

  if (editingIndex === null) {
    recipes.push(recipe);
  } else {
    recipes[editingIndex] = recipe;
  }

  save();
  render();
  resetForm();
});

cancelBtn.addEventListener('click', resetForm);

/* ---------- Lista de receitas ---------- */

function render() {
  list.innerHTML = '';

  if (recipes.length === 0) {
    list.innerHTML = '<p>Nenhuma receita ainda. Cadastre a primeira! 👆</p>';
    return;
  }

  recipes.forEach((recipe, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.index = index;
    card.innerHTML = `
      ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}">` : '<img alt="">'}
      <div class="card-body">
        <h3>${escapeHtml(recipe.name)}</h3>
        <small>${recipe.ingredients.length} ingredientes</small>
        <div class="card-actions">
          <button class="edit" data-index="${index}">Editar</button>
          <button class="delete" data-index="${index}">Excluir</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

list.addEventListener('click', (e) => {
  // Excluir
  if (e.target.classList.contains('delete')) {
    if (confirm('Excluir essa receita?')) {
      recipes.splice(e.target.dataset.index, 1);
      save();
      render();
      resetForm();
    }
    return;
  }

  // Editar
  if (e.target.classList.contains('edit')) {
    startEdit(Number(e.target.dataset.index));
    return;
  }

  // Abrir detalhe
  const card = e.target.closest('.card');
  if (card) openModal(recipes[card.dataset.index]);
});

render();
