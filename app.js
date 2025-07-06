const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const staffRoutes = require('./routes/staff');
const drawRoutes = require('./routes/draw');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());

// ✅ Serve uploaded files (customer photos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Routes
app.use('/api/staff', staffRoutes);
app.use('/api/draw', drawRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
