const db = require('../config/db');

async function getReviewList() {
    try {
        const data = await db.query(
            `WITH tmp AS (
                SELECT * 
                FROM reviews 
                ORDER BY random() 
                LIMIT 3
            )
            SELECT tmp.id, users.id, media_items.title, tmp.rating, tmp.content, tmp.contains_spoilers, tmp.created_at, users.username, users.avatar_url
            FROM tmp 
            JOIN users ON users.id = tmp.user_id
            JOIN media_items ON tmp.media_id = media_items.id`
        );
        const dataRows = data.rows || [];
        const reviews = dataRows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            media_id: row.title,
            rating: row.rating,
            content: row.content,
            contains_spoilers: row.contains_spoilers,
            created_at: row.created_at,
            user: {
                username: row.username || 'Độc giả thư viện',
                avatar_url: row.avatar_url || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4Ykql_OXy7qrC4I1_luoiAAPBYozVJFJvp6xJbUB3pbIxqwrbnUm82g&s=10',
            }
        }));
        return reviews;
    } catch (err) {
        console.error('Lỗi khi lấy danh sách review:', err.message);
    }
}

module.exports = {
    getReviewList,
};