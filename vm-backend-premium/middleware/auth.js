const API_KEY = process.env.API_KEY || 'your-secret-api-key-change-this';

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};
