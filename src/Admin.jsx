import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import SessionWarning from './SessionWarning';
import { getServices, getCategories, addCategory, updateServiceDiscount } from './api-services';
import { getUsers, updateUserDiscount } from './api-admin';

export default function Admin() {
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const servicesData = await getServices();
        setProducts(servicesData);

        const categoriesData = await getCategories();
        setCategories(categoriesData);

        const usersData = await getUsers();
        setUsers(usersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const added = await addCategory(newCategory);
      setCategories([...categories, added]);
      setNewCategory('');
      setMessage('Категория добавлена');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveProductDiscount = async (id, discount) => {
    setMessage(null);
    setError(null);

    try {
      const updated = await updateServiceDiscount(id, discount);
      setProducts(
        products.map((item) => (item.id === id ? { ...item, discount_percent: updated.discount_percent } : item))
      );
      setMessage('Скидка на товар обновлена');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveUserDiscount = async (userId, discount, coupon) => {
    setMessage(null);
    setError(null);

    try {
      const updated = await updateUserDiscount(userId, discount, coupon);
      setUsers(
        users.map((item) =>
          item.id === userId
            ? { ...item, personal_discount: updated.personal_discount, coupon_code: updated.coupon_code }
            : item
        )
      );
      setMessage('Скидка покупателю обновлена');
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((item) => {
    const text = search.toLowerCase().trim();
    return item.name.toLowerCase().includes(text) || item.code.toLowerCase().includes(text);
  });

  return (
    <div className="admin-page">
      <SessionWarning />
      <h2>Панель администратора</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="info-message">Загрузка данных с API...</div>}

      <section className="admin-section card">
        <h3>Добавить категорию</h3>
        <form onSubmit={handleAddCategory} className="form-inline">
          <input
            type="text"
            placeholder="Уникальное название..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Создать
          </button>
        </form>
      </section>

      <section className="admin-section card">
        <h3>Персональные скидки и купоны</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Адрес</th>
              <th>Скидка (%)</th>
              <th>Код купона</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <UserRow key={item.id} item={item} onSave={handleSaveUserDiscount} />
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-section card">
        <h3>Скидки на товары</h3>
        <p className="admin-hint">Со скидкой должно оставаться не менее 30% активных товаров.</p>
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по названию или коду..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <table className="admin-table">
          <thead>
            <tr>
              <th>Код</th>
              <th>Название</th>
              <th>Базовая цена</th>
              <th>Скидка (%)</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((item) => (
              <ProductRow key={item.id} item={item} onSave={handleSaveProductDiscount} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ProductRow({ item, onSave }) {
  const [discount, setDiscount] = useState(item.discount_percent);

  return (
    <tr>
      <td>{item.code}</td>
      <td>{item.name}</td>
      <td>{Number(item.price)} ₽</td>
      <td>
        <input
          type="number"
          min="0"
          max="99"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          style={{ width: '70px' }}
        />
      </td>
      <td>
        <button className="btn-small" onClick={() => onSave(item.id, discount)}>
          Применить
        </button>
      </td>
    </tr>
  );
}

function UserRow({ item, onSave }) {
  const [discount, setDiscount] = useState(item.personal_discount);
  const [coupon, setCoupon] = useState(item.coupon_code || '');

  return (
    <tr>
      <td>{item.email}</td>
      <td>{item.delivery_address || '—'}</td>
      <td>
        <input
          type="number"
          min="0"
          max="99"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          style={{ width: '70px' }}
        />
      </td>
      <td>
        <input
          type="text"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          placeholder="Код купона"
        />
      </td>
      <td>
        <button className="btn-small" onClick={() => onSave(item.id, discount, coupon)}>
          Сохранить
        </button>
      </td>
    </tr>
  );
}
