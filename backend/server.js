const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
});

const app = express();
app.use(cors());
app.use(express.json());

const CUSTOMER_ROLE_ID = 1;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  if (!stored || !stored.includes(':')) return password === stored;
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return hash === originalHash;
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, delivery_address, name } = req.body;
  if (!email || !password || !delivery_address) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const userName = name || email.split('@')[0];
    const newUser = await pool.query(
      'INSERT INTO users (role_id, name, email, password_hash, address) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, address',
      [CUSTOMER_ROLE_ID, userName, email, hashPassword(password), delivery_address]
    );

    const user = newUser.rows[0];
    const couponCode = `SALE5_${user.id}`;
    await pool.query(
      'INSERT INTO coupons (code, discount_percent, user_id, active) VALUES ($1, 5, $2, true)',
      [couponCode, user.id]
    );

    res.json({
      user: { ...user, role: 'user', personal_discount: 5, coupon_code: couponCode }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Введите email и пароль' });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, u.password_hash, r.name AS role,
              COALESCE(c.discount_percent, 0) AS personal_discount,
              COALESCE(c.code, '') AS coupon_code
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN coupons c ON u.id = c.user_id AND c.active = true
       WHERE u.email = $1`,
      [email]
    );

    if (userRes.rows.length === 0 || !checkPassword(password, userRes.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const { password_hash, ...user } = userRes.rows[0];
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, r.name AS role,
              COALESCE(c.discount_percent, 0) AS personal_discount,
              COALESCE(c.code, '') AS coupon_code
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN coupons c ON u.id = c.user_id AND c.active = true
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  const { userId, email, password, delivery_address } = req.body;

  try {
    const query = password
      ? 'UPDATE users SET email = $1, password_hash = $2, address = $3 WHERE id = $4 RETURNING id, name, email, address'
      : 'UPDATE users SET email = $1, address = $2 WHERE id = $3 RETURNING id, name, email, address';

    const params = password
      ? [email, hashPassword(password), delivery_address, userId]
      : [email, delivery_address, userId];

    const result = await pool.query(query, params);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки категорий' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Введите название категории' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Категория с таким названием уже существует' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, category_id, name, description,
              duration || ' мес.' AS duration,
              price, discount_percent, image AS image_url
       FROM services
       WHERE active = true
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
});

app.put('/api/services/:id/discount', async (req, res) => {
  const discount = parseInt(req.body.discount_percent);
  if (isNaN(discount) || discount < 0 || discount > 99) {
    return res.status(400).json({ error: 'Скидка должна быть от 0 до 99%' });
  }

  try {
    const countRes = await pool.query(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE discount_percent > 0) AS discounted
       FROM services WHERE active = true`
    );
    const total = parseInt(countRes.rows[0].total);
    const discounted = parseInt(countRes.rows[0].discounted);

    const currentItem = await pool.query('SELECT discount_percent FROM services WHERE id = $1', [req.params.id]);
    if (currentItem.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });

    const currentDiscount = currentItem.rows[0].discount_percent;
    const discountedAfter = discounted + (discount > 0 && currentDiscount === 0 ? 1 : (discount === 0 && currentDiscount > 0 ? -1 : 0));
    const minRequired = Math.ceil(total * 0.3);

    if (discountedAfter < minRequired) {
      return res.status(400).json({
        error: `Нельзя снять скидку: со скидкой должно оставаться минимум 30% товаров (${minRequired} из ${total})`
      });
    }

    const updated = await pool.query(
      'UPDATE services SET discount_percent = $1 WHERE id = $2 RETURNING *',
      [discount, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления скидки на товар' });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { userId, delivery_address, items } = req.body;
  if (!userId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Корзина пуста' });
  }

  try {
    const couponRes = await pool.query(
      'SELECT code, discount_percent FROM coupons WHERE user_id = $1 AND active = true',
      [userId]
    );
    const personalDiscount = couponRes.rows[0]?.discount_percent || 0;
    const couponCode = couponRes.rows[0]?.code || '';

    const itemQuantities = items.reduce((acc, it) => {
      acc[it.id] = (acc[it.id] || 0) + (Number(it.quantity) || 1);
      return acc;
    }, {});

    const ids = Object.keys(itemQuantities);
    const servicesRes = await pool.query('SELECT * FROM services WHERE id = ANY($1::int[])', [ids]);

    let totalInitial = 0;
    let totalWithProductDiscounts = 0;
    const orderItems = [];

    for (const srv of servicesRes.rows) {
      const qty = itemQuantities[srv.id];
      const origPrice = parseFloat(srv.price);
      const discount = srv.discount_percent || 0;
      const unitPrice = Math.round(origPrice - (origPrice * discount) / 100);

      totalInitial += origPrice * qty;
      totalWithProductDiscounts += unitPrice * qty;

      orderItems.push({
        id: srv.id,
        code: srv.code,
        name: srv.name,
        image_url: srv.image,
        quantity: qty,
        original_price: origPrice,
        price: unitPrice,
        discount_percent: discount
      });
    }

    const finalAmount = Math.round(totalWithProductDiscounts - (totalWithProductDiscounts * personalDiscount) / 100);
    const personalDiscountAmount = totalWithProductDiscounts - finalAmount;
    const totalDiscount = totalInitial - finalAmount;

    const orderRes = await pool.query(
      'INSERT INTO appointments (user_id, status, total, delivery_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, 'Оформлен', finalAmount, delivery_address]
    );
    const orderId = orderRes.rows[0].id;

    for (const it of orderItems) {
      await pool.query(
        'INSERT INTO appointment_services (appointment_id, service_id, quantity, unit_price, original_price, discount_percent) VALUES ($1, $2, $3, $4, $5, $6)',
        [orderId, it.id, it.quantity, it.price, it.original_price, it.discount_percent]
      );
    }

    await pool.query(
      'INSERT INTO payments (appointment_id, amount, status, provider) VALUES ($1, $2, $3, $4)',
      [orderId, finalAmount, 'Оплачено', 'Карта']
    );

    res.json({
      receipt: {
        order_number: `ORD-${orderId}`,
        date: orderRes.rows[0].created_at,
        delivery_address,
        items: orderItems,
        total_initial: Math.round(totalInitial),
        total_with_product_discounts: Math.round(totalWithProductDiscounts),
        personal_discount: personalDiscount,
        personal_discount_amount: personalDiscountAmount,
        coupon_code: couponCode,
        total_discount: Math.round(totalDiscount),
        final_amount: finalAmount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при оформлении заказа' });
  }
});

app.get('/api/appointments/user/:userId', async (req, res) => {
  try {
    const ordersRes = await pool.query(
      'SELECT id, status, total AS final_amount, created_at FROM appointments WHERE user_id = $1 ORDER BY id DESC',
      [req.params.userId]
    );

    const orders = [];
    for (const ord of ordersRes.rows) {
      const itemsRes = await pool.query(
        `SELECT asv.quantity, asv.unit_price, asv.original_price, asv.discount_percent,
                s.name, s.code, s.image AS image_url
         FROM appointment_services asv
         JOIN services s ON asv.service_id = s.id
         WHERE asv.appointment_id = $1`,
        [ord.id]
      );
      orders.push({
        ...ord,
        order_number: `ORD-${ord.id}`,
        items: itemsRes.rows
      });
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки истории заказов' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.address AS delivery_address,
              COALESCE(c.discount_percent, 0) AS personal_discount,
              COALESCE(c.code, '') AS coupon_code
       FROM users u
       LEFT JOIN coupons c ON u.id = c.user_id AND c.active = true
       WHERE u.role_id = $1
       ORDER BY u.id ASC`,
      [CUSTOMER_ROLE_ID]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки покупателей' });
  }
});

app.put('/api/admin/users/:id/discount', async (req, res) => {
  const userId = req.params.id;
  const discount = parseInt(req.body.personal_discount);
  const couponCode = req.body.coupon_code || `SALE_${userId}`;

  if (isNaN(discount) || discount < 0 || discount > 99) {
    return res.status(400).json({ error: 'Скидка должна быть от 0 до 99%' });
  }

  try {
    await pool.query('UPDATE coupons SET active = false WHERE user_id = $1', [userId]);

    if (discount > 0) {
      await pool.query(
        `INSERT INTO coupons (code, discount_percent, user_id, active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (code) DO UPDATE
         SET discount_percent = EXCLUDED.discount_percent, user_id = EXCLUDED.user_id, active = true`,
        [couponCode, discount, userId]
      );
    }

    res.json({
      id: userId,
      personal_discount: discount,
      coupon_code: discount > 0 ? couponCode : ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения скидки' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
