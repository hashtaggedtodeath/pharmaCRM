import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]); 
    const [searchTerm, setSearchTerm] = useState(''); // Для поиска
    const [sortOrder, setSortOrder] = useState('asc'); // Для сортировки
    const [selectedCategory, setSelectedCategory] = useState(''); // Для фильтрации
    
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Загружаем товары при открытии страницы
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axiosInstance.get('/products');
                setProducts(response.data);
                const catRes = await axiosInstance.get('/products/categories');
                setCategories(catRes.data);
            } catch (err) {
                console.error('Ошибка при загрузке товаров:', err);
            }
        };
        fetchProducts();
    }, []);

    // Функция добавления в корзину
    const handleAddToCart = async (productId) => {
        // ТРЕБОВАНИЕ ДИПЛОМА: Если гость - кидаем на логин
        if (!user) {
            alert('Для добавления товара в корзину необходимо авторизоваться!');
            navigate('/login');
            return;
        }

        try {
            await axiosInstance.post('/cart', { ProductId: productId, Quantity: 1 });
            alert('Товар успешно добавлен в корзину!');
        } catch (err) {
            console.error('Ошибка добавления в корзину', err);
            alert('Не удалось добавить товар в корзину');
        }
    };

    // Логика поиска и сортировки (работает прямо на фронтенде)
    const filteredAndSortedProducts = products
        .filter(p => p.Name.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(p => selectedCategory === '' || p.CategoryId === parseInt(selectedCategory)) // <--- ФИЛЬТР КАТЕГОРИЙ
        .sort((a, b) => {
            if (sortOrder === 'asc') return a.SellingPrice - b.SellingPrice;
            if (sortOrder === 'desc') return b.SellingPrice - a.SellingPrice;
            return 0;
        });

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>Каталог препаратов</h1>

            {/* БЛОК ПОИСКА, ФИЛЬТРА И СОРТИРОВКИ */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input 
                    type="text" placeholder="Поиск по названию..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '10px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                
                {/* НОВЫЙ ВЫПАДАЮЩИЙ СПИСОК ФИЛЬТРАЦИИ */}
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="">Все категории</option>
                    {categories.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                </select>

                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="asc">Сначала дешевые</option>
                    <option value="desc">Сначала дорогие</option>
                </select>
            </div>

            {/* Сетка товаров */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {filteredAndSortedProducts.length > 0 ? (
                    filteredAndSortedProducts.map(product => (
                        <div key={product.Id} style={{ 
                            backgroundColor: 'white', padding: '15px', borderRadius: '8px', 
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                        }}>
                            <div>
                                {/* ВЫВОД КАРТИНКИ */}
                                <div style={{ height: '150px', backgroundColor: '#f8f9fa', borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {product.ImageUrl ? (
                                        <img src={product.ImageUrl} alt={product.Name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <span style={{ fontSize: '40px' }}>💊</span> /* Заглушка, если нет картинки */
                                    )}
                                </div>
                                
                                <h3 style={{ marginBottom: '10px', color: '#007bff' }}>{product.Name}</h3>
                                <p style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>МНН: {product.INN}</p>
                                
                                <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Остаток: <strong style={{ color: product.StockQuantity > 0 ? 'green' : 'red' }}>{product.StockQuantity} шт.</strong></p>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{product.SellingPrice} ₽</span>
                                    <button 
                                        onClick={() => handleAddToCart(product.Id)}
                                        disabled={product.StockQuantity <= 0}
                                        style={{ 
                                            padding: '8px 15px', 
                                            backgroundColor: product.StockQuantity > 0 ? '#28a745' : '#ccc', 
                                            color: 'white', border: 'none', borderRadius: '4px', 
                                            cursor: product.StockQuantity > 0 ? 'pointer' : 'not-allowed' 
                                        }}
                                    >
                                        {product.StockQuantity > 0 ? 'В корзину' : 'Нет в наличии'}
                                    </button>
                                </div>
                                
                                {/* НОВАЯ КНОПКА ПОДРОБНЕЕ */}
                                <button 
                                    onClick={() => navigate(`/product/${product.Id}`)}
                                    style={{ 
                                        padding: '8px', 
                                        backgroundColor: '#f8f9fa', 
                                        color: '#007bff', 
                                        border: '1px solid #007bff', 
                                        borderRadius: '4px', 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    Подробнее
                                </button>
                            </div>
                        </div>
                        
                    ))
                ) : (
                    <p>Товары не найдены...</p>
                )}
            </div>
        </div>
    );
};

export default Home;