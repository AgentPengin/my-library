const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper tìm kiếm sách qua Google Books API
async function searchBooksGoogle(query) {
  try {
    const googleApiKey = process.env.GOOGLE_BOOKS_API;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6${
      googleApiKey ? `&key=${googleApiKey}` : ''
    }`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((item) => {
      const vol = item.volumeInfo || {};
      return {
        id: item.id,
        media_type: 'BOOK',
        title: vol.title || 'Không rõ tiêu đề',
        creator: Array.isArray(vol.authors)
          ? vol.authors.join(', ')
          : vol.authors || 'Không rõ tác giả',
        release_year: vol.publishedDate ? vol.publishedDate.slice(0, 4) : '—',
        poster_url:
          vol.imageLinks?.thumbnail ||
          vol.imageLinks?.smallThumbnail ||
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
      };
    });
  } catch (err) {
    console.error('Lỗi khi tìm kiếm sách qua Google Books:', err.message);
    return [];
  }
}

// Helper tìm kiếm phim qua CSDL / TMDB
async function searchMovies(query) {
  try {
    // Tra cứu trong bảng media_items của PostgreSQL nội bộ
    const dbQuery = await db.query(
      "SELECT id, media_type, title, creator, release_year, poster_url FROM media_items WHERE media_type = 'MOVIE' AND (LOWER(title) LIKE $1 OR LOWER(creator) LIKE $1) LIMIT 6",
      [`%${query.toLowerCase()}%`]
    );
    return dbQuery.rows || [];
  } catch (err) {
    console.error('Lỗi khi tìm kiếm phim:', err.message);
    return [];
  }
}

// GET /api/search-media?q=...&type=...
router.get('/api/search-media', async (req, res) => {
  const query = req.query.q || '';
  const type = req.query.type || 'ALL';

  if (!query) {
    return res.json([]);
  }

  try {
    let results = [];
    if (type === 'BOOK' || type === 'ALL') {
      const books = await searchBooksGoogle(query);
      results = results.concat(books);
    }
    if (type === 'MOVIE' || type === 'ALL') {
      const movies = await searchMovies(query);
      results = results.concat(movies);
    }

    res.json(results);
  } catch (err) {
    console.error('Lỗi tại GET /api/search-media:', err.message);
    res.status(500).json({ error: 'Lỗi hệ thống khi tìm kiếm' });
  }
});

module.exports = router;
