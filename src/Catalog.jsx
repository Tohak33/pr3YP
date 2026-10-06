import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { CartContext } from './CartContext';
import CategoryAside from './CategoryAside';
import ProductCard from './ProductCard';
import { getServices, getCategories } from './api-services';

export default function Catalog() {
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const servicesData = await getServices();
        setServices(servicesData);

        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCategoryToggle = (id) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter((item) => item !== id));
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSearch('');
  };

  const handleAddToCart = (product) => {
    if (!user) {
      navigate('/login');
      return;
    }

    addToCart(product);
  };

  const filteredServices = services.filter((item) => {
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(item.category_id);

    const text = `${item.name} ${item.code}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase().trim());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="catalog-layout">
      <CategoryAside
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={handleCategoryToggle}
      />

      <main className="catalog-main">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Поиск по названию или коду..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && <div className="info-message">Загрузка данных с API...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && filteredServices.length === 0 && (
          <div className="empty-message">
            <p>По вашему запросу товары не найдены.</p>
            <button className="btn-small" onClick={handleResetFilters}>
              Сбросить поиск и фильтры
            </button>
          </div>
        )}

        <div className="product-grid">
          {filteredServices.map((item) => (
            <ProductCard key={item.id} product={item} user={user} onAddToCart={handleAddToCart} />
          ))}
        </div>
      </main>
    </div>
  );
}
