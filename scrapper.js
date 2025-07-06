const axios = require("axios");
const cheerio = require("cheerio");

//const url = "https://digimonmeta.com/deck-list/decklist-jp-cn-en-ex9-versus-monsters-bt22-cyber-eden/";

async function fetchHtml(url) {
    try {
        const response = await axios.get(url);
        //console.log(response)
        return response.data;
    } catch (error) {
        console.error("Error fetching HTML:", error);
        throw error;
    }
}

async function scrapePage(url){
    let rawhtml = await fetchHtml(url);

    //console.log(rawhtml)

    const $ = cheerio.load(rawhtml);

    const rows = $("#tablepress-62 tr")

    let decks = []

    rows.each((i, el) => {
        const cells = $(el).find("td");
        //let rowData = [];
        let deck = new Object();

        cells.each((j, td) => {
            let dados = $(td).text().trim()
            
            if(dados != '' && j == 0){
                deck.id = dados;
            }
            if(dados != '' && j == 2){
                deck.color = dados;
            }
            if(dados != '' && j == 3){
                deck.deckType = dados;
            }
            if(dados != '' && j == 4){
                deck.deck = dados;
            }
             if(dados != '' && j == 8){
                deck.place = dados;
            }
             if(dados != '' && j == 9){
                deck.tournment = dados;
            }
        });

        //console.log(`Row ${i + 1}:`, rowData);
        if (Object.keys(deck).length > 0) {
            decks.push(deck);
        }
    });

    return decks
}

/* (async () => {
    const deckdata = await scrapePage(url);
    //console.log(deckdata);
})(); */

module.exports = { scrapePage };
