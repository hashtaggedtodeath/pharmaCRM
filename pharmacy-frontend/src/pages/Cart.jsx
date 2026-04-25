import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const Cart = () => {
    const [cartItems, setCartItems] = useState([]);
    const [deliveryMethod, setDeliveryMethod] = useState('Самовывоз');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [totalSum, setTotalSum] = useState(0);
    
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const fetchCart = async () => {
        try {
            const response = await axiosInstance.get('/cart');
            setCartItems(response.data);
            const sum = response.data.reduce((acc, item) => acc + item.TotalPrice, 0);
            setTotalSum(sum);
        } catch (err) {
            console.error('Ошибка при загрузке корзины', err);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchCart();
    }, [user, navigate]);

    // НОВАЯ ФУНКЦИЯ: Изменение количества (+ / -)
    const handleUpdateQuantity = async (cartItemId, action) => {
        try {
            await axiosInstance.put(`/cart/${cartItemId}`, { action });
            fetchCart(); 
        } catch (err) {
            // ЛОВИМ ОШИБКУ ОТ БЭКЕНДА И ВЫВОДИМ ЕЁ!
            if (err.response && err.response.data.message) {
                alert(err.response.data.message);
            } else {
                console.error('Ошибка обновления количества', err);
            }
        }
    };

    const handleRemove = async (cartItemId) => {
        try {
            await axiosInstance.delete(`/cart/${cartItemId}`);
            fetchCart();
        } catch (err) {
            console.error('Ошибка удаления', err);
        }
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) {
            alert('Корзина пуста!');
            return;
        }

        try {
            await axiosInstance.post('/orders', {
                DeliveryMethod: deliveryMethod,
                DeliveryAddress: deliveryMethod === 'Курьер' ? deliveryAddress : null
            });
            alert('Заказ успешно оформлен!');
            navigate('/');
        } catch (err) {
            console.error('Ошибка оформления заказа', err);
            alert('Не удалось оформить заказ.');
        }
    };

    // Стили для маленьких кнопок + и -
    const btnStyle = { padding: '5px 10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px' };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>Ваша Корзина</h1>

            {cartItems.length === 0 ? (
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>Корзина пока пуста</h3>
                    <button onClick={() => navigate('/')} style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Вернуться в каталог
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        {cartItems.map(item => (
                            <div key={item.CartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '15px 0' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>{item.Name}</h4>
                                    <span style={{ color: '#666' }}>Цена за шт: {item.SellingPrice} ₽</span>
                                </div>
                                
                                {/* НОВЫЙ БЛОК: Управление количеством */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '30px' }}>
                                    <button onClick={() => handleUpdateQuantity(item.CartItemId, 'decrease')} style={btnStyle}>-</button>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.Quantity} шт.</span>
                                    <button onClick={() => handleUpdateQuantity(item.CartItemId, 'increase')} style={btnStyle}>+</button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <strong style={{ fontSize: '18px', minWidth: '80px', textAlign: 'right' }}>{item.TotalPrice} ₽</strong>
                                    <button onClick={() => handleRemove(item.CartItemId)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div style={{ textAlign: 'right', marginTop: '20px', fontSize: '20px' }}>
                            Итого к оплате: <strong>{totalSum} ₽</strong>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginBottom: '15px' }}>Оформление заказа</h3>
                        <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Способ доставки:</label>
                                <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                    <option value="Самовывоз">Самовывоз из аптеки</option>
                                    <option value="Курьер">Доставка курьером</option>
                                </select>
                            </div>
                            {deliveryMethod === 'Курьер' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Адрес доставки:</label>
                                    <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required placeholder="Город, Улица, Дом, Квартира" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                            )}
                            <button type="submit" style={{ padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
                                Подтвердить заказ
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default Cart;