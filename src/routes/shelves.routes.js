const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');
const { getBook } = require('../services/books.service');
const { getFilm } = require('../services/films.service');

// 1. TẤT CẢ GIÁ SÁCH CỦA TÔI
router.get('/shelves', isAuthenticated, async (req, res) => {
  try {
    let myShelves = [];
    const queryShelves = await db.query(
      'SELECT * FROM shelves WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    const userShelves = queryShelves.rows || [];

    for (const item of userShelves) {
      const itemQuery = await db.query(
        'SELECT m.* FROM shelf_items si JOIN media_items m ON si.media_id = m.id WHERE si.shelf_id = $1',
        [item.id]
      );
      const itemRows = itemQuery.rows || [];

      const shelfItems = itemRows.map((row) => ({
        id: row.id,
        media_type: row.media_type,
        title: row.title,
        creator: row.creator,
        release_year: row.release_year,
        poster_url: row.poster_url,
        overview: row.overview,
        genres: row.genres,
        average_rating: row.average_rating,
        total_reviews: row.total_reviews,
      }));

      const shelf = {
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        description: item.description,
        shelf_wood: item.shelf_wood,
        is_public: item.is_public,
        created_at: item.created_at,
        items: shelfItems,
      };
      myShelves.push(shelf);
    }

    res.render('pages/my-shelves', {
      shelves: myShelves,
    });
  } catch (err) {
    console.error('Lỗi khi lấy data giá sách của người dùng: ', err.message);
    res.redirect('/');
  }
});

// 2. TẠO GIÁ SÁCH MỚI
router.post('/shelves/create', isAuthenticated, async (req, res) => {
  const { name, description, shelf_wood, is_public } = req.body;
  try {
    await db.query(
      'INSERT INTO shelves (user_id, name, description, shelf_wood, is_public) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, name, description, shelf_wood, is_public === 'true']
    );
    res.redirect('/shelves');
  } catch (err) {
    console.error('Lỗi khi tạo giá sách mới: ', err.message);
    res.redirect('/shelves');
  }
});

// 3. CHI TIẾT 1 GIÁ SÁCH (Hỗ trợ Kệ Công Khai & Xem Lời Bình Chủ Kệ)
router.get('/shelves/:id', async (req, res) => {
  const shelfId = req.params.id;

  try {
    // Truy vấn thông tin kệ sách
    const queryShelves = await db.query('SELECT * FROM shelves WHERE id = $1', [shelfId]);
    if (queryShelves.rows.length === 0) {
      return res.status(404).send('Không tìm thấy giá sách này.');
    }
    const shelfRow = queryShelves.rows[0];

    const isOwner = req.user && req.user.id === shelfRow.user_id;

    if (!shelfRow.is_public && !isOwner) {
      return res.status(403).send('Giá sách này đã được đặt ở chế độ riêng tư bởi chủ sở hữu.');
    }

    const ownerRes = await db.query('SELECT id, username, avatar_url FROM users WHERE id = $1', [shelfRow.user_id]);
    const shelfOwner = ownerRes.rows[0] || { username: 'Độc giả thư viện' };

    const likesRes = await db.query('SELECT COUNT(*) AS count FROM shelf_likes WHERE shelf_id = $1', [shelfId]);
    const likesCount = parseInt(likesRes.rows[0]?.count, 10) || 0;

    let isLikedByMe = false;
    if (req.user) {
      const checkLike = await db.query('SELECT 1 FROM shelf_likes WHERE shelf_id = $1 AND user_id = $2', [shelfId, req.user.id]);
      isLikedByMe = checkLike.rows.length > 0;
    }
    const itemQuery = await db.query(
      `SELECT 
        m.*,
        r.rating AS owner_rating,
        r.content AS owner_review_snippet
      FROM shelf_items si 
      JOIN media_items m ON si.media_id = m.id 
      LEFT JOIN reviews r ON r.media_id = m.id AND r.user_id = $2
      WHERE si.shelf_id = $1
      ORDER BY si.added_at DESC`,
      [shelfId, shelfRow.user_id]
    );

    const shelfItems = (itemQuery.rows || []).map((row) => ({
      id: row.id,
      media_type: row.media_type,
      title: row.title,
      creator: row.creator,
      release_year: row.release_year,
      poster_url: row.poster_url,
      overview: row.overview,
      genres: row.genres,
      average_rating: row.average_rating,
      total_reviews: row.total_reviews,
      owner_rating: row.owner_rating ? parseFloat(row.owner_rating) : null,
      owner_review_snippet: row.owner_review_snippet || null,
    }));

    const shelf = {
      id: shelfRow.id,
      user_id: shelfRow.user_id,
      name: shelfRow.name,
      description: shelfRow.description,
      shelf_wood: shelfRow.shelf_wood,
      is_public: shelfRow.is_public,
      created_at: shelfRow.created_at,
      items: shelfItems,
      likes_count: likesCount,
      is_liked_by_me: isLikedByMe,
      owner: shelfOwner,
    };

    res.render('pages/shelf-detail', {
      shelf,
      isOwner,
    });
  } catch (err) {
    console.error('Lỗi khi lấy chi tiết giá sách:', err.message);
    res.status(500).send('Lỗi máy chủ khi tải giá sách.');
  }
});

// 4. THÊM TÁC PHẨM VÀO GIÁ SÁCH
router.post('/shelves/add-item', isAuthenticated, async (req, res) => {
  const { shelf_id, media_id, media_type } = req.body;
  if (!shelf_id || !media_id) {
    return res.redirect('/shelves');
  }
  try {
    const checkMedia = await db.query('SELECT id FROM media_items WHERE id = $1', [media_id]);
    if (checkMedia.rows.length === 0) {
      if (media_type === 'MOVIE' || (!isNaN(media_id) && String(media_id).length <= 8)) {
        await getFilm(media_id);
      } else {
        await getBook(media_id);
      }
    }
    await db.query(
      'INSERT INTO shelf_items (shelf_id, media_id) VALUES ($1, $2) ON CONFLICT (shelf_id, media_id) DO NOTHING',
      [shelf_id, media_id]
    );
    return res.redirect(`/shelves/${shelf_id}`);
  } catch (err) {
    console.error('Lỗi khi thêm tác phẩm vào giá sách:', err.message);
    return res.redirect(`/shelves/${shelf_id}`);
  }
});

// 5. GỠ TÁC PHẨM KHỎI GIÁ SÁCH
router.post('/shelves/:id/remove-item', isAuthenticated, async (req, res) => {
  const shelfId = req.params.id;
  const { media_id } = req.body;
  try {
    await db.query(
      'DELETE FROM shelf_items WHERE shelf_id = $1 AND media_id = $2',
      [shelfId, media_id]
    );
    res.redirect(`/shelves/${shelfId}`);
  } catch (err) {
    console.error('Lỗi khi gỡ tác phẩm khỏi giá sách:', err.message);
    res.redirect(`/shelves/${shelfId}`);
  }
});

// 6. XÓA TOÀN BỘ GIÁ SÁCH
router.post('/shelves/:id/delete', isAuthenticated, async (req, res) => {
  const shelfId = req.params.id;
  try {
    await db.query('DELETE FROM shelves WHERE id = $1 AND user_id = $2', [
      shelfId,
      req.user.id,
    ]);
    res.redirect('/shelves');
  } catch (err) {
    console.error('Lỗi khi xóa giá sách:', err.message);
    res.redirect(`/shelves/${shelfId}`);
  }
});

/* ==========================================================================
   TEMPLATE ROUTE DÀNH CHO EM LẬP TRÌNH:
   ========================================================================== */

/**
 * 7. [TEMPLATE] THÍCH / BỎ THÍCH GIÁ SÁCH (TOGGLE LIKE)
 * URL: POST /shelves/:id/like
 * 
 * 💡 Gợi ý logic cho em:
 * 1. Kiểm tra đăng nhập (nếu chưa đăng nhập thì redirect về /login).
 * 2. Lấy shelfId từ req.params.id và userId từ req.user.id.
 * 3. Kiểm tra xem người dùng đã like kệ này trong bảng "shelf_likes" chưa:
 *    SELECT 1 FROM shelf_likes WHERE shelf_id = $1 AND user_id = $2;
 * 4. Nếu ĐÃ LIKE: Xóa đi (Bỏ thích):
 *    DELETE FROM shelf_likes WHERE shelf_id = $1 AND user_id = $2;
 * 5. Nếu CHƯA LIKE: Thêm vào (Thích):
 *    INSERT INTO shelf_likes (shelf_id, user_id) VALUES ($1, $2);
 * 6. Redirect lại trang chi tiết kệ: res.redirect(`/shelves/${shelfId}`);
 */
router.post('/shelves/:id/like', isAuthenticated, async (req, res) => {
  const shelfId = req.params.id;
  const userId = req.user.id;

  try {
    // TODO: Em tự tay viết logic truy vấn SQL toggle like tại đây nhé!
    const check = await db.query(
      'SELECT 1 FROM shelf_likes WHERE shelf_id = $1 AND user_id = $2',
      [shelfId, userId]
    );

    if (check.rows.length > 0) {
      await db.query('DELETE FROM shelf_likes WHERE shelf_id = $1 AND user_id = $2', [shelfId, userId]);
    } else {
      await db.query('INSERT INTO shelf_likes (shelf_id, user_id) VALUES ($1, $2)', [shelfId, userId]);
    }

    res.redirect(`/shelves/${shelfId}`);
  } catch (err) {
    console.error('Lỗi khi toggle like giá sách:', err.message);
    res.redirect(`/shelves/${shelfId}`);
  }
});

module.exports = router;
