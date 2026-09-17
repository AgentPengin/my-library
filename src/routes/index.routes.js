const express = require('express');
const router = express.Router();
const mockData = require('../data/mockData');
const { getBooksListsOfWeek } = require('../services/books.service');
const { getFilmsListsOfDay } = require('../services/films.service');
const { getReviewList } = require('../services/reviews.service');
const { searchBooksGoogle } = require('../services/books.service');
const { searchMovies } = require('../services/films.service');
// 1. TRANG CHỦ (SẢNH THƯ VIỆN)
router.get('/', async (req, res) => {
  try {
    const featuredBooks = await getBooksListsOfWeek();
    const featuredMovies = await getFilmsListsOfDay();
    const reviews = await getReviewList();


    res.render('pages/index', {
      featuredBooks: featuredBooks || [],
      featuredMovies: featuredMovies || [],
      reviews: reviews,
    });
  } catch (err) {
    console.error('Lỗi khi render trang chủ:', err);
    res.render('pages/index', {
      featuredBooks: [],
      featuredMovies: [],
      reviews: [],
    });
  }
});

// 2. TRA CỨU MỤC LỤC THƯ VIỆN (CARD CATALOG)
router.get('/search', async (req, res) => {
  
  const query = req.query.q || '';
  const type = req.query.type || 'ALL';
  const bookResults = await searchBooksGoogle(query);
  const movieResults = await searchMovies(query);
  const results = bookResults.concat(movieResults);
  
  
  res.render('pages/search', {
    results,
    query,
    selectedType: type,
  });
});

module.exports = router;
