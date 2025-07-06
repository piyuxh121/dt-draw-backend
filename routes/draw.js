const express = require('express');
const router = express.Router();
const db = require('../db');

// ---------------------------
// 🎯 Execute a Lucky Draw
// ---------------------------
router.post('/execute', (req, res) => {
  const { customer_id, staff_id, draw_number } = req.body;

  const sql = 'SELECT * FROM prizes WHERE is_active = 1';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Prize selection failed', error: 'No active prizes found.' });
    }

    const randomPrize = results[Math.floor(Math.random() * results.length)];

    const insertSql = `
      INSERT INTO draw_history (customer_id, prize_id, draw_number, drawn_by_staff_id)
      VALUES (?, ?, ?, ?)
    `;
    db.query(insertSql, [customer_id, randomPrize.id, draw_number, staff_id], (insertErr, insertResult) => {
      if (insertErr) return res.status(500).json({ message: 'Draw save failed', error: insertErr });

      res.status(201).json({
        message: 'Draw completed successfully',
        prize: {
          id: randomPrize.id,
          name_en: randomPrize.name_en,
          name_hi: randomPrize.name_hi,
          image_url: randomPrize.image_url
        },
        draw_id: insertResult.insertId
      });
    });
  });
});

// ---------------------------
// 📜 View Draw History (with filters)
// ---------------------------
router.get('/draw-history', (req, res) => {
  const { customer_name, phone, delivered, year } = req.query;

  let sql = `
    SELECT dh.id, dh.draw_date, dh.draw_number, dh.delivered,
           c.name AS customer_name, c.phone, c.address,
           p.name_en, p.name_hi, p.image_url,
           s.name AS staff_name
    FROM draw_history dh
    JOIN customers c ON dh.customer_id = c.id
    JOIN prizes p ON dh.prize_id = p.id
    JOIN staffs s ON dh.drawn_by_staff_id = s.id
    WHERE 1 = 1
  `;

  const values = [];

  if (customer_name) {
    sql += ' AND c.name LIKE ?';
    values.push(`%${customer_name}%`);
  }

  if (phone) {
    sql += ' AND c.phone LIKE ?';
    values.push(`%${phone}%`);
  }

  if (delivered !== undefined) {
    sql += ' AND dh.delivered = ?';
    values.push(delivered === 'true' ? 1 : 0);
  }

  if (year) {
    sql += ' AND YEAR(dh.draw_date) = ?';
    values.push(year);
  }

  sql += ' ORDER BY dh.draw_date DESC';

  db.query(sql, values, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    res.json({ message: 'Draw history fetched successfully', history: results });
  });
});

module.exports = router;
