import axios from "axios";
import * as cheerio from "cheerio";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import pLimit from "p-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.resolve(__dirname, "cache");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

async function getOrSetCache(key, fetchFn, isJson = false) {
  const hash = crypto.createHash("md5").update(key).digest("hex");
  const ext = isJson ? ".json" : ".html";
  const filePath = path.join(CACHE_DIR, `${hash}${ext}`);

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const age = Date.now() - stats.mtimeMs;

    if (age < CACHE_TTL) {
      //console.log(`Using cached ${isJson ? "JSON" : "HTML"} for: ${key}`);
      const data = fs.readFileSync(filePath, "utf8");
      return isJson ? JSON.parse(data) : data;
    } else {
      //console.log(`Cache expired for: ${key}`);
    }
  } else {
    //console.log(`No cache found for: ${key}`);
  }

  const freshData = await fetchFn();
  fs.writeFileSync(filePath, isJson ? JSON.stringify(freshData, null, 2) : freshData, "utf8");

  return freshData;
}

async function fetchHtml(url) {
  return await getOrSetCache(
    url,
    async () => {
      const response = await axios.get(url);
      return response.data;
    },
    false
  );
}

async function scrapePageHome() {
  const url = "https://digimonmeta.com/deck-list/";
  let rawhtml = await fetchHtml(url);

  const $ = cheerio.load(rawhtml);

  const urlList = [];

  const links = $("a");
  for (let i = 0; i < links.length; i++) {
    const href = $(links[i]).attr("href") || "";
    if (href.includes("https://digimonmeta.com/deck-list/dec")) {
      urlList.push(href);
    }
    if (urlList.length === 4) {
      break;
    }
  }
  return urlList;
}

async function getDecksbyURL(url) {
  return await getOrSetCache(
    url + "::parsedDecks",
    async () => {
      const rawhtml = await fetchHtml(url);
      const $ = cheerio.load(rawhtml);
      const rows = $('[id^="tablepress-"] tr');

      let decks = [];

      rows.each((i, el) => {
        const cells = $(el).find("td");
        let deck = {};

        cells.each((j, td) => {
          const data = $(td).text().trim();
          const link = $(td).find("a").attr("href");
          if (data !== "") {
            if (j === 0) deck.id = data;
            if (j === 2) deck.color = data;
            if (j === 3) deck.deckType = data;
            if (j === 4) deck.deck = data;
            if (j === 5) deck.date = toSortableDate(data);
            if (j === 8) deck.place = data;
            if (j === 9) deck.tournment = data;
          }
          if (link) deck.link = link
        });

        if (Object.keys(deck).length > 0) {
          decks.push(deck);
        }
      });

      return decks;
    },
    true
  );
}

function toSortableDate(dateStr) {
  const [month, day, year] = dateStr.split("/");
  return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
}

const limit = pLimit(4); 

async function getDecks(month = 2) {
  const urlList = await scrapePageHome();
  const promises = urlList.map((url) =>
    limit(() =>
      getDecksbyURL(url).catch((err) => {
        console.error(`Failed fetching ${url}:`, err.message);
        return [];
      })
    )
  );
  const results = await Promise.all(promises);
  const allDecks = results.flat();
  const recentDecks = filterRecentDecks(allDecks,month);
  return recentDecks;
}

function filterRecentDecks(decks,months) {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setMonth(now.getMonth() - months);

  return decks.filter(deck => {
    if (!deck.date) return false;
    const [year, month, day] = deck.date.split('/').map(Number);
    const deckDate = new Date(year, month - 1, day);
    return deckDate >= cutoff;
  });
}

async function getDeckCompsbyUrl(url){
 return await getOrSetCache(
    url + "::parsedDecks",
    async () => {
      const rawhtml = await fetchHtml(url);
      const $ = cheerio.load(rawhtml);

      let links = [];

      $("#media-gallery > div.row > div.column").each((i, el) => {
        const $el = $(el);

        const href = $el.find("a.foobox").attr("href");
        const quantityText = $el.find("figcaption").text().trim();
        const quantity = parseInt(quantityText.replace(/\D/g, ''), 10); // Extract number

        links.push({ href, quantity });
      });

      return links;
    },
    true
  );
}

async function getDeckComps(deckname, decks) {
  let filteredDecks = decks.filter((deck) => deck.deck === deckname);

  let ndeck = 0;
  const promises = filteredDecks.map((deck) => {
    ndeck++
    let url = `https://digimonmeta.com/deck-list/${deck.link}`;
    return getDeckCompsbyUrl(url);
  });

  let CardsDataRaw = await Promise.all(promises);

  let CardsData = CardsDataRaw.flat();CardsDataRaw

  const hrefMap = CardsData.reduce((map, { href, quantity }) => {
    map.set(href, (map.get(href) || 0) + (quantity / ndeck));
    return map;
  }, new Map());

  const uniqueCards = Array.from(hrefMap, ([href, quantity]) => ({ href, quantity }));

  uniqueCards.sort((a, b) => b.quantity - a.quantity);

  //console.log(uniqueCards)
  return uniqueCards;
}

export { getDecks, getDeckComps };
