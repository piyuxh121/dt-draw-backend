const express = require('express');
const router = express.Router();
const db = require('../db');

// 📦 ADD PRIZE
router.post('/add-prize', (req, res) => {
  const { name_en, name_hi, image_url } = req.body;
  const sql = `INSERT INTO prizes (name_en, name_hi, image_url) VALUES (?, ?, ?)`;
  db.query(sql, [name_en, name_hi, image_url], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error adding prize' });
    res.json({ message: 'Prize added', id: result.insertId });
  });
});

// ❌ DELETE PRIZE
router.delete('/delete-prize/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM prizes WHERE id = ?`;
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error deleting prize' });
    res.json({ message: 'Prize deleted' });
  });
});

// 📋 GET ALL DRAW HISTORY
router.get('/draws', (req, res) => {
  const sql = `
    SELECT dh.id, c.name AS customer_name, c.phone, c.address, c.year,
           p.name_en, p.name_hi, p.image_url,
           dh.number_selected, dh.staff_id, dh.delivery_status, dh.created_at
    FROM draw_history dh
    JOIN customers c ON dh.customer_id = c.id
    JOIN prizes p ON dh.prize_id = p.id
    ORDER BY dh.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error fetching draws' });
    res.json(results);
  });
});

// ✅ UPDATE DELIVERY STATUS
router.put('/update-delivery/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = `UPDATE draw_history SET delivery_status = ? WHERE id = ?`;
  db.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ error: 'Update failed' });
    res.json({ message: 'Delivery status updated' });
  });
});

// ✅ GET Draw History with Filters
router.get('/draw-history', (req, res) => {
  const { name, phone, delivered, year } = req.query;
  let sql = `
    SELECT dh.id, c.name AS customer_name, c.phone, c.address, 
           p.name_en AS prize_name, p.name_hi, p.image_url, 
           dh.draw_number, dh.delivered, dh.draw_date, s.name AS staff_name
    FROM draw_history dh
    JOIN customers c ON dh.customer_id = c.id
    JOIN prizes p ON dh.prize_id = p.id
    JOIN staffs s ON dh.drawn_by_staff_id = s.id
    WHERE 1 = 1
  `;
  const params = [];

  if (name) {
    sql += ' AND c.name LIKE ?';
    params.push(`%${name}%`);
  }

  if (phone) {
    sql += ' AND c.phone LIKE ?';
    params.push(`%${phone}%`);
  }

  if (delivered !== undefined) {
    sql += ' AND dh.delivered = ?';
    params.push(delivered === 'true' ? 1 : 0);
  }

  if (year) {
    sql += ' AND YEAR(dh.draw_date) = ?';
    params.push(year);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'DB Error', error: err });
    res.json(results);
  });
});

// ✅ Admin Stats Route
router.get('/stats', (req, res) => {
  const stats = {};

  const q1 = `SELECT COUNT(*) AS totalCustomers FROM customers`;
  const q2 = `SELECT COUNT(*) AS totalDraws FROM draw_history`;
  const q3 = `SELECT COUNT(*) AS pendingDeliveries FROM draw_history WHERE delivered = 0`;
  const q4 = `
    SELECT p.name_en, p.name_hi, p.image_url, COUNT(*) as count
    FROM draw_history dh
    JOIN prizes p ON dh.prize_id = p.id
    GROUP BY dh.prize_id
    ORDER BY count DESC
    LIMIT 1
  `;

  db.query(q1, (err, r1) => {
    if (err) return res.status(500).json({ error: 'Error fetching total customers', err });
    stats.totalCustomers = r1[0].totalCustomers;

    db.query(q2, (err, r2) => {
      if (err) return res.status(500).json({ error: 'Error fetching total draws', err });
      stats.totalDraws = r2[0].totalDraws;

      db.query(q3, (err, r3) => {
        if (err) return res.status(500).json({ error: 'Error fetching pending deliveries', err });
        stats.pendingDeliveries = r3[0].pendingDeliveries;

        db.query(q4, (err, r4) => {
          if (err) return res.status(500).json({ error: 'Error fetching most common prize', err });
          stats.mostPrize = r4[0] || { name_en: '-', name_hi: '-', image_url: '' };
          res.json(stats);
        });
      });
    });
  });
});

module.exports = router;
