const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { key, placeName, ip } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    // Логируем использование
    const { error } = await supabase
      .from('key_usage_logs')
      .insert({
        key: key,
        place_name: placeName || 'Unknown',
        ip_address: ip || 'Unknown',
        used_at: new Date().toISOString()
      });

    if (error) {
      console.error('Log error:', error);
    }

    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Log usage error:', error);
    res.status(500).json({ error: 'Logging failed' });
  }
};
