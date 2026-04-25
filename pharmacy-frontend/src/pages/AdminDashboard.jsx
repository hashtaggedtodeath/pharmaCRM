import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Вкладки: orders, inventory, addProduct, allProducts
    const [activeTab, setActiveTab] = useState('orders'); 
    const [orders, setOrders] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    
    // CRUD Состояния
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null); // Хранит товар, который мы сейчас редактируем
    // Справочники
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    
    const [newCatName, setNewCatName] = useState('');
    const [newSupplier, setNewSupplier] = useState({ Name: '', ContactInfo: '' });

    // Состояния для Приемки
    const [receipts, setReceipts] = useState([]);
    const [newReceipt, setNewReceipt] = useState({ SupplierId: '', ProductId: '', Quantity: '', PurchasePrice: '' });

    // Состояния для статистики
    const [salesStats, setSalesStats] = useState([]);
    const [popularStats, setPopularStats] = useState([]);
    // Даты для фильтра статистики
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    
    const [newProduct, setNewProduct] = useState({
        CategoryId: 1, Name: '', INN: '', Form: '', Dosage: '', Manufacturer: '', PurchasePrice: '', SellingPrice: '', ImageUrl: '', StockQuantity: '', MinStockThreshold: 10, ExpirationDate: '', Characteristics: []
    });

    useEffect(() => {
        if (!user || user.role !== 'Admin') {
            navigate('/'); return;
        }
        fetchOrders();
        fetchLowStock();
        fetchAllProducts();
        fetchDictionaries();
    }, [user, navigate]);

    const fetchOrders = async () => {
        try { const res = await axiosInstance.get('/admin/orders'); setOrders(res.data); } catch (err) {}
    };

    const fetchLowStock = async () => {
        try { const res = await axiosInstance.get('/admin/reports/low-stock'); setLowStock(res.data); } catch (err) {}
    };

    const fetchAllProducts = async () => {
        try { const res = await axiosInstance.get('/products'); setProducts(res.data); } catch (err) {}
    };

    const fetchDictionaries = async () => {
        try {
            const catRes = await axiosInstance.get('/admin/categories');
            setCategories(catRes.data);
            const supRes = await axiosInstance.get('/admin/suppliers');
            setSuppliers(supRes.data);
        } catch (err) { console.error('Ошибка загрузки справочников'); }
    };

    const fetchReceipts = async () => {
        try {
            const res = await axiosInstance.get('/admin/receipts');
            setReceipts(res.data);
        } catch (err) { console.error('Ошибка загрузки поступлений'); }
    };

    const fetchStatistics = async () => {
            try {
                // Передаем даты как query параметры
                const resSales = await axiosInstance.get('/admin/reports/sales-by-time', {
                    params: { startDate, endDate }
                });
                setSalesStats(resSales.data);
                
                const resPop = await axiosInstance.get('/admin/reports/popular-products');
                setPopularStats(resPop.data);
            } catch (err) { console.error('Ошибка загрузки статистики'); }
        };

    // Вызываем загрузку при изменении дат
    useEffect(() => {
        if (activeTab === 'statistics') {
            fetchStatistics();
        }
    }, [startDate, endDate]);

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    
    // Управление характеристиками в формах
    const addCharRow = (isEdit) => {
        if (isEdit) setEditingProduct({...editingProduct, Characteristics: [...editingProduct.Characteristics, { Name: '', Value: '' }]});
        else setNewProduct({...newProduct, Characteristics: [...newProduct.Characteristics, { Name: '', Value: '' }]});
    };

    const updateCharRow = (index, field, value, isEdit) => {
        if (isEdit) {
            const newChars = [...editingProduct.Characteristics];
            newChars[index][field] = value;
            setEditingProduct({...editingProduct, Characteristics: newChars});
        } else {
            const newChars = [...newProduct.Characteristics];
            newChars[index][field] = value;
            setNewProduct({...newProduct, Characteristics: newChars});
        }
    };

    const removeCharRow = (index, isEdit) => {
        if (isEdit) {
            const newChars = editingProduct.Characteristics.filter((_, i) => i !== index);
            setEditingProduct({...editingProduct, Characteristics: newChars});
        } else {
            const newChars = newProduct.Characteristics.filter((_, i) => i !== index);
            setNewProduct({...newProduct, Characteristics: newChars});
        }
    };

    // --- ФУНКЦИИ CRUD ---
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/products', newProduct);
            alert('Товар успешно добавлен!');
            setNewProduct({ CategoryId: 1, Name: '', INN: '', Form: '', Dosage: '', Manufacturer: '', PurchasePrice: '', SellingPrice: '', ImageUrl: '', StockQuantity: '', MinStockThreshold: '', ExpirationDate: '', Characteristics: []});
            fetchAllProducts(); // Обновляем список
            fetchLowStock();
        } catch (err) { alert('Ошибка при добавлении товара'); }
    };

    

    const handleEditClick = async (product) => {
        try {
            const res = await axiosInstance.get(`/products/characteristics/${product.Id}`);
            setEditingProduct({ ...product, Characteristics: res.data });
        } catch (err) {
            console.error('Ошибка загрузки характеристик', err);
            setEditingProduct({ ...product, Characteristics: [] });
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) return;
        try {
            await axiosInstance.delete(`/products/${id}`);
            alert('Товар удален!');
            fetchAllProducts();
            fetchLowStock();
        } catch (err) {
            if (err.response && err.response.data.message) alert(err.response.data.message);
            else alert('Ошибка при удалении');
        }
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.put(`/products/${editingProduct.Id}`, editingProduct);
            alert('Товар успешно обновлен!');
            setEditingProduct(null); // Закрываем форму редактирования
            fetchAllProducts();
            fetchLowStock();
        } catch (err) { alert('Ошибка при обновлении'); }
    };

    // --- ОСТАЛЬНЫЕ ФУНКЦИИ ---
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await axiosInstance.put(`/admin/orders/${orderId}/status`, { Status: newStatus });
            alert('Статус обновлен!'); fetchOrders();
        } catch (err) { alert('Ошибка при обновлении статуса'); }
    };

    const downloadExcel = async () => {
        try {
            const response = await axiosInstance.get('/admin/reports/export-stock-excel', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url; link.setAttribute('download', 'Отчет_по_остаткам.xlsx');
            document.body.appendChild(link); link.click();
        } catch (err) { alert('Ошибка при скачивании отчета'); }
    };

    const downloadPDF = async () => {
        try {
            const response = await axiosInstance.get('/admin/reports/export-stock-pdf', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url; 
            link.setAttribute('download', 'Отчет_по_остаткам.pdf');
            document.body.appendChild(link); 
            link.click();
        } catch (err) { 
            alert('Ошибка при скачивании PDF отчета'); 
        }
    };


    // Универсальная функция для скачивания файлов (теперь принимает params)
    const downloadReport = async (url, filename, params = {}) => {
        try {
            const response = await axiosInstance.get(url, { 
                responseType: 'blob', 
                params: params // <--- ПЕРЕДАЕМ ДАТЫ НА БЭКЕНД
            });
            const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = downloadUrl; 
            link.setAttribute('download', filename);
            document.body.appendChild(link); 
            link.click();
        } catch (err) { alert('Ошибка при скачивании отчета'); }
    };

    const tabStyle = (tabName) => ({
        padding: '10px 20px', cursor: 'pointer', border: 'none',
        backgroundColor: activeTab === tabName ? '#007bff' : '#e9ecef',
        color: activeTab === tabName ? 'white' : 'black',
        fontWeight: 'bold', borderRadius: '4px 4px 0 0'
    });

    const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px', color: '#dc3545' }}>Панель Администратора</h1>

            <div style={{ display: 'flex', gap: '5px', borderBottom: '2px solid #007bff', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('orders')} style={tabStyle('orders')}>Заказы</button>
                <button onClick={() => setActiveTab('inventory')} style={tabStyle('inventory')}>Склад и Отчеты</button>
                <button onClick={() => setActiveTab('addProduct')} style={tabStyle('addProduct')}>Добавить товар</button>
                <button onClick={() => { setActiveTab('allProducts'); setEditingProduct(null); }} style={tabStyle('allProducts')}>Управление товарами</button>
                <button onClick={() => { setActiveTab('categories'); fetchDictionaries(); }} style={tabStyle('categories')}>Категории</button>
                <button onClick={() => { setActiveTab('suppliers'); fetchDictionaries(); }} style={tabStyle('suppliers')}>Поставщики</button>
                <button onClick={() => { setActiveTab('receipts'); fetchDictionaries(); fetchAllProducts(); fetchReceipts(); }} style={tabStyle('receipts')}>Приемка товара</button>
                <button onClick={() => { setActiveTab('statistics'); fetchStatistics(); }} style={tabStyle('statistics')}>Статистика продаж</button>
            </div>

            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '0 0 8px 8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                
                {/* Вкладка 1: ЗАКАЗЫ (Осталась без изменений) */}
                {activeTab === 'orders' && (
                    <div>
                        <h2>Управление заказами</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>ID</th>
                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Дата</th>
                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Сумма</th>
                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Статус</th>
                                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Действие</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.Id}>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{order.Id}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{new Date(order.OrderDate).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{order.TotalAmount} ₽</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>{order.Status}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                            <select value={order.Status} onChange={(e) => handleStatusChange(order.Id, e.target.value)} style={{ padding: '5px' }}>
                                                <option value="Новый">Новый</option>
                                                <option value="В обработке">В обработке</option>
                                                <option value="Готов к выдаче">Готов к выдаче</option>
                                                <option value="Выполнен">Выполнен</option>
                                                <option value="Отменен">Отменен</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Вкладка 2: СКЛАД (Осталась без изменений) */}
                {activeTab === 'inventory' && (
                    <div>
                        <h2>Учет остатков</h2>
                         <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '5px'}}>
                            
                            <button onClick={downloadExcel} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📊 Экспорт в Excel</button>
                            <button onClick={downloadPDF} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 Экспорт в PDF</button>
                        </div>
                        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px', borderLeft: '5px solid #ffc107' }}>
                            <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>⚠️ Заканчивающиеся товары</h3>
                            {lowStock.length === 0 ? <p>Все в норме.</p> : (
                                <ul>{lowStock.map(item => <li key={item.Id} style={{ color: 'red', fontWeight: 'bold', listStyle: "none"}}>{item.Name} — осталось: {item.StockQuantity} шт.</li>)}</ul>
                            )}
                        </div>
                    </div>
                )}

                {/* Вкладка 3: ДОБАВИТЬ ТОВАР (Осталась без изменений) */}
                {activeTab === 'addProduct' && (
                    <div>
                        <h2>Добавление нового препарата</h2>
                        <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <input type="text" placeholder="Название" required value={newProduct.Name} onChange={e => setNewProduct({...newProduct, Name: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="МНН" value={newProduct.INN} onChange={e => setNewProduct({...newProduct, INN: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Форма" value={newProduct.Form} onChange={e => setNewProduct({...newProduct, Form: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Производитель" value={newProduct.Manufacturer} onChange={e => setNewProduct({...newProduct, Manufacturer: e.target.value})} style={inputStyle} />
                            <input type="number" placeholder="Закупка" required value={newProduct.PurchasePrice} onChange={e => setNewProduct({...newProduct, PurchasePrice: e.target.value})} style={inputStyle} />
                            <input type="number" placeholder="Продажа" required value={newProduct.SellingPrice} onChange={e => setNewProduct({...newProduct, SellingPrice: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Дозировка" value={newProduct.Dosage} onChange={e => setNewProduct({...newProduct, Dosage: e.target.value})} style={inputStyle} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '12px', color: '#666' }}>Срок годности</label>
                                <input type="date" required value={newProduct.ExpirationDate} onChange={e => setNewProduct({...newProduct, ExpirationDate: e.target.value})} style={inputStyle} />
                            </div>
                            <input type="text" placeholder="URL картинки" value={newProduct.ImageUrl} onChange={e => setNewProduct({...newProduct, ImageUrl: e.target.value})} style={inputStyle} />
                            <input type="number" placeholder="Порог уведомления (шт)" required value={newProduct.MinStockThreshold} onChange={e => setNewProduct({...newProduct, MinStockThreshold: Number(e.target.value)})} style={inputStyle} />
                            <select value={newProduct.CategoryId} onChange={e => setNewProduct({...newProduct, CategoryId: Number(e.target.value)})} style={inputStyle}>
                                <option value={1}>Антибиотики (по умолчанию)</option>
                                {categories.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                            </select>
                            <div style={{ gridColumn: 'span 2', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 style={{ margin: 0 }}>Характеристики (необязательно)</h4>
                                    <button type="button" onClick={() => addCharRow(false)} style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Добавить свойство</button>
                                </div>
                                
                                {newProduct.Characteristics.map((char, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <input type="text" placeholder="Название (напр. 'Показания')" value={char.Name} onChange={e => updateCharRow(index, 'Name', e.target.value, false)} style={{...inputStyle, flex: 1}} required />
                                        <input type="text" placeholder="Значение" value={char.Value} onChange={e => updateCharRow(index, 'Value', e.target.value, false)} style={{...inputStyle, flex: 2}} required />
                                        <button type="button" onClick={() => removeCharRow(index, false)} style={{ padding: '8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✖</button>
                                    </div>
                                ))}
                            </div>
                            <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>Добавить</button>
                        </form>
                    </div>
                )}

                {/* НОВАЯ Вкладка 4: УПРАВЛЕНИЕ ВСЕМИ ТОВАРАМИ (CRUD) */}
                {activeTab === 'allProducts' && (
                    <div>
                        {editingProduct ? (
                            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                <h2>Редактирование: {editingProduct.Name}</h2>
                                <form onSubmit={handleUpdateProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                    <div><label>Название</label><input type="text" value={editingProduct.Name} onChange={e => setEditingProduct({...editingProduct, Name: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>МНН</label><input type="text" value={editingProduct.INN} onChange={e => setEditingProduct({...editingProduct, INN: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Форма</label><input type="text" value={editingProduct.Form} onChange={e => setEditingProduct({...editingProduct, Form: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Производитель</label><input type="text" value={editingProduct.Manufacturer} onChange={e => setEditingProduct({...editingProduct, Manufacturer: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Закупка</label><input type="number" required value={editingProduct.PurchasePrice} onChange={e => setEditingProduct({...editingProduct, PurchasePrice: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Продажа (₽)</label><input type="number" value={editingProduct.SellingPrice} onChange={e => setEditingProduct({...editingProduct, SellingPrice: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Дозировка</label><input type="text" value={editingProduct.Dosage || ''} onChange={e => setEditingProduct({...editingProduct, Dosage: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Срок годности</label><input type="date" value={formatDateForInput(editingProduct.ExpirationDate)} onChange={e => setEditingProduct({...editingProduct, ExpirationDate: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Остаток (шт) - Только через Приемку</label><input type="number" value={editingProduct.StockQuantity} disabled style={{...inputStyle, width: '100%', backgroundColor: '#e9ecef', cursor: 'not-allowed'}} /></div>
                                    <div><label>Порог уведомлений</label><input type="number" value={editingProduct.MinStockThreshold} onChange={e => setEditingProduct({...editingProduct, MinStockThreshold: Number(e.target.value)})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div><label>Категория</label><select value={editingProduct.CategoryId} onChange={e => setEditingProduct({...editingProduct, CategoryId: Number(e.target.value)})} style={{...inputStyle, width: '100%'}}>{categories.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}</select></div>
                                    <div><label>URL Картинки</label><input type="text" value={editingProduct.ImageUrl || ''} onChange={e => setEditingProduct({...editingProduct, ImageUrl: e.target.value})} style={{...inputStyle, width: '100%'}} /></div>
                                    <div style={{ gridColumn: 'span 2', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0 }}>Характеристики</h4>
                                            <button type="button" onClick={() => addCharRow(true)} style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Добавить свойство</button>
                                        </div>
                                    
                                        {editingProduct.Characteristics.map((char, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                <input type="text" placeholder="Название" value={char.Name} onChange={e => updateCharRow(index, 'Name', e.target.value, true)} style={{...inputStyle, flex: 1}} required />
                                                <input type="text" placeholder="Значение" value={char.Value} onChange={e => updateCharRow(index, 'Value', e.target.value, true)} style={{...inputStyle, flex: 2}} required />
                                                <button type="button" onClick={() => removeCharRow(index, true)} style={{ padding: '8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✖</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Сохранить</button>
                                        <button type="button" onClick={() => setEditingProduct(null)} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Отмена</button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div>
                                <h2>Список всех препаратов</h2>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>ID</th>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Название</th>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Цена</th>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Остаток</th>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Порог</th>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <tr key={product.Id}>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{product.Id}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: 'bold', color: '#007bff' }}>{product.Name}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{product.SellingPrice} ₽</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{product.StockQuantity} шт.</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{product.MinStockThreshold} шт.</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                                    <button onClick={() => handleEditClick(product)} style={{ padding: '5px 10px', marginRight: '5px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️ Изменить</button>
                                                    <button onClick={() => handleDeleteProduct(product.Id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Удалить</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                {/* ВКЛАДКА: КАТЕГОРИИ */}
                {activeTab === 'categories' && (
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', maxWidth: '600px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Категории препаратов</h2>
                        <ul style={{ marginBottom: '20px', paddingLeft: '20px', fontSize: '16px', lineHeight: '1.8' }}>
                            {categories.map(c => (
                                <li key={c.Id}>
                                    {c.Name} 
                                    <button 
                                        onClick={async () => { 
                                            if (!window.confirm('Удалить эту категорию?')) return;
                                            try {
                                                await axiosInstance.delete(`/admin/categories/${c.Id}`); 
                                                fetchDictionaries(); 
                                            } catch (err) {
                                                if (err.response && err.response.data.message) {
                                                    alert(err.response.data.message); // Выведет текст с бэкенда
                                                } else {
                                                    alert('Не удалось удалить категорию.');
                                                }
                                            }
                                        }} 
                                        style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', marginLeft: '10px' }}
                                    >
                                        ✖ Удалить
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                            <input type="text" placeholder="Введите название новой категории" value={newCatName} onChange={e => setNewCatName(e.target.value)} style={{...inputStyle, flex: 1}} />
                            <button onClick={async () => { await axiosInstance.post('/admin/categories', { Name: newCatName }); setNewCatName(''); fetchDictionaries(); }} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Добавить</button>
                        </div>
                    </div>
                )}
                {/* ВКЛАДКА: ПОСТАВЩИКИ */}
                {activeTab === 'suppliers' && (
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', maxWidth: '800px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Поставщики</h2>
                        <ul style={{ marginBottom: '20px', paddingLeft: '20px', fontSize: '16px', lineHeight: '1.8' }}>
                            {suppliers.map(s => (
                                <li key={s.Id} style={{ marginBottom: '10px' }}>
                                    <strong style={{ fontSize: '18px' }}>{s.Name}</strong> <br/>
                                    <span style={{ color: '#666' }}>Контакты: {s.ContactInfo}</span>
                                    <button 
                                        onClick={async () => { 
                                            if (!window.confirm('Удалить этого поставщика?')) return;
                                            try {
                                                await axiosInstance.delete(`/admin/suppliers/${s.Id}`); 
                                                fetchDictionaries(); 
                                            } catch (err) {
                                                if (err.response && err.response.data.message) {
                                                    alert(err.response.data.message);
                                                } else {
                                                    alert('Не удалось удалить поставщика.');
                                                }
                                            }
                                        }} 
                                        style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', marginLeft: '15px' }}
                                    >
                                        ✖ Удалить
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                            <h4>Добавить нового поставщика:</h4>
                            <input type="text" placeholder="Название компании (например, ЗАО Фарма)" value={newSupplier.Name} onChange={e => setNewSupplier({...newSupplier, Name: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Контактные данные (телефон, адрес, email)" value={newSupplier.ContactInfo} onChange={e => setNewSupplier({...newSupplier, ContactInfo: e.target.value})} style={inputStyle} />
                            <button onClick={async () => { await axiosInstance.post('/admin/suppliers', newSupplier); setNewSupplier({ Name: '', ContactInfo: '' }); fetchDictionaries(); }} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start' }}>Добавить поставщика</button>
                        </div>
                    </div>
                )}
                {/* ВКЛАДКА: ПРИЕМКА ТОВАРА (RECEIPTS) */}
                {activeTab === 'receipts' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                        
                        {/* Форма новой приемки */}
                        <div style={{ backgroundColor: '#e9ecef', padding: '20px', borderRadius: '8px', border: '1px solid #ccc' }}>
                            <h3 style={{ marginBottom: '15px' }}>Оформить поступление</h3>
                            
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    await axiosInstance.post('/admin/receipts', newReceipt);
                                    alert('Поступление оформлено! Остатки обновлены.');
                                    setNewReceipt({ SupplierId: '', ProductId: '', Quantity: '', PurchasePrice: '' });
                                    fetchReceipts(); // Обновляем историю
                                    fetchAllProducts();
                                } catch (err) {
                                    alert(err.response?.data?.message || 'Ошибка оформления');
                                }
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                
                                <div>
                                    <label>Поставщик:</label>
                                    <select required value={newReceipt.SupplierId} onChange={e => setNewReceipt({...newReceipt, SupplierId: Number(e.target.value)})} style={{...inputStyle, width: '100%'}}>
                                        <option value="">-- Выберите поставщика --</option>
                                        {suppliers.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label>Товар (препарат):</label>
                                    <select required value={newReceipt.ProductId} onChange={e => setNewReceipt({...newReceipt, ProductId: Number(e.target.value)})} style={{...inputStyle, width: '100%'}}>
                                        <option value="">-- Выберите товар --</option>
                                        {products.map(p => <option key={p.Id} value={p.Id}>{p.Name} (Текущий остаток: {p.StockQuantity})</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label>Количество пришло (шт):</label>
                                    <input type="number" required min="1" value={newReceipt.Quantity} onChange={e => setNewReceipt({...newReceipt, Quantity: Number(e.target.value)})} style={{...inputStyle, width: '100%'}} />
                                </div>

                                <div>
                                    <label>Закупочная цена (за шт):</label>
                                    <input type="number" required min="1" value={newReceipt.PurchasePrice} onChange={e => setNewReceipt({...newReceipt, PurchasePrice: Number(e.target.value)})} style={{...inputStyle, width: '100%'}} />
                                </div>

                                <button type="submit" style={{ padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Провести накладную
                                </button>
                            </form>
                        </div>

                        {/* История приемок */}
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <h3 style={{ marginBottom: '15px' }}>История поступлений</h3>
                            {receipts.length === 0 ? <p>Истории пока нет.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {receipts.map(rec => (
                                        <div key={rec.Id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                                                <strong>Накладная №{rec.Id} от {new Date(rec.ReceiptDate).toLocaleDateString()}</strong>
                                                <span style={{ color: '#666' }}>Поставщик: {rec.SupplierName}</span>
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    {rec.Items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ padding: '5px 0' }}>{item.ProductName}</td>
                                                            <td style={{ padding: '5px 0', textAlign: 'center' }}>{item.Quantity} шт.</td>
                                                            <td style={{ padding: '5px 0', textAlign: 'right' }}>{item.PurchasePrice} ₽/шт.</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold' }}>
                                                Итого закупка: {rec.TotalAmount} ₽
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                        </div>

                    </div>
                )}
                {/* ВКЛАДКА: СТАТИСТИКА */}
                {activeTab === 'statistics' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        
                        {/* Отчет по времени */}
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <h3 style={{ color: '#007bff', margin: 0 }}>📈 Продажи (в разрезе времени)</h3>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => downloadReport('/admin/reports/sales-excel', 'Продажи.xlsx', { startDate, endDate })} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excel</button>
                                    <button onClick={() => downloadReport('/admin/reports/sales-pdf', 'Продажи.pdf', { startDate, endDate })} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>PDF</button>
                                </div>
                            </div>

                            {/* Фильтр по датам */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <label>С:</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <label>По:</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
                                </div>
                                <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ padding: '8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Сбросить</button>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Дата</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Кол-во заказов</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Выручка</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesStats.map((stat, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{new Date(stat.Date).toLocaleDateString()}</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{stat.OrdersCount} шт.</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>{stat.TotalRevenue} ₽</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Отчет по популярности */}
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ color: '#28a745', margin: 0 }}>⭐ Популярность товаров</h3>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => downloadReport('/admin/reports/popular-excel', 'Популярные_товары.xlsx')} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excel</button>
                                    <button onClick={() => downloadReport('/admin/reports/popular-pdf', 'Популярные_товары.pdf')} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>PDF</button>
                                </div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Товар</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Продано (шт)</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Сумма</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {popularStats.map(stat => (
                                        <tr key={stat.Id}>
                                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{stat.Name}</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{stat.TotalSoldQuantity}</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>{stat.TotalRevenue} ₽</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;