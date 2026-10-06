import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import SessionWarning from './SessionWarning';
import { updateProfileRequest } from './api-auth';
import { getUserOrders } from './api-orders';

export default function Profile() {
  const { user, updateUser } = useContext(AuthContext);

  const [email, setEmail] = useState(user ? user.email : '');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState(user ? user.address : '');
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError(null);

      try {
        const data = await getUserOrders(userId);
        setOrders(data);
      } catch (err) {
        setOrdersError(err.message);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [userId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const data = await updateProfileRequest(user.id, email, password, address);
      updateUser(data.user);
      setPassword('');
      setMessage('Данные успешно сохранены');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="profile-container">
      <SessionWarning />
      <h2>Личный кабинет</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="profile-sections">
        <form className="profile-form card" onSubmit={handleUpdate}>
          <h3>Настройки профиля</h3>

          <div className="form-group">
            <label>Логин / Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Новый пароль</label>
            <input
              type="password"
              value={password}
              placeholder="Оставьте пустым, чтобы не менять"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Адрес доставки</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>

          <div className="coupon-badge">
            Ваш купон: <strong>{user.coupon_code || 'Отсутствует'}</strong> (
            {user.personal_discount || 0}% скидка)
          </div>

          <button type="submit" className="btn-primary">
            Сохранить изменения
          </button>
        </form>

        <div className="order-history card">
          <h3>История заказов</h3>
          {ordersLoading && <div className="info-message">Загрузка истории заказов...</div>}
          {ordersError && <div className="error-message">{ordersError}</div>}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <p className="empty-message">Заказов пока не было.</p>
          )}

          {!ordersLoading && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-box">
                  <div className="order-header">
                    <strong>{order.order_number}</strong>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="order-status">{order.status}</span>
                  </div>

                  <ul className="order-items-sublist">
                    {order.items.map((item, index) => {
                      const unitPrice = Number(item.unit_price);
                      const originalPrice = Number(item.original_price);
                      const hasDiscount = item.discount_percent > 0 && originalPrice > unitPrice;

                      return (
                        <li key={index}>
                          <span>
                            {item.name} ({item.code})
                          </span>
                          <span className="order-item-price">
                            {hasDiscount && <span className="old-price">{originalPrice} ₽ </span>}
                            {item.quantity} шт. × {unitPrice} ₽ ={' '}
                            <strong>{unitPrice * item.quantity} ₽</strong>
                            {hasDiscount && (
                              <span className="order-item-discount">
                                {' '}
                                (скидка {item.discount_percent}%)
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="order-footer">
                    <span>
                      Итого к оплате: <strong>{order.final_amount} ₽</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
