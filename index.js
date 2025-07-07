import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDeckdata, deckCount, getUniqueSortedValues } from "./deckModule.js";

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


app.get('/Stats', async (req, res) => {
    try {
        const deckdata = await withTimeout(getDeckdata(), 5000);
        const counts = deckCount(deckdata);
        const deckfilter = [...new Set(deckdata.map(item => item.deckType))].sort();
        const deckcolor = [...new Set(deckdata.map(item => item.color))].sort();
        const deckplace = [...new Set(deckdata.map(item => item.place))].sort();
        const tournment = [...new Set(deckdata.map(item => item.tournment))].sort();
        res.render('index', { deckdata, counts, deckfilter, deckcolor,deckplace, tournment});
    } catch (err) {
        console.error('Error in / route:', err.message);
        res.status(500).render('error', { message: 'Failed to load deck data. Try again later.' });
    }
});

app.get('/deck/:deck', (req,res) => {
    const {deck} = req.params
    res.send(`Inicio ${deck}`)
})

app.listen(3000, () => {
    //console.log("here")
})

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}
