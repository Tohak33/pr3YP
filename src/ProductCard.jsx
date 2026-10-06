export default function ProductCard({ product, user, onAddToCart }) {
  const discount = product.discount_percent || 0;
  const originalPrice = Number(product.price);
  const finalPrice = discount > 0 ? Math.round(originalPrice * (1 - discount / 100)) : originalPrice;

  const hideBrokenImage = (e) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        <div className="product-image-placeholder">
          <span>{product.name}</span>
          <span className="placeholder-code">{product.code}</span>
        </div>
        <img src={product.image_url} alt={product.name} onError={hideBrokenImage} />
        {discount > 0 && <span className="discount-tag">-{discount}%</span>}
      </div>

      <div className="product-info">
        <span className="product-code">Код: {product.code}</span>
        <h4 className="product-title">{product.name}</h4>
        <p className="product-desc">{product.description}</p>
        <span className="product-duration">{product.duration}</span>

        <div className="price-row">
          {discount > 0 && <span className="old-price">{originalPrice} ₽</span>}
          <span className="current-price">{finalPrice} ₽</span>
        </div>
      </div>

      {user?.role !== 'admin' && (
        <button className="btn-add-cart" onClick={() => onAddToCart(product)}>
          {user ? 'В корзину' : 'Войдите для покупки'}
        </button>
      )}
    </div>
  );
}
