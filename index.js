const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const { runTelemetrParser } = require("./scheduler");

const {
  getChannelsByCategory,
} = require("./parsing_telemetr/controllers/ChannelsController");

const app = express();
const PORT = 3000;

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Подключение к MongoDB установлено"))
  .catch((err) => {
    console.error("❌ Ошибка подключения к MongoDB:", err.message);
    process.exit(1);
  });

app.use(
  cors({
    origin: ["http://localhost:5173", "https://tg-channels.vercel.app"],
    methods: ["GET"],
    credentials: true,
  })
);

// 👇 Добавляем GET-роут
app.get("/api/channels", getChannelsByCategory);

app.listen(PORT, () => {
  console.log(`✅ API запущен на http://localhost:${PORT}`);
});
