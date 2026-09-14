const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mockData = require('./src/data/mockData');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');
const pg = require('pg');
const bcrypt = require('bcrypt');

// Cấu hình biến môi trường
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const saltRound = 10;

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

db.connect();

// Cấu hình EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình thư mục chứa tài nguyên tĩnh (CSS, JS, Hình ảnh)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: 'session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(
  {
    usernameField: 'identifier',
    passwordField: 'password',
  }, async (identifier, password, done) => {
    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1 OR username = $1', [identifier]);
      const user = result.rows[0];
      if (!user) {
        return done(null, false, { message: 'Tên độc giả hoặc Email này chưa được đăng ký trong thư viện!' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Mật khẩu không chính xác. Xin vui lòng thử lại!' });
      }
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT id, email, username, avatar_url, bio FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Middleware gán dữ liệu toàn cục (user hiện tại, danh sách kệ) cho mọi view
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.allShelves = mockData.shelves;
  next();
});

function parseGenres(categories) {
  let genres = [];
  for (let category of categories) {
    let parts = category.split("/");
    for (let part of parts) {
      let subparts = part.split("&");
      for (let genre of subparts) {
        genre = genre.trim();
        if (genre !== "Fiction" && genre !== "Nonfiction") {
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
      limit: 1
    });
    const url = `https://openlibrary.org/search.json?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLibraryApp/1.0'
      }
    });


    if (!response.ok) {
      return {
        rating: 0,
        count: 0
      };
    }
    const data = await response.json();

    if (!data.docs || data.docs.length === 0) return {rating: 0, count: 0};
    const workKey = data.docs[0].key;
    const workResponse = await fetch(`https://openlibrary.org${workKey}/ratings.json`, {
      headers: {
        'User-Agent': 'MyLibraryApp/1.0'
      }
    });
    // console.log(`LINK FOR ${title}: https://openlibrary.org${workKey}/ratings.json`);

    if (!workResponse.ok) {
      return {rating: 0, count: 0};
    }
    const workData = await workResponse.json();
    return {rating: workData.summary?.average ? parseFloat(workData.summary.average.toFixed(2)): 0, 
            count: workData.summary?.count ?? 0};
  } catch (error) {
    console.warn(`Không lấy được rating cho cuốn sách: ${title}`);
    return {
      rating: 0, 
      count: 0
    }
  }
}

