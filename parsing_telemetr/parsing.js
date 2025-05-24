// parseCategory.js
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

puppeteer.use(StealthPlugin());

async function parseCategory(categorySlug) {
  const categoryUrl = `https://telemetr.me/channels/cat/${encodeURIComponent(
    categorySlug
  )}`;
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // загрузка cookies + UA
  try {
    const cookies = JSON.parse(fs.readFileSync("cookies.json", "utf8"));
    await page.setCookie(...cookies);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
  } catch {
    console.warn("⚠ Не удалось загрузить cookies.json");
  }

  // блокируем все картинки, кроме аватарок
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.resourceType() === "image") {
      if (req.url().includes("/tg/avatars/")) return req.continue();
      return req.abort();
    }
    req.continue();
  });

  // заходы на сайт
  await page.goto("https://telemetr.me", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await page.goto(categoryUrl, { waitUntil: "networkidle2", timeout: 60000 });

  // проверка авторизации
  if (await page.$("form[action*='login']")) {
    await browser.close();
    throw new Error("Вы не авторизованы. Обновите cookies.json.");
  }

  // ждём таблицу
  if (!(await page.$("tbody tr"))) {
    await browser.close();
    throw new Error("Таблица каналов не найдена.");
  }

  // парсим
  const channels = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    return rows.reduce((acc, tr, i) => {
      const titleEl = tr.querySelector("td.wd-300 a.kt-ch-title");
      if (!titleEl) return acc;

      const avatarEl = tr.querySelector("img.c-avatar");
      const avatar = avatarEl?.getAttribute("src") || null;

      const subsEl = tr.querySelector("span.kt-number.kt-font-brand");
      const subscribers = subsEl
        ? parseInt(subsEl.textContent.replace(/[^\d]/g, ""), 10)
        : null;

      const hrefRaw = titleEl.getAttribute("href") || "";
      const channelLink = hrefRaw.startsWith("http")
        ? hrefRaw
        : `https://telemetr.me${hrefRaw}`;

      const descriptionEl = tr.querySelector("span[data-cont]");
      let description = null;

      if (descriptionEl) {
        const html = descriptionEl.getAttribute("data-cont") || "";
        const firstPart = html.split("<br")[0];
        const div = document.createElement("div");
        div.innerHTML = firstPart;
        description = div.textContent.trim();
      }

      // доп. категории
      let categories = [];
      const next = rows[i + 1];
      if (next && next.querySelector("td.td-cats")) {
        categories = Array.from(
          next.querySelectorAll("td.td-cats a.btn-label-facebook")
        ).map((a) => ({
          name: a.textContent.trim().replace(/#\d+/, "").trim(),
          link: a.href.startsWith("http")
            ? a.href
            : `https://telemetr.me${a.getAttribute("href")}`,
        }));
        i++;
      }

      acc.push({
        title: titleEl.textContent.trim(),
        avatar,
        description,
        subscribers,
        channelLink,
        categories,
      });
      return acc;
    }, []);
  });

  await browser.close();
  return channels;
}

module.exports = { parseCategory };
