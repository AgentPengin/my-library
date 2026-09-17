const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper tìm kiếm sách qua Google Books API
async function searchBooksGoogle(query) {
  try {

    const googleApiKey = process.env.GOOGLE_BOOKS_API;
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&maxResults=10&orderBy=relevance&langRestrict=vi&key=${googleApiKey}`;
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
    const tmdb_api_key = process.env.TMDB_API_KEY;
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdb_api_key}&query=${encodeURIComponent(
        query
      )}&language=vi-VN&page=1`
    );
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    if (!data.results) return [];
    
    const results = await Promise.all(data.results.map(async(item) => {
      const releaseYear = item.release_date ? item.release_date.slice(0, 4) : '—';
      const creditRes = await fetch(
        `https://api.themoviedb.org/3/movie/${item.id}/credits?api_key=${tmdb_api_key}&language=vi-VN`
      );
      const creditData = await creditRes.json();
    
      const director = creditData.crew?.find((member) => member.job === 'Director');
      const name = director?.name || director?.original_name || 'Đạo diễn đang cập nhật';

      return {
        id: String(item.id),
        media_type: 'MOVIE',
        title: item.title || item.original_title || 'Không rõ tiêu đề',
        creator: name || 'Đạo diễn đang cập nhật', // TMDB không cung cấp thông tin đạo diễn trong kết quả tìm kiếm
        release_year: releaseYear,
        poster_url: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
      };
    }));
    return results;
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
