import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axiosInstance.post('/auth/register', formData);
            setSuccess('Регистрация успешна! Сейчас вы будете перенаправлены на страницу входа.');
            
            // Ждем 2 секунды, чтобы юзер прочитал сообщение, и кидаем на логин
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Ошибка при регистрации');
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация</h2>
            
            {error && <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '15px', textAlign: 'center' }}>{success}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label>ФИО:</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required 
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required 
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label>Телефон:</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} 
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label>Пароль:</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required 
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
                    Зарегистрироваться
                </button>
            </form>
        </div>
    );
};

export default Register;