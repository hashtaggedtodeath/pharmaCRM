const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, 
        trustServerCertificate: true
    }
};

// Создаем подключение
const poolPromise = new sql.ConnectionPool(sqlConfig)
    .connect()
    .then(pool => {
        console.log('✅ Успешное подключение к MSSQL (PharmacyDB)');
        return pool;
    })
    .catch(err => {
        console.error('❌ Ошибка подключения к БД:', err);
        process.exit(1);
    });

module.exports = { sql, poolPromise };