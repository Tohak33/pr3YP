export default function ProductCard({ product, user, onAddToCart }) {
  const discount = product.discount_percent || 0;
  const originalPrice = Number(product.price);

  function calculateFinalPrice() {
    if (discount > 0) {
      return Math.round(originalPrice * (1 - discount / 100));
    }
    return originalPrice;
  }

  function renderDiscountTag() {
    if (discount > 0) {
      return <span className="discount-tag">-{discount}%</span>;
    }
    return null;
  }

  function renderOldPrice() {
    if (discount > 0) {
      return <span className="old-price">{originalPrice} ₽</span>;
    }
    return null;
  }

  function renderCartButton() {
    if (user?.role === 'admin') {
      return null;
    }

    let buttonText = 'Войдите для покупки';
    if (user) {
      buttonText = 'В корзину';
    }

    return (
      <button className="btn-add-cart" onClick={() => onAddToCart(product)}>
        {buttonText}
      </button>
    );
  }

  return (
    <div className="product-card">
      <div className="product-image-container">
        <img src={product.image_url} alt={product.name} />
        {renderDiscountTag()}
      </div>

      <div className="product-info">
        <span className="product-code">Код: {product.code}</span>
        <h4 className="product-title">{product.name}</h4>
        <p className="product-desc">{product.description}</p>
        <span className="product-duration">{product.duration}</span>

        <div className="price-row">
          {renderOldPrice()}
          <span className="current-price">{calculateFinalPrice()} ₽</span>
        </div>
      </div>

      {renderCartButton()}
    </div>
  );
}