async function updateBooksListsWeek() {
  try {
    // Fetch data từ API NYT
    const nyt_api_key = process.env.NYT_BOOKS_API;
    const google_books_api_key = process.env.GOOGLE_BOOKS_API;
    const res = await fetch(`https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${nyt_api_key}`);
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
      const google_res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${title}+inauthor:${author}&key=${google_books_api_key}`);
      const google_data = await google_res.json();
      const book_data = google_data.items?.[0] ?? null;
      const isbn = book_data.volumeInfo.industryIdentifiers?.find(id => id.type === "ISBN_13")?.identifier;
      const rating_data = await getOpenLibraryRating(author, title);

      const book = {
        id: book_data.id,
        media_type: "BOOK",
        title: book_data.volumeInfo.title || title,
        creator: book_data.volumeInfo.authors || author,
        release_year: book_data.volumeInfo.publishedDate.slice(0, 4) || '2024',
          poster_url: book_data.volumeInfo.imageLinks?.thumbnail || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
            overview: book_data.volumeInfo.description || "Chưa có tóm tắt cho cuốn sách này",
              genres: parseGenres(book_data.volumeInfo.categories) ?? "Văn học",
        average_rating: rating_data?.rating,
        total_reviews: rating_data?.count
      }  
      booksData.push(book);
    };
    return booksData;
  } catch (err) {
    console.error("Lỗi khi fetch data: ", err.message);
    console.error("Lỗi thật sự: ", err.cause);
  }
}

async function getBook(bookId) {
  try {
    const data = await db.query("SELECT * FROM media_items WHERE id = $1 AND media_type = 'BOOK'", [bookId]);
    if (data.rows.length > 0) {
      const book = data.rows[0];
      // Lấy danh sách review đã có của cuốn sách này từ bảng reviews
      const reviewData = await db.query(
        "SELECT r.*, u.username, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.media_id = $1 ORDER BY r.created_at DESC", 
        [bookId]
      );
      book.reviews = reviewData.rows || [];
      return book;  
    }

    const google_books_api_key = process.env.GOOGLE_BOOKS_API;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}?key=${google_books_api_key}`);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const book_data = await res.json();
    const isbn = book_data.volumeInfo.industryIdentifiers?.find(id => id.type === "ISBN_13")?.identifier;
    const author = book_data.volumeInfo.authors;
    const title = book_data.volumeInfo.title;

    const rating_data = await getOpenLibraryRating(author, title);
    
    const book = {
        id: book_data.id,
        media_type: "BOOK",
        title: title,
        creator: Array.isArray(author) ? author.join(', ') : (author || "Tác giả đang cập nhật"),
        release_year: book_data.volumeInfo.publishedDate?.slice(0, 4) || '2024',
        poster_url: book_data.volumeInfo.imageLinks?.thumbnail || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
        overview: book_data.volumeInfo.description || "Chưa có tóm tắt cho cuốn sách này",
        genres: parseGenres(book_data.volumeInfo.categories) ?? "Văn học",
        average_rating: rating_data?.rating || 0,
        total_reviews: rating_data?.count || 0,
        reviews: [] // Sách mới lấy từ API về thì chưa có review nội bộ nào
      }  
    const insertQuery = `
      INSERT INTO media_items (id, media_type, title, creator, release_year, poster_url, overview, genres, average_rating, total_reviews)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      book.total_reviews
    ]);
    return book;
  } catch (err) {
    console.error("Lỗi khi lấy thông tin sách:", err);
    return null;
  }
}

async function getFilm(filmId) {
  try {
    const data = await db.query("SELECT * FROM media_items WHERE id = $1 AND media_type = 'MOVIE'", [filmId]);
    if (data.rows.length > 0) {
      const film = data.rows[0];
      // Lấy danh sách review đã có của cuốn sách này từ bảng reviews
      const reviewData = await db.query(
        "SELECT r.*, u.username, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.media_id = $1 ORDER BY r.created_at DESC", 
        [filmId]
      );
      film.reviews = reviewData.rows || [];
      return film;  
    }

    const tmdb_api_key = process.env.TMDB_API_KEY;
    const res = await fetch(`https://api.themoviedb.org/3/movie/${filmId}?api_key=${tmdb_api_key}`);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const filmData = await res.json();
    const creditRes = await fetch(`https://api.themoviedb.org/3/movie/${filmData.id}/credits?api_key=${tmdb_api_key}`);
    const creditData = await creditRes.json();
    const director = creditData.crew.find(member => member.job === "Director");
    const film = {
      id: filmData.id,
      media_type: "MOVIE",
      title: filmData.title || filmData.original_title,
      creator: director?.name || "Đạo diễn đang cập nhật",
      release_year: filmData.release_date ? filmData.release_date.slice(0, 4) : '2024',
      poster_url: `https://image.tmdb.org/t/p/w500${filmData.poster_path}` || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
      overview: filmData.overview || "Chưa có tóm tắt cho bộ phim này",
      average_rating: filmData.vote_average || 0,
      total_reviews: filmData.vote_count || 0
    }  
    // console.log(film);
    const insertQuery = `
      INSERT INTO media_items (id, media_type, title, creator, release_year, poster_url, overview, genres, average_rating, total_reviews)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      film.total_reviews
    ]);
    return film;
  } catch (err) {
    console.error("Lỗi khi lấy thông tin phim:", err);
    return null;
  }
}

async function getBooksListsOfWeek() {
  // dùng query lấy ra ngày cuối cùng cập nhật dữ liệu vào databases
  // nếu hơn 1 ngày trôi qua -> update data mới
  const cacheKey = 'nyt_books_week';
  const cachedRes = await db.query("SELECT data, updated_at FROM api_cache WHERE key = 'nyt_books_week'");
  const cachedRow = cachedRes.rows[0];
  if (cachedRow) {
    const lastUpdated = new Date(cachedRow.updated_at).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - lastUpdated < oneDay) {
      console.log("Dữ liệu sách trong tuần của NYT đã được cache, không cần fetch lại.");
      const data = typeof cachedRow.data === 'string' ? JSON.parse(cachedRow.data) : cachedRow.data;
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
}

async function updateFilmsListsWeek() {
  try {
    // Fetch data từ API NYT
    const tmdb_api_key = process.env.TMDB_API_KEY;
    const res = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdb_api_key}`);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    let filmList = [];
    for (const item of data.results.slice(0, 8)) {
      const creditRes = await fetch(`https://api.themoviedb.org/3/movie/${item.id}/credits?api_key=${tmdb_api_key}`);
      const creditData = await creditRes.json();
      const director = creditData.crew.find(member => member.job === "Director");
      const film = {
        id: item.id,
        media_type: "MOVIE",
        title: item.title || item.original_title,
        creator: director?.name || "Đạo diễn đang cập nhật",
        release_year: item.release_date ? item.release_date.slice(0, 4) : '2024',
        poster_url: `https://image.tmdb.org/t/p/w500${item.poster_path}` || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
        overview: item.overview || "Chưa có tóm tắt cho bộ phim này",
        average_rating: item.vote_average || 0,
        total_reviews: item.vote_count || 0
      }  
      filmList.push(film);
    };
    return filmList;
  } catch (err) {
    console.error("Lỗi khi fetch data: ", err.message);
    console.error("Lỗi thật sự: ", err.cause);
  }
}

