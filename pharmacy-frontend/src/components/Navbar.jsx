import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login'); // Перекидываем на страницу логина после выхода
    };

    return (
        <nav style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '15px 30px', 
            backgroundColor: '#007bff', 
            color: 'white',
            alignItems: 'center'
        }}>
            <div>
                <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
                    💊 Аптека Онлайн
                </Link>
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Каталог</Link>
                
                {/* Если пользователь АВТОРИЗОВАН */}
                {user ? (
                    <>
                        {user.role === 'Admin' && (
                            <Link to="/admin" style={{ color: '#ffc107', textDecoration: 'none', fontWeight: 'bold' }}>
                                Панель Администратора
                            </Link>
                        )}
                        {user.role === 'User' && (
                            <Link to="/cart" style={{ color: 'white', textDecoration: 'none' }}>Корзина</Link>
                        )}
                        <Link to="/profile" style={{ marginLeft: '10px', color: 'white', textDecoration: 'underline', cursor: 'pointer' }}>
                        Личный кабинет ({user.fullName})
                        </Link>
                        <button 
                            onClick={handleLogout} 
                            style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: 'white', border: 'none', borderRadius: '4px' }}
                        >
                            Выйти
                        </button>
                    </>
                ) : (
                    /* Если пользователь ГОСТЬ */
                    <>
                        <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>Войти</Link>
                        <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>Регистрация</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;