import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const Profile = () => {
    const [orders, setOrders] = useState([]);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Загружаем историю заказов
        const fetchOrders = async () => {
            try {
                const response = await axiosInstance.get('/orders/my');
                setOrders(response.data);
            } catch (err) {
                console.error('Ошибка при загрузке истории заказов', err);
            }
        };

        fetchOrders();
    }, [user, navigate]);

    // Функция "Повторить заказ"
    const handleRepeatOrder = async (orderId) => {
        try {
            await axiosInstance.post(`/orders/${orderId}/repeat`);
            alert('Товары добавлены в корзину!');
            navigate('/cart'); // Сразу перекидываем в корзину
        } catch (err) {
            console.error('Ошибка при повторении заказа', err);
            alert('Не удалось повторить заказ.');
        }
    };

    // Функция для красивого форматирования даты
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>Личный кабинет</h1>
            
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <h2>Ваши данные</h2>
                <p><strong>ФИО:</strong> {user?.fullName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
            </div>

            <h2>История заказов</h2>
            {orders.length === 0 ? (
                <p>У вас пока нет заказов.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                    {orders.map(order => (
                        <div key={order.Id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ marginBottom: '10px' }}>Заказ №{order.Id}</h3>
                        <p style={{ margin: '5px 0', color: '#555' }}>Дата: {formatDate(order.OrderDate)}</p>
                        <p style={{ margin: '5px 0', color: '#555' }}>Доставка: {order.DeliveryMethod} {order.DeliveryAddress ? `(${order.DeliveryAddress})` : ''}</p>
                        <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Итоговая сумма: {order.TotalAmount} ₽</p>
                        <p style={{ margin: '5px 0' }}>
                            Статус: 
                            <span style={{ 
                                marginLeft: '10px', padding: '3px 8px', borderRadius: '4px', fontSize: '14px',
                                backgroundColor: order.Status === 'Новый' ? '#ffc107' : order.Status === 'Отменен' ? '#dc3545' : '#28a745',
                                color: order.Status === 'Новый' ? 'black' : 'white'
                            }}>
                                {order.Status}
                            </span>
                        </p>
                    </div>
                    <div>
                        <button 
                            onClick={() => handleRepeatOrder(order.Id)}
                            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Повторить заказ
                        </button>
                    </div>
                </div>

                {/* НОВЫЙ БЛОК: СОСТАВ ЗАКАЗА */}
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />
                <h4 style={{ marginBottom: '10px', color: '#333' }}>Состав заказа:</h4>
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {order.Items && order.Items.map((item, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #eee' }}>
                            <span>
                                {item.Name} <span style={{ color: '#888', marginLeft: '10px' }}>x {item.Quantity} шт.</span>
                            </span>
                            <span style={{ fontWeight: 'bold', color: '#555' }}>
                                {item.PriceAtPurchase * item.Quantity} ₽
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
                        
                    ))}
                </div>
            )}
        </div>
    );
};

export default Profile;