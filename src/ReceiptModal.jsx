export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const productDiscount = receipt.total_initial - receipt.total_with_product_discounts;

  const hideBrokenImage = (e) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div className="modal-backdrop">
      <div className="receipt-card">
        <h2>Электронный чек</h2>
        <p>
          Заказ №: <strong>{receipt.order_number}</strong>
        </p>
        <p>Дата: {new Date(receipt.date).toLocaleString()}</p>
        <p>Адрес доставки: {receipt.delivery_address}</p>
        <hr />

        <div className="receipt-items-list">
          {receipt.items.map((item) => (
            <div key={item.id} className="receipt-item-row">
              <img
                src={item.image_url}
                alt={item.name}
                className="receipt-thumb"
                onError={hideBrokenImage}
              />
              <span className="receipt-item-name">
                {item.name} × {item.quantity}
              </span>
              <strong>{item.price * item.quantity} ₽</strong>
            </div>
          ))}
        </div>
        <hr />

        <div className="receipt-totals">
          <div className="total-line">
            <span>Первоначальная сумма (без скидок):</span>
            <span>{receipt.total_initial} ₽</span>
          </div>

          {productDiscount > 0 && (
            <div className="total-line discount-line">
              <span>Скидки на товары:</span>
              <span>-{productDiscount} ₽</span>
            </div>
          )}

          {receipt.personal_discount > 0 && (
            <div className="total-line discount-line">
              <span>
                Персональная скидка ({receipt.coupon_code} {receipt.personal_discount}%):
              </span>
              <span>-{receipt.personal_discount_amount} ₽</span>
            </div>
          )}

          <div className="total-line final-line">
            <span>Итог к оплате:</span>
            <span>{receipt.final_amount} ₽</span>
          </div>
        </div>

        <button className="btn-close-receipt" onClick={onClose}>
          Закрыть чек
        </button>
      </div>
    </div>
  );
}
