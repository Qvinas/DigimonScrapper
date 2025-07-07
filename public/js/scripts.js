function filterTable(filter,filterValue){
    console.log(filter, ' - ' ,filterValue)
    const table = document.querySelector('#deckTable')
    const rows = table.children[1].children
    
    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let cols = row.children;

        // Find the column with the filter class
        let filteredCol = Array.from(cols).find(col => col.classList.contains(filter));

        if (filteredCol) {
            if (filteredCol.outerText.trim() !== filterValue) {
                row.style.display = 'none';
            } else {
                row.style.display = 'table-row';
            }
        } else {
            row.style.display = 'none';
        }
    }

}   