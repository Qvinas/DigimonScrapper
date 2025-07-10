import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDeckdata, deckCount, getUniqueSortedValues } from "./deckModule.js";
import { getDeckComps } from "./scrapperV2.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

let deckdata;
let loadingDeckData = false;

app.use(async (req, res, next) => {
  if (!deckdata) {
    if (!loadingDeckData) {
      loadingDeckData = true;
      withTimeout(getDeckdata(), 5000)
        .then(data => {
          deckdata = data;
          loadingDeckData = false;
          console.log('Deck data loaded');
        })
        .catch(err => {
          loadingDeckData = false;
          console.error('Failed to load deck data:', err.message);
        });
    }
    return res.render('landing'); // Show landing page immediately
  }
  next();
});

app.get('/deckdata-ready', (req, res) => {
  res.json({ ready: !!deckdata });
});

app.get('/', (req, res) => {
        const counts = deckCount(deckdata);
        const deckfilter = getUniqueSortedValues(deckdata, 'deckType');
        const deckcolor = getUniqueSortedValues(deckdata, 'color');
        const deckplace = getUniqueSortedValues(deckdata, 'place');
        const tournment = getUniqueSortedValues(deckdata, 'tournment');

        res.render('index', {
            deckdata,
            counts,
            deckfilter,
            deckcolor,
            deckplace,
            tournment
        });
    } 
);

app.get('/deck/:deck', async (req, res) => {
  const { deck } = req.params;

  try {
    const cardData = await getDeckComps(deck, deckdata);
    res.render('deckData', {deck,cardData}); // send or render, up to you
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching deck components.");
  }
});

app.listen(3000, () => {
    //console.log("here")
})

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}
