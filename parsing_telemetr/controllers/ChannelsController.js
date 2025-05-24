const Channel = require("../models/Channels"); // модель канала

const getChannelsByCategory = async (req, res) => {
  const { category } = req.query;

  if (!category) {
    return res.status(400).json({ error: "Missing 'category' parameter" });
  }

  try {
    const channels = await Channel.find({
      "categories.name": { $regex: new RegExp(category, "i") }, // поиск по вложенным категориям
    }).sort({ subscribers: -1 });

    res.json(channels);
  } catch (error) {
    console.error("❌ Ошибка при получении каналов из базы:", error.message);
    res.status(500).json({ error: "Database query failed" });
  }
};

module.exports = { getChannelsByCategory };
