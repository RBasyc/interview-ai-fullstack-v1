const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('./config');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (!payload.tenantId) {
      return done(null, false);
    }
    // 面试简化：token claims 即为 user 上下文，不查数据库
    done(null, { id: payload.sub, tenantId: payload.tenantId, role: payload.role });
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = { jwtStrategy };
