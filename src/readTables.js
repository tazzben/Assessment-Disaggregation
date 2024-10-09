const fs = require('fs')
const csv = require('csv-parser');
const stripBom = require('remove-bom-stream');
const path = require('path');


const startUp = () => {
    let tables = [];

    const findFiles = (dir = 'tables', extension = 'csv') => {
        const p = path.join(__dirname, dir);
        const files = fs.readdirSync(p);
        return files.filter(file => file.endsWith(extension));
    };
    
    const loopTableFiles = () => {
        const files = findFiles();
        for (const file of files) {
            const filePath = path.join(__dirname, 'tables', file);
            readTable(filePath);
        }
    };
    
    const readTable = (file) => {
        let results = [];
        fs.createReadStream(file)
            .pipe(stripBom('utf-8'))
            .pipe(csv({
                mapHeaders: ({
                    header,
                }) => header.toString().toLowerCase().trim()
            }))
            .on('data', (row) => results.push(row))
            .on('end', () => {
                const tableName = path.basename(file, '.csv');

                const regex = /(\D+)(\d+)/;
                const match = tableName.match(regex);
                if (match) {
                    const [_, text, number] = match;
                    results = results.map(row => ({ ...row, question_options: number, simulation_type: text }));
                }
                tables = [...tables, ...results];
            });
    };
    const getTables = () => tables;

    loopTableFiles();

    return getTables;
};

module.exports = startUp;
