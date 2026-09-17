const db = require('../config/db');

async function getFilm(filmId) {
  try {
    const data = await db.query(
      "SELECT * FROM media_items WHERE id = $1 AND media_type = 'MOVIE'",
      [filmId]
    );
    if (data.rows.length > 0) {
      const film = data.rows[0];
      const reviewData = await db.query(
        'SELECT r.*, u.username, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.media_id = $1 ORDER BY r.created_at DESC',
        [filmId]
      );
      film.reviews = reviewData.rows || [];
      return film;
    }

    const tmdb_api_key = process.env.TMDB_API_KEY;
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${filmId}?api_key=${tmdb_api_key}&language=vi-VN`
    );
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const filmData = await res.json();
    const creditRes = await fetch(
      `https://api.themoviedb.org/3/movie/${filmData.id}/credits?api_key=${tmdb_api_key}&language=vi-VN`
    );
    const creditData = await creditRes.json();
    const director = creditData.crew?.find((member) => member.job === 'Director');
    const film = {
      id: String(filmData.id),
      media_type: 'MOVIE',
      title: filmData.title || filmData.original_title,
      creator: director?.name || 'Đạo diễn đang cập nhật',
      release_year: filmData.release_date ? filmData.release_date.slice(0, 4) : '2024',
      poster_url: filmData.poster_path
        ? `https://image.tmdb.org/t/p/w500${filmData.poster_path}`
        : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
      overview: filmData.overview || 'Chưa có tóm tắt cho bộ phim này',
      genres: filmData.genres?.map((g) => g.name) || ['Điện ảnh'],
      average_rating: filmData.vote_average || 0,
      total_reviews: filmData.vote_count || 0,
      reviews: [],
    };

    const insertQuery = `
      INSERT INTO media_items (id, media_type, title, creator, release_year, poster_url, overview, genres, average_rating, total_reviews)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        creator = EXCLUDED.creator,
        poster_url = EXCLUDED.poster_url,
        overview = EXCLUDED.overview
    `;
    await db.query(insertQuery, [
      film.id,
      film.media_type,
      film.title,
      film.creator,
      film.release_year,
      film.poster_url,
      film.overview,
      film.genres,
      film.average_rating,
      film.total_reviews,
    ]);
    return film;
  } catch (err) {
    console.error('Lỗi khi lấy thông tin phim:', err.message);
    return null;
  }
}

async function updateFilmsListsWeek() {
  try {
    const tmdb_api_key = process.env.TMDB_API_KEY;
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdb_api_key}&language=vi-VN`
    );
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    let filmList = [];
    for (const item of data.results.slice(0, 8)) {
      const creditRes = await fetch(
        `https://api.themoviedb.org/3/movie/${item.id}/credits?api_key=${tmdb_api_key}&language=vi-VN`
      );
      const creditData = await creditRes.json();
      const director = creditData.crew?.find((member) => member.job === 'Director');
      const film = {
        id: String(item.id),
        media_type: 'MOVIE',
        title: item.title || item.original_title,
        creator: director?.name || 'Đạo diễn đang cập nhật',
        release_year: item.release_date ? item.release_date.slice(0, 4) : '2024',
        poster_url: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
        overview: item.overview || 'Chưa có tóm tắt cho bộ phim này',
        average_rating: item.vote_average || 0,
        total_reviews: item.vote_count || 0,
      };
      filmList.push(film);
    }
    return filmList;
  } catch (err) {
    console.error('Lỗi khi fetch TMDB trending data: ', err.message);
    return [];
  }
}

async function getFilmsListsOfDay() {
  const cacheKey = 'tmdb_films_day';
  try {
    const cachedRes = await db.query(
      "SELECT data, updated_at FROM api_cache WHERE key = 'tmdb_films_day'"
    );
    const cachedRow = cachedRes.rows[0];
    if (cachedRow) {
      const lastUpdated = new Date(cachedRow.updated_at).getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (now - lastUpdated < oneHour) {
        const data =
          typeof cachedRow.data === 'string' ? JSON.parse(cachedRow.data) : cachedRow.data;
        return data;
      }
    }
    const filmData = await updateFilmsListsWeek();
    const insertQuery = `
      INSERT INTO api_cache (key, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (KEY) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
    `;
    let freshData = JSON.stringify(filmData);
    await db.query(insertQuery, [cacheKey, freshData]);
    return filmData;
  } catch (err) {
    console.error('Lỗi khi lấy getFilmsListsOfDay:', err.message);
    return [];
  }
}

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

module.exports = {
  getFilm,
  updateFilmsListsWeek,
  getFilmsListsOfDay,
  searchMovies,
};
