const API_URL = 'http://localhost:5000/api';
const SERVER_ERROR = 'Сервер временно недоступен. Попробуйте обновить страницу позже.';

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(SERVER_ERROR);
  }
}

export async function createOrder(orderData) {
  const response = await request(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось оформить заказ');
  }

  return data;
}

export async function getUserOrders(userId) {
  const response = await request(`${API_URL}/appointments/user/${userId}`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить историю заказов');
  }

  return await response.json();
}
