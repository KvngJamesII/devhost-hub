const API_KEY = process.env.VM_API_KEY;

module.exports = (req, res, next) => {
  if (!API_KEY) {
    console.error('VM_API_KEY not configured!');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
