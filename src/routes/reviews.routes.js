const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

/* ==========================================================================
   TEMPLATE ROUTE ĐÁNH GIÁ (REVIEWS) DÀNH CHO EM LẬP TRÌNH & ĐƯA VÀO CV:
   ========================================================================== */

/**
 * 1. [TEMPLATE] ĐĂNG HOẶC CHỈNH SỬA CẢM NHẬN (UPSERT REVIEW)
 * URL: POST /reviews/create
 * Body: { media_id, media_type, rating, content, contains_spoilers }
 * 
 * 💡 Gợi ý Backend cho em:
 * Trong database, bảng reviews có ràng buộc:
 * UNIQUE (user_id, media_id) -> Một user chỉ được có tối đa 1 bài review cho 1 tác phẩm.
 * Vì vậy, câu lệnh SQL chuyên nghiệp nhất ở đây là UPSERT (Insert nếu chưa có, Update nếu đã có):
 * 
 * INSERT INTO reviews (user_id, media_id, rating, content, contains_spoilers, created_at)
 * VALUES ($1, $2, $3, $4, $5, NOW())
 * ON CONFLICT (user_id, media_id)
 * DO UPDATE SET 
 *   rating = EXCLUDED.rating,
 *   content = EXCLUDED.content,
 *   contains_spoilers = EXCLUDED.contains_spoilers,
 *   created_at = NOW();
 */
router.post('/reviews/create', isAuthenticated, async (req, res) => {
  const { media_id, media_type, rating, content, contains_spoilers } = req.body;
  const userId = req.user.id;

  try {
    const parseRating = parseFloat(rating) || 5.0;
    const isSpoiler = contains_spoilers === 'true' || contains_spoilers === true;
    const query = `
      INSERT INTO reviews (user_id, media_id, rating, content, contains_spoilers, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, media_id)
      DO UPDATE SET 
        rating = EXCLUDED.rating,
        content = EXCLUDED.content,
        contains_spoilers = EXCLUDED.contains_spoilers,
        created_at = NOW();
    `;
    await db.query(query, [userId, media_id, parseRating, content, isSpoiler]);

    // Redirect về trang chi tiết sách hoặc phim tương ứng
    const routePrefix = media_type === 'MOVIE' ? 'movies' : 'books';
    res.redirect(`/${routePrefix}/${media_id}`);
  } catch (err) {
    console.error('Lỗi khi đăng/sửa review:', err.message);
    const routePrefix = media_type === 'MOVIE' ? 'movies' : 'books';
    res.redirect(`/${routePrefix}/${media_id}`);
  }
});

/**
 * 2. Xóa đánh giá (review) của chính mình
 * URL: POST /reviews/:id/delete
 */
router.post('/reviews/:id/delete', isAuthenticated, async (req, res) => {
  const reviewId = req.params.id;
  const { media_id, media_type } = req.body;
  try {
    await db.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2', [reviewId, req.user.id]);
    const routePrefix = media_type === 'MOVIE' ? 'movies' : 'books';
    res.redirect(`/${routePrefix}/${media_id}`);
  } catch (err) {
    console.error('Lỗi khi xóa review:', err.message);
    const routePrefix = media_type === 'MOVIE' ? 'movies' : 'books';
    res.redirect(`/${routePrefix}/${media_id}`);
  }
});

module.exports = router;
