const API_URL = 'http://localhost:5000/api';
const SERVER_ERROR = 'Сервер временно недоступен. Попробуйте обновить страницу позже.';

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(SERVER_ERROR);
  }
}

export async function getUsers() {
  const response = await request(`${API_URL}/admin/users`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить покупателей');
  }

  return await response.json();
}

export async function updateUserDiscount(userId, discount, couponCode) {
  const response = await request(`${API_URL}/admin/users/${userId}/discount`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personal_discount: discount, coupon_code: couponCode })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось сохранить скидку');
  }

  return data;
}
