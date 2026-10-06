const API_URL = 'http://localhost:5000/api';
const SERVER_ERROR = 'Сервер временно недоступен. Попробуйте обновить страницу позже.';

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(SERVER_ERROR);
  }
}

export async function getServices() {
  const response = await request(`${API_URL}/services`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить каталог');
  }

  return await response.json();
}

export async function getCategories() {
  const response = await request(`${API_URL}/categories`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить категории');
  }

  return await response.json();
}

export async function addCategory(name) {
  const response = await request(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось добавить категорию');
  }

  return data;
}

export async function updateServiceDiscount(id, discount) {
  const response = await request(`${API_URL}/services/${id}/discount`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discount_percent: discount })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось сохранить скидку');
  }

  return data;
}
