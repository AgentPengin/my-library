const db = require('../config/db');

function parseGenres(categories) {
  if (!categories || !Array.isArray(categories)) return ['Văn học'];
  let genres = [];
  for (let category of categories) {
    let parts = category.split('/');
    for (let part of parts) {
      let subparts = part.split('&');
      for (let genre of subparts) {
        genre = genre.trim();
        if (genre !== 'Fiction' && genre !== 'Nonfiction') {
          genres.push(genre);
        }
      }
    }
  }
  return [...new Set(genres)];
}

async function getOpenLibraryRating(author, title) {
  try {
    const params = new URLSearchParams({
      author,
      title,
      limit: 1,
    });
    const url = `https://openlibrary.org/search.json?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLibraryApp/1.0',
      },
    });

    if (!response.ok) {
      return { rating: 0, count: 0 };
    }
    const data = await response.json();

    if (!data.docs || data.docs.length === 0) return { rating: 0, count: 0 };
    const workKey = data.docs[0].key;
    const workResponse = await fetch(`https://openlibrary.org${workKey}/ratings.json`, {
      headers: {
        'User-Agent': 'MyLibraryApp/1.0',
      },
    });

    if (!workResponse.ok) {
      return { rating: 0, count: 0 };
    }
    const workData = await workResponse.json();
    return {
      rating: workData.summary?.average ? parseFloat(workData.summary.average.toFixed(2)) : 0,
      count: workData.summary?.count ?? 0,
    };
  } catch (error) {
    console.warn(`Không lấy được rating cho cuốn sách: ${title}`);
    return { rating: 0, count: 0 };
  }
}

async function updateBooksListsWeek() {
  try {
    const nyt_api_key = process.env.NYT_BOOKS_API;
    const google_books_api_key = process.env.GOOGLE_BOOKS_API;
    const res = await fetch(
      `https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${nyt_api_key}`
    );
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    let itemsList = [];
    for (let i = 0; i < 10; i++) {
      itemsList.push({
        author: data.results.books[i].author,
        title: data.results.books[i].title,
      });
    }
    let booksData = [];
    for (const item of itemsList) {
      const author = item.author;
      const title = item.title;
      const google_res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}+inauthor:${author}&key=${google_books_api_key}`
      );
      const google_data = await google_res.json();
      const book_data = google_data.items?.[0] ?? null;
      const rating_data = await getOpenLibraryRating(author, title);

      const book = {
        id: book_data?.id || `book_${Date.now()}`,
        media_type: 'BOOK',
        title: book_data?.volumeInfo?.title || title,
        creator: Array.isArray(book_data?.volumeInfo?.authors)
          ? book_data.volumeInfo.authors.join(', ')
          : (author || 'Tác giả đang cập nhật'),
        release_year: book_data?.volumeInfo?.publishedDate?.slice(0, 4) || '2024',
        poster_url:
          book_data?.volumeInfo?.imageLinks?.thumbnail ||
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
        overview: book_data?.volumeInfo?.description || 'Chưa có tóm tắt cho cuốn sách này',
        genres: parseGenres(book_data?.volumeInfo?.categories) ?? ['Văn học'],
        average_rating: rating_data?.rating || 0,
        total_reviews: rating_data?.count || 0,
      };
      booksData.push(book);
    }
    return booksData;
  } catch (err) {
    console.error('Lỗi khi fetch NYT/Google books data: ', err.message);
    return [];
  }
}

async function getBooksListsOfWeek() {
  const cacheKey = 'nyt_books_week';
  try {
    const cachedRes = await db.query(
      "SELECT data, updated_at FROM api_cache WHERE key = 'nyt_books_week'"
    );
    const cachedRow = cachedRes.rows[0];
    if (cachedRow) {
      const lastUpdated = new Date(cachedRow.updated_at).getTime();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastUpdated < oneDay) {
        const data =
          typeof cachedRow.data === 'string' ? JSON.parse(cachedRow.data) : cachedRow.data;
        return data;
      }
    }

    const booksData = await updateBooksListsWeek();
    const insertQuery = `
      INSERT INTO api_cache (key, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (KEY) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
    `;
    let freshData = JSON.stringify(booksData);
    await db.query(insertQuery, [cacheKey, freshData]);
    return booksData;
  } catch (err) {
    console.error('Lỗi khi lấy getBooksListsOfWeek:', err.message);
    return [];
  }
}

async function getBook(bookId) {
  try {
    const data = await db.query(
      "SELECT * FROM media_items WHERE id = $1 AND media_type = 'BOOK'",
      [bookId]
    );
    if (data.rows.length > 0) {
      const book = data.rows[0];
      const reviewData = await db.query(
        'SELECT r.*, u.username, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.media_id = $1 ORDER BY r.created_at DESC',
        [bookId]
      );
      book.reviews = reviewData.rows || [];
      return book;
    }

    const google_books_api_key = process.env.GOOGLE_BOOKS_API;
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${bookId}?key=${google_books_api_key}`
    );
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const book_data = await res.json();
    const author = book_data.volumeInfo?.authors;
    const title = book_data.volumeInfo?.title || 'Không rõ tiêu đề';

    const rating_data = await getOpenLibraryRating(author, title);

    const book = {
      id: book_data.id,
      media_type: 'BOOK',
      title: title,
      creator: Array.isArray(author) ? author.join(', ') : (author || 'Tác giả đang cập nhật'),
      release_year: book_data.volumeInfo?.publishedDate?.slice(0, 4) || '2024',
      poster_url:
        book_data.volumeInfo?.imageLinks?.thumbnail ||
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
      overview: book_data.volumeInfo?.description || 'Chưa có tóm tắt cho cuốn sách này',
      genres: parseGenres(book_data.volumeInfo?.categories) ?? ['Văn học'],
      average_rating: rating_data?.rating || 0,
      total_reviews: rating_data?.count || 0,
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
      book.id,
      book.media_type,
      book.title,
      book.creator,
      book.release_year,
      book.poster_url,
      book.overview,
      book.genres,
      book.average_rating,
      book.total_reviews,
    ]);
    return book;
  } catch (err) {
    console.error('Lỗi khi lấy thông tin sách getBook:', err.message);
    return null;
  }
}

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

module.exports = {
  parseGenres,
  getOpenLibraryRating,
  updateBooksListsWeek,
  getBooksListsOfWeek,
  getBook,
  searchBooksGoogle,
};
