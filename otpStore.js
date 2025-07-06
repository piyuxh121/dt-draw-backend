// backend/otpStore.js
const otpMap = new Map();

function saveOTP(phone, otp) {
  otpMap.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 }); // expires in 5 min
}

function verifyOTP(phone, enteredOtp) {
  const data = otpMap.get(phone);
  if (!data) return false;
  if (Date.now() > data.expires) {
    otpMap.delete(phone);
    return false;
  }
  const valid = data.otp === enteredOtp;
  if (valid) otpMap.delete(phone); // one-time use
  return valid;
}

module.exports = { saveOTP, verifyOTP };
