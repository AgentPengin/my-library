const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const saltRound = 10;

// GET /login - Trang đăng nhập
router.get('/login', (req, res) => {
  res.render('pages/login', { currentRoute: 'login' });
});

// POST /auth/login - Xử lý đăng nhập
router.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).render('pages/login', {
        currentRoute: 'login',
        error: info ? info.message : 'Tài khoản hoặc mật khẩu không chính xác',
        identifier: req.body.identifier,
      });
    }

    req.login(user, (err) => {
      if (err) return next(err);
      return res.redirect('/shelves');
    });
  })(req, res, next);
});

// GET /register - Trang đăng ký thẻ độc giả
router.get('/register', (req, res) => {
  res.render('pages/register', { currentRoute: 'register' });
});

// POST /auth/register - Xử lý đăng ký độc giả mới
router.post('/auth/register', async (req, res, next) => {
  const { username, email, password, avatar_url, bio } = req.body;
  try {
    const existing = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(400).render('pages/register', {
        currentRoute: 'register',
        error: 'Email hoặc tên người dùng đã có người đăng ký!',
      });
    }

    const hash = await bcrypt.hash(password, saltRound);
    const insertResult = await db.query(
      'INSERT INTO users (username, email, password_hash, avatar_url, bio) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, avatar_url, bio',
      [
        username,
        email,
        hash,
        avatar_url || 'https://i.pinimg.com/736x/6c/0a/05/6c0a05a88d4dc79a696fc9a3c6aaba30.jpg',
        bio || '',
      ]
    );
    const newUser = insertResult.rows[0];
    req.login(newUser, (err) => {
      if (err) return next(err);
      return res.redirect('/shelves');
    });
  } catch (err) {
    console.error('Lỗi khi đăng ký:', err);
    return next(err);
  }
});

// GET /auth/logout - Đăng xuất
router.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
