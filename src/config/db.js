const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối Database:', err.message);
  } else {
    console.log('Kết nối Database thành công');
  }
});

module.exports = db;
