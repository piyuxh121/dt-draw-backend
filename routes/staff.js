const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const SECRET_KEY = 'your_secret_key';

// ✅ Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Multer config for storing uploaded photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// --------------------
// ✅ Test Route
// --------------------
router.get('/test', (req, res) => {
  res.json({ message: 'Staff route working!' });
});

// --------------------
// ✅ Staff Registration
// --------------------
router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO staffs (name, email, phone, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, email, phone, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Email already exists' });
        }
        return res.status(500).json({ message: 'Database error', error: err });
      }
      res.status(201).json({ message: 'Staff registered successfully', staffId: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// --------------------
// ✅ Staff Login
// --------------------
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const sql = 'SELECT * FROM staffs WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name } });
  });
});

// --------------------
// ✅ Register Customer with Photo
// --------------------
router.post('/customers', upload.single('photo'), (req, res) => {
  const { name, phone, address, registered_by_staff_id } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (!name || !phone || !address || !registered_by_staff_id) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const sql = 'INSERT INTO customers (name, phone, address, photo, registered_by_staff_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [name, phone, address, photo, registered_by_staff_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(201).json({ message: 'Customer registered with photo', customerId: result.insertId });
  });
});

// --------------------
// ✅ Upload/Update Customer Photo
// --------------------
router.post('/customer/:id/upload-photo', upload.single('photo'), (req, res) => {
  const customerId = req.params.id;
  const photoPath = req.file ? req.file.filename : null;

  if (!photoPath) {
    return res.status(400).json({ message: 'Photo is required' });
  }

  const sql = 'UPDATE customers SET photo = ? WHERE id = ?';
  db.query(sql, [photoPath, customerId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found' });

    res.json({ message: 'Photo uploaded successfully', photo: photoPath });
  });
});

// --------------------
// ✅ View Draw History with Filters
// --------------------
router.get('/draw-history', (req, res) => {
  const { name, phone, delivered, year, address } = req.query;

  let sql = `
    SELECT dh.id, c.name AS customer_name, c.phone, c.address, c.photo,
           p.name_en, p.name_hi, p.image_url,
           s.name AS staff_name, dh.delivered, dh.draw_date
    FROM draw_history dh
    JOIN customers c ON dh.customer_id = c.id
    JOIN prizes p ON dh.prize_id = p.id
    JOIN staffs s ON dh.drawn_by_staff_id = s.id
    WHERE 1=1
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

  if (address) {
    sql += ' AND c.address LIKE ?';
    params.push(`%${address}%`);
  }

  if (delivered === 'true' || delivered === 'false') {
    sql += ' AND dh.delivered = ?';
    params.push(delivered === 'true' ? 1 : 0);
  }

  if (year) {
    sql += ' AND YEAR(dh.draw_date) = ?';
    params.push(year);
  }

  sql += ' ORDER BY dh.draw_date DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json({ history: results });
  });
});

// --------------------
// ✅ Mark Prize as Delivered
// --------------------
router.patch('/draws/:id/delivered', (req, res) => {
  const drawId = req.params.id;
  const { delivered } = req.body;

  if (typeof delivered !== 'boolean') {
    return res.status(400).json({ message: 'Delivered must be true or false' });
  }

  const sql = 'UPDATE draw_history SET delivered = ? WHERE id = ?';
  db.query(sql, [delivered, drawId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Draw ID not found' });

    res.json({ message: 'Delivery status updated successfully' });
  });
});

module.exports = router;
