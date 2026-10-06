import { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { CartContext } from './CartContext';
import ReceiptModal from './ReceiptModal';
import SessionWarning from './SessionWarning';
import { createOrder } from './api-orders';

export default function Cart() {
  const { user } = useContext(AuthContext);
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useContext(CartContext);

  const [address, setAddress] = useState(user ? user.address || '' : '');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.price) * item.quantity;
    const discount = item.discount_percent || 0;
    return sum + price - (price * discount) / 100;
  }, 0);

  const subtotalWithoutDiscounts = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const personalDiscount = user.personal_discount || 0;
  const total = Math.round(subtotal - (subtotal * personalDiscount) / 100);
  const productDiscountAmount = Math.round(subtotalWithoutDiscounts - subtotal);
  const personalDiscountAmount = Math.round(subtotal - total);
  const totalSaved = subtotalWithoutDiscounts - total;

  const handleCheckout = async () => {
    setError(null);

    if (!address.trim()) {
      setError('Укажите адрес доставки');
      return;
    }

    setLoading(true);

    try {
      const data = await createOrder({
        userId: user.id,
        delivery_address: address.trim(),
        items: cartItems
      });
      clearCart();
      setReceipt(data.receipt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-page">
      <SessionWarning />
      <h2>Ваша корзина</h2>
      {error && <div className="error-message">{error}</div>}

      {cartItems.length === 0 ? (
        <p className="empty-message">В корзине пока нет товаров.</p>
      ) : (
        <div className="cart-content">
          <div className="cart-items-table">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item-row">
                <img src={item.image_url} alt={item.name} className="cart-item-img" />

                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <span className="cart-item-code">Код: {item.code}</span>
                  <div className="cart-item-price">{Number(item.price)} ₽</div>
                </div>

                <div className="quantity-controls">
                  <button onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                </div>

                <button className="btn-remove" onClick={() => removeFromCart(item.id)}>
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <div className="checkout-sidebar">
            <h3>Оформление заказа</h3>

            <div className="form-group">
              <label>Адрес доставки (из профиля):</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
            </div>

            <div className="summary-block">
              <div className="summary-row">
                <span>Сумма без скидок:</span>
                <span>{subtotalWithoutDiscounts} ₽</span>
              </div>

              {productDiscountAmount > 0 && (
                <div className="summary-row discount-info">
                  <span>Скидки на товары:</span>
                  <span>-{productDiscountAmount} ₽</span>
                </div>
              )}

              {personalDiscount > 0 && (
                <div className="summary-row discount-info">
                  <span>
                    Персональная скидка ({user.coupon_code} {personalDiscount}%):
                  </span>
                  <span>-{personalDiscountAmount} ₽</span>
                </div>
              )}

              <div className="summary-row total-row">
                <span>Итог к оплате:</span>
                <strong>{total} ₽</strong>
              </div>

              {totalSaved > 0 && (
                <div className="summary-row">
                  <span>Общая выгода:</span>
                  <span>{totalSaved} ₽</span>
                </div>
              )}
            </div>

            <button className="btn-primary btn-checkout" disabled={loading} onClick={handleCheckout}>
              {loading ? 'Оформление...' : 'Оформить заказ'}
            </button>
          </div>
        </div>
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
