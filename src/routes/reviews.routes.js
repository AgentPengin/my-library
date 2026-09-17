const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

/**
 * @route   POST /reviews/create
 * @desc    Create or update review for a media item (UPSERT)
 * @access  Private
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
 * @route   POST /reviews/:id/delete
 * @desc    Delete user's own review
 * @access  Private
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
