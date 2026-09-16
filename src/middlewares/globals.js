const db = require('../config/db');
const loadGlobalLocals = async (req, res, next) => {
  res.locals.currentUser = req.user;
  if (req.user) {
    try {
      const shelfRes = await db.query(
        'SELECT id, name, shelf_wood, is_public FROM shelves WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
      res.locals.allShelves = shelfRes.rows || [];
    } catch (e) {
      res.locals.allShelves = [];
    }
  } else {
    res.locals.allShelves = [];
  }
  next();
};

module.exports = {
  loadGlobalLocals,
};
