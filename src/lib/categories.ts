export const DEFAULT_CATEGORIES = [
  'Salário',
  'Aluguel',
  'Alimentação',
  'Transporte',
  'Educação',
  'Saúde',
  'Lazer',
  'Outros',
];

const STORAGE_KEY = 'finance-tracker-categories';

export function loadCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  
  try {
    const savedCategories = localStorage.getItem(STORAGE_KEY);
    if (savedCategories) {
      return JSON.parse(savedCategories);
    }
    return DEFAULT_CATEGORIES;
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error('Erro ao salvar categorias:', error);
  }
}

export function addCategory(category: string): string[] {
  const categories = loadCategories();
  
  if (!categories.some(c => c.toLowerCase() === category.toLowerCase())) {
    categories.push(category);
    saveCategories(categories);
  }
  
  return categories;
}

export function removeCategory(category: string): string[] {
  const categories = loadCategories();
  const filteredCategories = categories.filter(c => c !== category);
  saveCategories(filteredCategories);
  return filteredCategories;
}