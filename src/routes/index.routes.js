const express = require('express');
const router = express.Router();
const mockData = require('../data/mockData');
const { getBooksListsOfWeek } = require('../services/books.service');
const { getFilmsListsOfDay } = require('../services/films.service');

// 1. TRANG CHỦ (SẢNH THƯ VIỆN)
router.get('/', async (req, res) => {
  try {
    const featuredBooks = await getBooksListsOfWeek();
    const featuredMovies = await getFilmsListsOfDay();
    res.render('pages/index', {
      featuredBooks: featuredBooks || [],
      featuredMovies: featuredMovies || [],
      reviews: mockData.reviews,
    });
  } catch (err) {
    console.error('Lỗi khi render trang chủ:', err);
    res.render('pages/index', {
      featuredBooks: [],
      featuredMovies: [],
      reviews: mockData.reviews,
    });
  }
});

// 2. TRA CỨU MỤC LỤC THƯ VIỆN (CARD CATALOG)
router.get('/search', (req, res) => {
  const query = req.query.q || '';
  const type = req.query.type || 'ALL';
  const results = mockData.searchMedia(query, type);

  res.render('pages/search', {
    results,
    query,
    selectedType: type,
  });
});

module.exports = router;