async function getFilmsListsOfDay() {
  const cacheKey = 'tmdb_films_day';
  const cachedRes = await db.query("SELECT data, updated_at FROM api_cache WHERE key = 'tmdb_films_day'");
  const cachedRow = cachedRes.rows[0];
  if (cachedRow) {
    const lastUpdated = new Date(cachedRow.updated_at).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    if (now - lastUpdated < oneHour) {
      console.log("Dữ liệu phim hot của TMDB đã được cache, không cần fetch lại.");
      const data = typeof cachedRow.data === 'string' ? JSON.parse(cachedRow.data) : cachedRow.data;
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
}

/* ==========================================================================
   ROUTES
   ========================================================================== */

// 1. TRANG CHỦ (SẢNH THƯ VIỆN)
app.get('/', async (req, res) => {
  // Lọc riêng sách và phim (sau này featuredBooks sẽ lấy từ hàm getBooksListsOfWeek NYT của em)
  const featuredBooks = await getBooksListsOfWeek();
  const featuredMovies = await getFilmsListsOfDay();
  res.render('pages/index', {
    featuredBooks,
    featuredMovies,
    reviews: mockData.reviews
  });
});

// 2. TẤT CẢ GIÁ SÁCH CỦA TÔI
app.get('/shelves', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }


    let myShelves = [];
    const queryShelves = await db.query("SELECT * FROM shelves WHERE user_id = $1", [req.user.id]);
    const userShelves = queryShelves.rows || [];
    for (const item of userShelves) {
      const itemQuery = await db.query("SELECT m.* FROM shelf_items si JOIN media_items m ON si.media_id = m.id WHERE si.shelf_id = $1", [item.id]);
      const itemRows = itemQuery.rows || [];


      const shelfItems = itemRows.map(row => ({
        id: row.id,
        media_type: row.media_type,
        title: row.title,
        creator: row.creator,
        release_year: row.release_year,
        poster_url: row.poster_url,
        overview: row.overview,
        genres: row.genres,
        average_rating: row.average_rating,
        total_reviews: row.total_reviews
      }));
      const shelf = {
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        description: item.description,
        shelf_wood: item.shelf_wood,
        is_public: item.is_public,
        created_at: item.created_at,
        items: shelfItems 
      };
      myShelves.push(shelf);
    }
    res.render('pages/my-shelves', {
      shelves: myShelves
    });
  } catch (err) {
    console.error("Lỗi khi lấy data giá sách của người dùng: ", err.message);
    console.error("Lỗi thật sự: ", err.cause);
  }
});

// 3. TẠO GIÁ SÁCH MỚI (MOCK POST)
app.post('/shelves/create', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const { name, description, shelf_wood, is_public } = req.body;
  try {
    await db.query("INSERT INTO shelves (user_id, name, description, shelf_wood, is_public) VALUES ($1, $2, $3, $4, $5)", [req.user.id, name, description, shelf_wood, is_public]);
    res.redirect('/shelves');
  } catch (err) {
    console.error("Lỗi khi tạo giá sách mới: ", err.message);
    console.error("Lỗi thật sự: ", err.cause);
  }
});

// 4. CHI TIẾT 1 GIÁ SÁCH
app.get('/shelves/:id', (req, res) => {
  const shelf = mockData.getShelfById(req.params.id);
  if (!shelf) {
    return res.status(404).send('Không tìm thấy giá sách này.');
  }
  res.render('pages/shelf-detail', { shelf });
});

