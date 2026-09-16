const localStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const db = require('./db');

function configurePassport(passport) {
  passport.use(
    new localStrategy(
      {
        usernameField: 'identifier',
        passwordField: 'password',
      },
      async (identifier, password, done) => {
        try {
          const result = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [identifier]
          );
          const user = result.rows[0];
          if (!user) {
            return done(null, false, {
              message: 'Username hoặc Email này chưa được đăng ký trong thư viện!',
            });
          }

          const isMatch = await bcrypt.compare(password, user.password_hash);
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, {
              message: 'Mật khẩu không chính xác. Xin vui lòng thử lại!',
            });
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await db.query(
        'SELECT id, email, username, avatar_url, bio FROM users WHERE id = $1',
        [id]
      );
      done(null, result.rows[0]);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = configurePassport;
