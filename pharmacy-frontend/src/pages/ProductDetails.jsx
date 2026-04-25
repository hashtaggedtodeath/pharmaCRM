import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const ProductDetails = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [chars, setChars] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                // 1. Получаем инфо о товаре
                const all = await axiosInstance.get('/products');
                const p = all.data.find(item => item.Id === parseInt(id));
                setProduct(p);
                
                // 2. Получаем характеристики через новый публичный маршрут
                const charRes = await axiosInstance.get(`/products/characteristics/${id}`);
                setChars(charRes.data);
            } catch (err) { console.error(err); }
        };
        load();
    }, [id]);

    if (!product) return <div style={{ padding: '20px' }}>Загрузка...</div>;

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '30px' }}>
                <img src={product.ImageUrl} alt={product.Name} style={{ width: '300px', height: '300px', objectFit: 'contain' }} />
                <div>
                    <h1>{product.Name}</h1>
                    <p style={{ color: '#666', fontSize: '18px' }}>МНН: {product.INN}</p>
                    <h2 style={{ color: '#007bff', margin: '20px 0' }}>{product.SellingPrice} ₽</h2>
                    <p><strong>Производитель:</strong> {product.Manufacturer}</p>
                    <p><strong>Форма выпуска:</strong> {product.Form}</p>
                    <p><strong>Дозировка:</strong> {product.Dosage}</p>
                    <p><strong>Срок годности:</strong> {product.ExpirationDate ? new Date(product.ExpirationDate).toLocaleDateString() : 'Не указан'}</p>
                    
                </div>
            </div>

            <div style={{ marginTop: '40px' }}>
                <h3>Характеристики</h3>
                {chars.length > 0 ? (
                    <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                        <tbody>
                            {chars.map((c, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold', width: '40%' }}>{c.Name}</td>
                                    <td style={{ padding: '10px' }}>{c.Value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ marginTop: '10px', color: '#888' }}>Дополнительных характеристик нет.</p>
                )}
            </div>
        </div>
    );
};
export default ProductDetails;