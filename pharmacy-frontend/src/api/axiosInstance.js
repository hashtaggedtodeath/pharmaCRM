import axios from 'axios';

// Создаем базовый инстанс
const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api', // Адрес нашего бэкенда
});

// Добавляем "перехватчик" (interceptor)
// Он будет перед каждым запросом проверять, есть ли токен в LocalStorage,
// и если есть - автоматически прикреплять его к заголовкам.
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // Берем токен из памяти браузера
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;