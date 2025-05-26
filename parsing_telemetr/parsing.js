// parseCategory.js
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

puppeteer.use(StealthPlugin());

/**
 * Парсит все каналы и вложенные категории на странице telemetr.me/cat/:slug
 * @param {string} categorySlug — человекочитаемый slug категории, например "авто и мото"
 * @returns {Promise<Array<{
 *   title: string,
 *   avatar: string|null,
 *   description: string|null,
 *   subscribers: number|null,
 *   channelLink: string,
 *   categories: Array<{ name: string, link: string }>
 * }>>}
 */
async function parseCategory(categorySlug) {
  const categoryUrl = `https://telemetr.me/channels/cat/${encodeURIComponent(
    categorySlug
  )}`;
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
    ],
  });
  const page = await browser.newPage();

  // Попытка загрузить cookies и установить User-Agent
  try {
    const cookies = JSON.parse(fs.readFileSync("cookies.json", "utf8"));
    if (Array.isArray(cookies)) {
      await page.setCookie(...cookies);
    }
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/122.0.0.0 Safari/537.36"
    );
  } catch {
    console.warn("⚠ Не удалось загрузить cookies.json или установить UA");
  }

  // Блокируем все картинки, кроме аватарок
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.resourceType() === "image") {
      if (req.url().includes("/tg/avatars/")) {
        req.continue();
      } else {
        req.abort();
      }
    } else {
      req.continue();
    }
  });

  // Делаем переходы: сначала главная для применения cookies, затем категория
  await page.goto("https://telemetr.me", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await page.goto(categoryUrl, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Проверяем, не перевели ли нас на страницу логина
  if (await page.$("form[action*='login']")) {
    await browser.close();
    throw new Error("Вы не авторизованы — обновите cookies.json");
  }

  // Ждём появления хотя бы одной строки в таблице
  await page.waitForSelector("tbody tr", { timeout: 30000 });

  // Выполняем парсинг прямо в контексте страницы
  const channels = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    const out = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const tr = rows[idx];
      const titleEl = tr.querySelector("td.wd-300 a.kt-ch-title");
      if (!titleEl) continue;

      // Собираем основные поля
      const avatarEl = tr.querySelector("img.c-avatar");
      const avatar = avatarEl ? avatarEl.src : null;

      const subsEl = tr.querySelector("span.kt-number.kt-font-brand");
      const subscribers = subsEl
        ? parseInt(subsEl.textContent.replace(/[^\d]/g, ""), 10)
        : null;

      const hrefRaw = titleEl.getAttribute("href") || "";
      const channelLink = hrefRaw.startsWith("http")
        ? hrefRaw
        : `https://telemetr.me${hrefRaw}`;

      const descEl = tr.querySelector("span[data-cont]");
      let description = null;
      if (descEl) {
        const html = descEl.getAttribute("data-cont") || "";
        const snippet = html.split("<br")[0];
        const div = document.createElement("div");
        div.innerHTML = snippet;
        description = div.textContent.trim();
      }

      // Готовим сущность канала
      const channel = {
        title: titleEl.textContent.trim(),
        avatar,
        description,
        subscribers,
        channelLink,
        categories: [],
      };

      // Если следующая строка содержит категории — собираем их
      const nextTr = rows[idx + 1];
      if (nextTr && nextTr.querySelector("td.td-cats")) {
        const catLinks = nextTr.querySelectorAll(
          "td.td-cats a.btn-label-facebook"
        );
        channel.categories = Array.from(catLinks).map((a) => {
          const name = a.textContent.trim().replace(/#\d+/, "").trim();
          const href = a.getAttribute("href") || "";
          const link = href.startsWith("http")
            ? href
            : `https://telemetr.me${href}`;
          return { name, link };
        });
        idx++; // пропускаем строку с категориями
      }

      out.push(channel);
    }

    return out;
  });

  await browser.close();
  return channels;
}

module.exports = { parseCategory };
