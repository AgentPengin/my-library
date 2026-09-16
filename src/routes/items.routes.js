const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getBook } = require('../services/books.service');
const { getFilm } = require('../services/films.service');

// Helper phân tách Reviews thành: myReview, curatorReview và communityReviews
async function processItemReviews(mediaId, currentUserId, curatorId) {
  const reviewsQuery = await db.query(
    `SELECT r.*, u.username, u.avatar_url 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.media_id = $1 
     ORDER BY r.created_at DESC`,
    [mediaId]
  );
  const allReviews = reviewsQuery.rows || [];

  let myReview = null;
  let curatorReview = null;
  let communityReviews = [];

  for (const rev of allReviews) {
    if (currentUserId && rev.user_id === currentUserId) {
      myReview = rev;
    } else if (curatorId && rev.user_id === curatorId) {
      curatorReview = rev;
    } else {
      communityReviews.push(rev);
    }
  }

  return { myReview, curatorReview, communityReviews, totalReviewsCount: allReviews.length };
}

// 1. TRANG CHI TIẾT SÁCH (GOOGLE BOOKS / DB)
router.get('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  const curatorId = req.query.curator || null;
  const fromShelf = req.query.from_shelf || null;

  try {
    const item = await getBook(bookId);
    if (!item) {
      return res.status(404).send('Không tìm thấy cuốn sách này.');
    }

    const currentUserId = req.user ? req.user.id : null;
    const { myReview, curatorReview, communityReviews, totalReviewsCount } =
      await processItemReviews(bookId, currentUserId, curatorId);

    // Gắn thông tin review đã phân loại vào đối tượng item
    item.reviews = communityReviews;
    item.myReview = myReview;
    item.curatorReview = curatorReview;
    item.total_reviews = totalReviewsCount;

    res.render('pages/item-detail', {
      item,
      myReview,
      curatorReview,
      fromShelf,
    });
  } catch (err) {
    console.error('Lỗi khi tải chi tiết sách:', err);
    res.status(500).send('Lỗi máy chủ khi tải cuốn sách này.');
  }
});

// 2. TRANG CHI TIẾT PHIM (TMDB / DB)
router.get('/movies/:id', async (req, res) => {
  const movieId = req.params.id;
  const curatorId = req.query.curator || null;
  const fromShelf = req.query.from_shelf || null;

  try {
    const item = await getFilm(movieId);
    if (!item) {
      return res.status(404).send('Không tìm thấy bộ phim này.');
    }

    const currentUserId = req.user ? req.user.id : null;
    const { myReview, curatorReview, communityReviews, totalReviewsCount } =
      await processItemReviews(movieId, currentUserId, curatorId);

    item.reviews = communityReviews;
    item.myReview = myReview;
    item.curatorReview = curatorReview;
    item.total_reviews = totalReviewsCount;

    res.render('pages/item-detail', {
      item,
      myReview,
      curatorReview,
      fromShelf,
    });
  } catch (err) {
    console.error('Lỗi khi tải chi tiết phim:', err);
    res.status(500).send('Lỗi máy chủ khi tải bộ phim này.');
  }
});

module.exports = router;
