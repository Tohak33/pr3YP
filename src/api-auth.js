const API_URL = 'http://localhost:5000/api';
const SERVER_ERROR = 'Сервер временно недоступен. Попробуйте обновить страницу позже.';

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(SERVER_ERROR);
  }
}

export async function loginRequest(email, password) {
  const response = await request(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось войти');
  }

  return data;
}

export async function registerRequest(email, password, address) {
  const response = await request(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, delivery_address: address })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось зарегистрироваться');
  }

  return data;
}

export async function getCurrentUser(id) {
  const response = await request(`${API_URL}/auth/user/${id}`);

  if (!response.ok) {
    throw new Error('Пользователь не найден');
  }

  return await response.json();
}

export async function updateProfileRequest(id, email, password, address) {
  const response = await request(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: id, email, password, delivery_address: address })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось сохранить профиль');
  }

  return data;
}
