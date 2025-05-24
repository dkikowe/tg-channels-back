const cron = require("node-cron");
const mongoose = require("mongoose");
const { parseCategory } = require("./parsing_telemetr/parsing");
const Channel = require("./parsing_telemetr/models/Channels");
require("dotenv").config();

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB подключено");

    // Запуск при старте после успешного подключения
    runTelemetrParser();

    // Cron: каждый час
    cron.schedule("0 * * * *", () => {
      console.log(`🕒 CRON запуск в ${new Date().toLocaleString()}`);
      runTelemetrParser();
    });
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к MongoDB:", err.message);
    process.exit(1);
  });

async function runTelemetrParser() {
  const categories = ["Новости", "Юмор"];

  for (const category of categories) {
    try {
      console.log(`⏳ Парсинг категории: ${category}`);
      const data = await parseCategory(category);

      // Удаляем старые записи по категории
      await Channel.deleteMany({
        "categories.name": { $regex: new RegExp(category, "i") },
      });

      // Сохраняем новые
      await Channel.insertMany(data);
      console.log(`✅ Готово: ${category}, сохранено ${data.length}`);
    } catch (err) {
      console.error(`❌ Ошибка в категории "${category}":`, err.message);
    }
  }
}

// Запуск при старте
runTelemetrParser();

// Cron: каждый час
cron.schedule("0 * * * *", () => {
  console.log(`🕒 CRON запуск в ${new Date().toLocaleString()}`);
  runTelemetrParser();
});
