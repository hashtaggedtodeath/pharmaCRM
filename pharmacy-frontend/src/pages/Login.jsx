import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login } = useContext(AuthContext); // Берем функцию login из контекста
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); // Останавливаем перезагрузку страницы при отправке формы
        setError(''); // Очищаем старые ошибки

        try {
            // Отправляем запрос на бэкенд
            const response = await axiosInstance.post('/auth/login', {
                email,
                password
            });

            // Если всё ок, сохраняем юзера и токен в контекст (и LocalStorage)
            login(response.data.user, response.data.token);
            
            // Перенаправляем на главную страницу (каталог)
            navigate('/');
        } catch (err) {
            // Если бэкенд вернул ошибку (например, неверный пароль)
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Ошибка при подключении к серверу');
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Вход в систему</h2>
            
            {error && <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label>Email:</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>
                <div>
                    <label>Пароль:</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
                    Войти
                </button>
            </form>
        </div>
    );
};

export default Login;