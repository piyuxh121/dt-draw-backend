// backend/server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const staffRoutes = require("./routes/staff");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));
app.use("/api/staff", staffRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
