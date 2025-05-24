const mongoose = require("mongoose");

const ChannelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    avatar: { type: String, default: null },
    description: { type: String, default: null },
    subscribers: { type: Number, default: null },
    channelLink: { type: String, required: true },
    pageCategory: { type: String, default: null },
    categories: [
      {
        name: String,
        link: String,
      },
    ],
    source: { type: String, default: "telemetr" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Channel", ChannelSchema);
