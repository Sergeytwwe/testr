module.exports = async (req, res) => {
  res.json({ status: 'working', timestamp: new Date().toISOString() });
};
