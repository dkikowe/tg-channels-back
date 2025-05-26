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
  const categories = [
    "Новости",
    "Игры",
    "Литература",
    "Музыка",
    "Фото",
    "Блогеры",
    "Халява и скидки",
    "Сервисы",
    "Животные",
    "Экология",
    "Путешествия",
    "Юмор",
    "Цитаты",
    "Для мужчин",
    "Маркетплейсы",
    "Однострочные",
    "Психология",
    "Политика",
    "Эзотерика",
    "Рукоделие",
    "Спорт",
    "Технические каналы",
    "Авто и мото",
    "IT",
    "Кулинария",
    "Криптовалюты",
    "Недвижимость",
    "Бизнес и финансы",
    "Карьера",
    "Здоровье",
    "Юриспруденция",
    "Образование",
    "ЕГЭ и экзамены",
    "Религия",
    "Наука и технологии",
    "Познавательные",
    "Казахстанские каналы",
    "Армянские каналы",
    "Белорусские каналы",
    "Киргизские каналы",
    "Молдавские каналы",
    "Таджикские каналы",
    "Узбекские каналы",
    "Грузинские каналы",
  ];

  for (const category of categories) {
    try {
      console.log(`⏳ Парсинг категории: ${category}`);
      const data = await parseCategory(category);

      let updated = 0;
      for (const channel of data) {
        const filter = { channelLink: channel.channelLink };
        const update = {
          $set: {
            ...channel,
            updatedAt: new Date(),
          },
        };
        const options = { upsert: true, new: true };
        await Channel.findOneAndUpdate(filter, update, options);
        updated++;
      }

      console.log(`✅ Готово: ${category}, обновлено/добавлено ${updated}`);
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
