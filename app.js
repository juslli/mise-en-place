const form = document.getElementById('recipe-form');
const list = document.getElementById('recipe-list');

let recipes = JSON.parse(localStorage.getItem('recipes')) || [];

function save() {
  localStorage.setItem('recipes', JSON.stringify(recipes));
}

function render() {
  list.innerHTML = '';

  if (recipes.length === 0) {
    list.innerHTML = '<p>Nenhuma receita ainda. Cadastre a primeira! 👆</p>';
    return;
  }

  recipes.forEach((recipe, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}">` : '<img alt="">'}
      <div class="card-body">
        <h3>${recipe.name}</h3>
        <small>${recipe.ingredients.length} ingredientes</small><br>
        <button class="delete" data-index="${index}">Excluir</button>
      </div>
    `;
    list.appendChild(card);
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const recipe = {
    name: document.getElementById('name').value,
    image: document.getElementById('image').value,
    ingredients: document.getElementById('ingredients').value.split('\n').filter(Boolean),
    steps: document.getElementById('steps').value
  };

  recipes.push(recipe);
  save();
  render();
  form.reset();
});

list.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete')) {
    recipes.splice(e.target.dataset.index, 1);
    save();
    render();
  }
});

render();
