function requireRole(roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };
}

function ensureRole(roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user || !roles.includes(user.role)) {
      return res.redirect('/');
    }
    next();
  };
}

module.exports = { requireRole, ensureRole };
