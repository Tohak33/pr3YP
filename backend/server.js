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
  port: process.env.DB_PORT
});

const app = express();
app.use(cors());
app.use(express.json());

const CUSTOMER_ROLE_ID = 1;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return salt + ':' + hash;
}

function checkPassword(password, stored) {
  const parts = String(stored).split(':');
  if (parts.length !== 2) {
    return stored === password;
  }
  const hash = crypto.createHash('sha256').update(parts[0] + password).digest('hex');
  return hash === parts[1];
}

app.post('/api/auth/register', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const delivery_address = req.body.delivery_address;
  const name = req.body.name || email.split('@')[0];

  if (!email || !password || !delivery_address) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Такой пользователь уже есть' });
    }

    const newUser = await pool.query(
      'INSERT INTO users (role_id, name, email, password_hash, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [CUSTOMER_ROLE_ID, name, email, hashPassword(password), delivery_address]
    );

    const user = newUser.rows[0];
    const couponCode = 'SALE5_' + user.id;

    await pool.query(
      'INSERT INTO coupons (code, discount_percent, user_id, active) VALUES ($1, 5, $2, true)',
      [couponCode, user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        address: user.address,
        role: 'user',
        personal_discount: 5,
        coupon_code: couponCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'Введите email и пароль' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const user = userRes.rows[0];
    if (!checkPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    if (String(user.password_hash).indexOf(':') === -1) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        hashPassword(password),
        user.id
      ]);
    }

    const roleRes = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const roleName = roleRes.rows[0].name;

    const couponRes = await pool.query('SELECT * FROM coupons WHERE user_id = $1 AND active = true', [
      user.id
    ]);
    let discount = 0;
    let couponCode = '';
    if (couponRes.rows.length > 0) {
      discount = couponRes.rows[0].discount_percent;
      couponCode = couponRes.rows[0].code;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        address: user.address,
        role: roleName,
        personal_discount: discount,
        coupon_code: couponCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  const userId = req.body.userId;
  const email = req.body.email;
  const password = req.body.password;
  const address = req.body.delivery_address;

  try {
    let result;
    if (password && password !== '') {
      result = await pool.query(
        'UPDATE users SET email = $1, password_hash = $2, address = $3 WHERE id = $4 RETURNING *',
        [email, hashPassword(password), address, userId]
      );
    } else {
      result = await pool.query(
        'UPDATE users SET email = $1, address = $2 WHERE id = $3 RETURNING *',
        [email, address, userId]
      );
    }

    const updatedUser = result.rows[0];
    const couponRes = await pool.query('SELECT * FROM coupons WHERE user_id = $1 AND active = true', [
      userId
    ]);
    let discount = 0;
    let couponCode = '';
    if (couponRes.rows.length > 0) {
      discount = couponRes.rows[0].discount_percent;
      couponCode = couponRes.rows[0].code;
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        address: updatedUser.address,
        personal_discount: discount,
        coupon_code: couponCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userRes.rows[0];
    const roleRes = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);

    const couponRes = await pool.query('SELECT * FROM coupons WHERE user_id = $1 AND active = true', [
      user.id
    ]);
    let discount = 0;
    let couponCode = '';
    if (couponRes.rows.length > 0) {
      discount = couponRes.rows[0].discount_percent;
      couponCode = couponRes.rows[0].code;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        address: user.address,
        role: roleRes.rows[0].name,
        personal_discount: discount,
        coupon_code: couponCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
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
  const name = req.body.name;
  if (!name) {
    return res.status(400).json({ error: 'Введите название' });
  }
  try {
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Такая категория уже есть' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services WHERE active = true ORDER BY id ASC');
    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      const item = result.rows[i];
      items.push({
        id: item.id,
        code: item.code,
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        duration: item.duration + ' мес.',
        price: item.price,
        discount_percent: item.discount_percent,
        image_url: item.image
      });
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
});

app.put('/api/services/:id/discount', async (req, res) => {
  const id = req.params.id;
  const discount = parseInt(req.body.discount_percent);
  if (isNaN(discount) || discount < 0 || discount > 99) {
    return res.status(400).json({ error: 'Скидка от 0 до 99' });
  }
  try {
    const discountedRes = await pool.query(
      'SELECT count(*) FROM services WHERE active = true AND discount_percent > 0'
    );
    const totalRes = await pool.query('SELECT count(*) FROM services WHERE active = true');
    const discountedCount = parseInt(discountedRes.rows[0].count);
    const totalCount = parseInt(totalRes.rows[0].count);

    const currentRes = await pool.query('SELECT discount_percent FROM services WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    const currentDiscount = currentRes.rows[0].discount_percent;

    let discountedAfter = discountedCount;
    if (discount > 0 && currentDiscount === 0) {
      discountedAfter = discountedAfter + 1;
    }
    if (discount === 0 && currentDiscount > 0) {
      discountedAfter = discountedAfter - 1;
    }

    const minDiscounted = Math.ceil(totalCount * 0.3);
    if (discountedAfter < minDiscounted) {
      return res.status(400).json({
        error:
          'Нельзя снять скидку: со скидкой должно остаться не менее 30% товаров (' +
          minDiscounted +
          ' из ' +
          totalCount +
          ')'
      });
    }

    const result = await pool.query(
      'UPDATE services SET discount_percent = $1 WHERE id = $2 RETURNING *',
      [discount, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления скидки' });
  }
});

app.post('/api/appointments', async (req, res) => {
  const userId = req.body.userId;
  const address = req.body.delivery_address;
  const items = req.body.items;

  if (!userId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Корзина пуста' });
  }

  try {
    const couponRes = await pool.query('SELECT * FROM coupons WHERE user_id = $1 AND active = true', [
      userId
    ]);
    let personalDiscount = 0;
    let couponCode = '';
    if (couponRes.rows.length > 0) {
      personalDiscount = couponRes.rows[0].discount_percent;
      couponCode = couponRes.rows[0].code;
    }

    const mergedItems = {};
    for (let i = 0; i < items.length; i++) {
      const id = items[i].id;
      const quantity = Number(items[i].quantity) || 0;
      if (mergedItems[id]) {
        mergedItems[id] = mergedItems[id] + quantity;
      } else {
        mergedItems[id] = quantity;
      }
    }

    let totalInitial = 0;
    let totalWithProductDiscounts = 0;
    const orderItems = [];

    for (const id in mergedItems) {
      const srvRes = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
      if (srvRes.rows.length === 0) {
        return res.status(400).json({ error: 'Товар не найден' });
      }
      const srv = srvRes.rows[0];

      const price = parseFloat(srv.price);
      const discount = srv.discount_percent;
      const count = mergedItems[id];

      const fullPrice = price * count;
      const discountedPrice = fullPrice - (fullPrice * discount) / 100;

      totalInitial = totalInitial + fullPrice;
      totalWithProductDiscounts = totalWithProductDiscounts + discountedPrice;

      orderItems.push({
        id: srv.id,
        code: srv.code,
        name: srv.name,
        image_url: srv.image,
        quantity: count,
        original_price: price,
        price: Math.round(price - (price * discount) / 100),
        discount_percent: discount
      });
    }

    totalInitial = Math.round(totalInitial);
    totalWithProductDiscounts = Math.round(totalWithProductDiscounts);

    const finalAmount = Math.round(
      totalWithProductDiscounts - (totalWithProductDiscounts * personalDiscount) / 100
    );
    const personalDiscountAmount = totalWithProductDiscounts - finalAmount;
    const totalDiscount = totalInitial - finalAmount;

    const orderRes = await pool.query(
      'INSERT INTO appointments (user_id, status, total, delivery_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, 'Оформлен', finalAmount, address]
    );
    const order = orderRes.rows[0];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      await pool.query(
        'INSERT INTO appointment_services (appointment_id, service_id, quantity, unit_price, original_price, discount_percent) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          order.id,
          item.id,
          item.quantity,
          item.price,
          item.original_price,
          item.discount_percent
        ]
      );
    }

    await pool.query(
      'INSERT INTO payments (appointment_id, amount, status, provider) VALUES ($1, $2, $3, $4)',
      [order.id, finalAmount, 'Оплачено', 'Карта']
    );

    res.json({
      receipt: {
        order_number: 'ORD-' + order.id,
        date: order.created_at,
        delivery_address: order.delivery_address,
        items: orderItems,
        total_initial: totalInitial,
        total_with_product_discounts: totalWithProductDiscounts,
        personal_discount: personalDiscount,
        personal_discount_amount: personalDiscountAmount,
        coupon_code: couponCode,
        total_discount: totalDiscount,
        final_amount: finalAmount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка оформления заказа' });
  }
});

app.get('/api/appointments/user/:userId', async (req, res) => {
  try {
    const ordersRes = await pool.query(
      'SELECT * FROM appointments WHERE user_id = $1 ORDER BY id DESC',
      [req.params.userId]
    );

    const orders = [];
    for (let i = 0; i < ordersRes.rows.length; i++) {
      const ord = ordersRes.rows[i];
      const itemsRes = await pool.query(
        'SELECT asv.quantity, asv.unit_price, asv.original_price, asv.discount_percent, s.name, s.code, s.image as image_url FROM appointment_services asv JOIN services s ON asv.service_id = s.id WHERE asv.appointment_id = $1',
        [ord.id]
      );

      orders.push({
        id: ord.id,
        order_number: 'ORD-' + ord.id,
        status: ord.status,
        final_amount: ord.total,
        created_at: ord.created_at,
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
    const usersRes = await pool.query('SELECT * FROM users WHERE role_id = $1 ORDER BY id ASC', [
      CUSTOMER_ROLE_ID
    ]);
    const result = [];

    for (let i = 0; i < usersRes.rows.length; i++) {
      const u = usersRes.rows[i];
      const couponRes = await pool.query('SELECT * FROM coupons WHERE user_id = $1 AND active = true', [
        u.id
      ]);
      let discount = 0;
      let couponCode = '';
      if (couponRes.rows.length > 0) {
        discount = couponRes.rows[0].discount_percent;
        couponCode = couponRes.rows[0].code;
      }

      result.push({
        id: u.id,
        email: u.email,
        delivery_address: u.address,
        personal_discount: discount,
        coupon_code: couponCode
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки покупателей' });
  }
});

app.put('/api/admin/users/:id/discount', async (req, res) => {
  const userId = req.params.id;
  const discount = parseInt(req.body.personal_discount);
  const couponCode = req.body.coupon_code || 'SALE_' + userId;

  if (isNaN(discount) || discount < 0 || discount > 99) {
    return res.status(400).json({ error: 'Скидка от 0 до 99' });
  }

  try {
    await pool.query('UPDATE coupons SET active = false WHERE user_id = $1', [userId]);

    if (discount > 0) {
      const existsRes = await pool.query('SELECT id FROM coupons WHERE code = $1', [couponCode]);
      if (existsRes.rows.length > 0) {
        await pool.query(
          'UPDATE coupons SET discount_percent = $1, user_id = $2, active = true WHERE id = $3',
          [discount, userId, existsRes.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO coupons (code, discount_percent, user_id, active) VALUES ($1, $2, $3, true)',
          [couponCode, discount, userId]
        );
      }
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});
