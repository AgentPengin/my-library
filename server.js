const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');

// Cấu hình biến môi trường
dotenv.config();

// Khởi tạo Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Database & Passport
const db = require('./src/config/db');
const configurePassport = require('./src/config/passport');
configurePassport(passport);

// Cấu hình EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình Middleware tài nguyên tĩnh & body-parser
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cấu hình Session & Passport
app.use(
  session({
    secret: 'session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Middleware gắn dữ liệu toàn cục (currentUser, allShelves)
const { loadGlobalLocals } = require('./src/middlewares/globals');
app.use(loadGlobalLocals);

// ==========================================================================
// ĐĂNG KÝ CÁC MODULE ROUTES
// ==========================================================================
const indexRoutes = require('./src/routes/index.routes');
const authRoutes = require('./src/routes/auth.routes');
const shelvesRoutes = require('./src/routes/shelves.routes');
const itemsRoutes = require('./src/routes/items.routes');
const reviewsRoutes = require('./src/routes/reviews.routes');
const apiRoutes = require('./src/routes/api.routes');

app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', shelvesRoutes);
app.use('/', itemsRoutes);
app.use('/', reviewsRoutes);
app.use('/', apiRoutes);

// Khởi chạy máy chủ
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🏛️  ALEXANDRIA ARCHIVE (MODULAR ARCHITECTURE) RUNNING`);
  console.log(`🌐  URL: http://localhost:${PORT}`);
  console.log(`📚  Kiến trúc đã được module hóa chuẩn chuyên nghiệp!`);
  console.log(`==================================================\n`);
});
