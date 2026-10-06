export default function CategoryAside({ categories, selectedCategories, onToggleCategory }) {
  return (
    <aside className="catalog-aside">
      <h3>Категории</h3>
      <div className="category-checkbox-list">
        {categories.map((cat) => (
          <label key={cat.id} className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat.id)}
              onChange={() => onToggleCategory(cat.id)}
            />
            <span>{cat.name}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}