// 5. THÊM TÁC PHẨM VÀO GIÁ SÁCH
app.post('/shelves/add-item', (req, res) => {
  const { shelf_id, media_id } = req.body;
  const targetShelf = mockData.getShelfById(shelf_id);
  const targetMedia = mockData.mediaItems.find(m => m.id === media_id);

  if (targetShelf && targetMedia) {
    const exists = targetShelf.items.some(i => i.id === media_id);
    if (!exists) {
      targetShelf.items.push(targetMedia);
    }
    return res.redirect(`/shelves/${shelf_id}`);
  }
  res.redirect('/shelves');
});

// 6. GỠ TÁC PHẨM KHỎI GIÁ SÁCH
app.post('/shelves/:id/remove-item', (req, res) => {
  const shelfId = req.params.id;
  const { media_id } = req.body;
  const shelf = mockData.getShelfById(shelfId);
  if (shelf) {
    shelf.items = shelf.items.filter(i => i.id !== media_id);
  }
  res.redirect(`/shelves/${shelfId}`);
});

// 7A. TRANG CHI TIẾT SÁCH (GOOGLE BOOKS / DB) ✅
app.get('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  const item = await getBook(bookId);
  if (!item) {
    return res.status(404).send('Không tìm thấy cuốn sách này.');
  }
  res.render('pages/item-detail', { item });
});

// 7B. TRANG CHI TIẾT PHIM (TMDB / DB) ✅
app.get('/movies/:id', async (req, res) => {
  const movieId = req.params.id;
  const item = await getFilm(movieId);
  if (!item) {
    return res.status(404).send('Không tìm thấy bộ phim này.');
  }
  res.render('pages/item-detail', { item });
});

// 8. ĐĂNG REVIEW MỚI
app.post('/reviews/create', (req, res) => {
  const { media_id, rating, content, contains_spoilers } = req.body;
  const newReview = {
    id: `rev-${Date.now()}`,
    user_id: mockData.currentUser.id,
    media_id,
    rating: parseFloat(rating) || 5.0,
    content,
    contains_spoilers: contains_spoilers === 'true',
    created_at: 'Vừa xong',
    user: {
      username: mockData.currentUser.username,
      avatar_url: mockData.currentUser.avatar_url
    }
  };
  mockData.reviews.unshift(newReview);
  res.redirect(`/items/${media_id}`);
});

// 9. TRA CỨU MỤC LỤC THƯ VIỆN (GOOGLE BOOKS & TMDB SEARCH)
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  const type = req.query.type || 'ALL';
  const results = mockData.searchMedia(query, type);

  res.render('pages/search', {
    results,
    query,
    selectedType: type
  });
});

// 10. AUTH: ✅
app.get('/login', (req, res) => {
  res.render('pages/login', { currentRoute: 'login' });
});

app.post("/auth/login", (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).render('pages/login', {
        currentRoute: 'login',
        error: info ? info.message : 'Tài khoản hoặc mật khẩu không chính xác',
        identifier: req.body.identifier
      });
    }

    req.login(user, (err) => {
      if (err) return next(err);
      return res.redirect("/shelves");
    });
  })(req, res, next);
});

app.get('/register', (req, res) => {
  res.render('pages/register', { currentRoute: 'register' });
});

app.get("/auth/logout", (req, res, next) => {
  console.log("user want to logout!");
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.post('/auth/register', async (req, res, next) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const avatar_url = req.body.avatar_url;
  const bio = req.body.bio;
  try {
    const existing = await db.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
    if (existing.rows.length > 0) {
      return res.status(400).render("pages/register", {
        currentRoute: 'register',
        error: 'Email hoặc tên người dùng đã có người đăng ký!'
      });
    }

    const hash = await bcrypt.hash(password, saltRound);
    const insertResult = await db.query("INSERT INTO users (username, email, password_hash, avatar_url, bio) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, avatar_url, bio", [username, email, hash, avatar_url || 'https://i.pinimg.com/736x/6c/0a/05/6c0a05a88d4dc79a696fc9a3c6aaba30.jpg', bio || '']);
    const newUser = insertResult.rows[0];
    req.login(newUser, (err) => {
      if (err) return next(err);
      return res.redirect("/shelves");
    });
  } catch (err) {
    console.error("Lỗi khi đăng ký", err);
    return next(err);
  }
});



// KHỞI CHẠY MÁY CHỦ
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🏛️  ALEXANDRIA ARCHIVE (SKEUOMORPHIC UI) RUNNING`);
  console.log(`🌐  URL: http://localhost:${PORT}`);
  console.log(`📚  Tất cả giao diện đã sẵn sàng để code Backend!`);
  console.log(`==================================================\n`);
});
