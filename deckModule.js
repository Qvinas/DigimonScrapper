//const  { scrapePage } = require('./scrapper.js');
//const { getDecks } = require('./scrapperV2.js');

import { getDecks } from './scrapperV2.js';

export async function getDeckdata(){
    const deckdata = await getDecks();
    
    deckdata.sort((a, b) => {
        if (!a.deck) return 1;
        if (!b.deck) return -1;
        return a.deck.localeCompare(b.deck);
    });

    return deckSort(deckdata)
}

function deckSort(deckdata){
    deckdata.sort((a, b) => {
        if (!a.deck) return 1;
        if (!b.deck) return -1;
        return a.deck.localeCompare(b.deck);
    });

    return deckdata
}

export function deckCount(deckdata){
    const deckcounts = deckdata.reduce((acc, item) => {
        const deckName = item.deck || "Unknown";
        acc[deckName] = (acc[deckName] || 0) + 1;
        return acc;
    }, {});

    const sortedDeckCounts = Object.entries(deckcounts)
    .sort((a, b) => b[1] - a[1]);  // sort descending by count

    return sortedDeckCounts
}
