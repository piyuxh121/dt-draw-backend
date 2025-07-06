// backend/controllers/staffController.js
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { saveOTP, verifyOTP } = require("../otpStore");

const sendOtp = (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  saveOTP(phone, otp);

  // Mock sending OTP (you'll replace this with real SMS API like Twilio or Fast2SMS)
  console.log(`📲 OTP for ${phone}: ${otp}`);
  res.json({ success: true, message: "OTP sent (check console)" });
};

const verifyOtp = (req, res) => {
  const { phone, otp } = req.body;

  if (verifyOTP(phone, otp)) {
    res.json({ success: true, message: "OTP verified" });
  } else {
    res.status(400).json({ success: false, message: "Invalid or expired OTP" });
  }
};

const registerStaff = (req, res) => {
  const { name, phone, password } = req.body;
  const photo = req.file?.filename;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: "Password hashing failed" });

    const sql = "INSERT INTO staff (name, phone, password, photo) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, phone, hashedPassword, photo], (err) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json({ success: true, message: "Staff registered ✅" });
    });
  });
};

module.exports = { sendOtp, verifyOtp, registerStaff };
