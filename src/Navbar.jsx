import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { CartContext } from './CartContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/">DeviceStore</Link>
      </div>
      <nav className="nav-links">
        <Link to="/">Каталог</Link>

        {user && !isAdmin && (
          <Link to="/cart">Корзина {totalCount > 0 && <span className="badge">{totalCount}</span>}</Link>
        )}

        {isAdmin && <Link to="/admin">Панель управления</Link>}

        {user ? (
          <>
            <Link to="/profile">Профиль</Link>
            <button className="btn-logout" onClick={handleLogout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Вход</Link>
            <Link to="/register">Регистрация</Link>
          </>
        )}
      </nav>
    </header>
  );
}
