const fs  = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


const calcGamma = (Options, NL, PL, RL) => {
    return Options > 1 ? (Options * (NL + PL * Options + RL - 1)) / (Options - 1) ** 2 : Number.NaN;
};

const calcMu = (Options, NL, RL) => {
    return Options > 1 ? (NL + RL - 1) / (Options - 1) + NL + RL : Number.NaN;
};

const calcAlpha = (Options, NL, PL, RL) => {
    return Options > 1 ? (Options * (NL * Options + PL + RL - 1)) / (Options - 1) ** 2 : Number.NaN;
};

const calcFlow = (Options, NL, PL, RL) => {
    return calcGamma(Options, NL, PL, RL) -  calcAlpha(Options, NL, PL, RL);
};

const calcGammaGain = (Options, NL, PL, RL) => {
    return calcGamma(Options, NL, PL, RL) / (1 - calcMu(Options, NL, RL));
};

const calcGammaGainZero = (NL, PL, RL) => {
    return NL + RL < 1 ? (PL - NL) / (1 - NL - RL) : Number.NaN;
};

const sumReducer = (accumulator, currentValue) => accumulator + currentValue;

const questionAnalysis = (db, filename) => {
    let exportArray = [];
    const dataset = db.buildMatched();
    for (let row of dataset){
        let r = {
            Q: row.Q,
            PL: row.PL,
            RL: row.RL,
            ZL: row.ZL,
            NL: row.NL,
            PreTest: row.NL + row.RL,
            PostTest: row.RL + row.PL,
            Delta: row.PL - row.NL,
            Gamma: calcGamma(row.Options, row.NL, row.PL, row.RL),
            Mu: calcMu(row.Options, row.NL, row.RL),
            Alpha: calcAlpha(row.Options, row.NL, row.PL, row.RL),
            Flow: calcFlow(row.Options, row.NL, row.PL, row.RL),
            GammaGain: calcGammaGain(row.Options, row.NL, row.PL, row.RL),
            GammaGainZero: calcGammaGainZero(row.NL, row.PL, row.RL)
        };
        exportArray.push(r);
    }
    const csvWriter = createCsvWriter({
         path: filename,
         header: [
            {id: 'Q', title: 'Q'},
            {id: 'PL', title: 'PL'},
            {id: 'RL', title: 'RL'},
            {id: 'ZL', title: 'ZL'},
            {id: 'NL', title: 'NL'},
            {id: 'PreTest', title: 'PreTest'},
            {id: 'PostTest', title: 'PostTest'},
            {id: 'Delta', title: 'Delta'},
            {id: 'Gamma', title: 'Gamma'},
            {id: 'Mu', title: 'Mu'},
            {id: 'Alpha', title: 'Alpha'},
            {id: 'Flow', title: 'Flow'},
            {id: 'GammaGain', title: 'GammaGain'},
            {id: 'GammaGainZero', title: 'GammaGainZero'}
         ]
    });
    csvWriter.writeRecords(exportArray).then(() => {
        console.log('...Done');
    });
};

const studentAnalysis = (db, filename, group = false) => {
    let exportArray = [];
    let dataset = db.buildMatched(true);
    
    dataset.push([{
        id: 0,
        Options: 0
    }]);

    let rowGroup = {
            PL: [],
            RL: [],
            ZL: [],
            NL: [],
            PreTest: [],
            PostTest: [],
            Delta: [],
            Gamma: [],
            Mu: [],
            Alpha: [],
            Flow: [],
            c: []
    };

    const clearGroup = JSON.parse(JSON.stringify(rowGroup));
    let currentOptions = 0;
    let currentId = 0;
    for (let row of dataset){
        if (!((row.Options == currentOptions || group) && row.id == currentId || (currentOptions == 0 && currentId == 0))){
            let totQs = rowGroup["c"].reduce(sumReducer, 0);
            let r = {
                id: currentId,
                Options: currentOptions,
                Questions: totQs,
                PL: rowGroup["PL"].reduce(sumReducer, 0) / totQs,
                RL: rowGroup["RL"].reduce(sumReducer, 0) / totQs,
                ZL: rowGroup["ZL"].reduce(sumReducer, 0) / totQs,
                NL: rowGroup["NL"].reduce(sumReducer, 0) / totQs,
                PreTest: rowGroup["PreTest"].reduce(sumReducer, 0) / totQs,
                PostTest: rowGroup["PostTest"].reduce(sumReducer, 0) / totQs,
                Delta: rowGroup["Delta"].reduce(sumReducer, 0) / totQs,
                Gamma: rowGroup["Gamma"].reduce(sumReducer, 0) / totQs,
                Mu: rowGroup["Mu"].reduce(sumReducer, 0) / totQs,
                Alpha: rowGroup["Alpha"].reduce(sumReducer, 0) / totQs,
                Flow: rowGroup["Flow"].reduce(sumReducer, 0) / totQs,
                GammaGain: (rowGroup["Gamma"].reduce(sumReducer, 0) / totQs)/(1 - rowGroup["Mu"].reduce(sumReducer, 0) / totQs),
                GammaGainZero: calcGammaGainZero(rowGroup["NL"].reduce(sumReducer, 0) / totQs, rowGroup["PL"].reduce(sumReducer, 0) / totQs, rowGroup["RL"].reduce(sumReducer, 0) / totQs)
            };
            exportArray.push(r);
            rowGroup = JSON.parse(JSON.stringify(clearGroup));
        }
        rowGroup["PL"].push(row.PL * row.c);
        rowGroup["RL"].push(row.RL * row.c);
        rowGroup["ZL"].push(row.ZL * row.c);
        rowGroup["NL"].push(row.NL * row.c);
        rowGroup["PreTest"].push((row.NL + row.RL) * row.c);
        rowGroup["PostTest"].push((row.RL + row.PL) * row.c);
        rowGroup["Delta"].push((row.PL - row.NL) * row.c);
        rowGroup["Gamma"].push(calcGamma(row.Options, row.NL, row.PL, row.RL) * row.c);
        rowGroup["Mu"].push(calcMu(row.Options, row.NL, row.RL) * row.c);
        rowGroup["Alpha"].push(calcAlpha(row.Options, row.NL, row.PL, row.RL) * row.c);
        rowGroup["Flow"].push(calcFlow(row.Options, row.NL, row.PL, row.RL) * row.c);
        rowGroup["c"].push(row.c);
        currentOptions = row.Options;
        currentId  = row.id;
    }
    let defaultHeader = [
        {id: 'Questions', title: 'Questions'},
        {id: 'PL', title: 'PL'},
        {id: 'RL', title: 'RL'},
        {id: 'ZL', title: 'ZL'},
        {id: 'NL', title: 'NL'},
        {id: 'PreTest', title: 'PreTest'},
        {id: 'PostTest', title: 'PostTest'},
        {id: 'Delta', title: 'Delta'},
        {id: 'Gamma', title: 'Gamma'},
        {id: 'Mu', title: 'Mu'},
        {id: 'Alpha', title: 'Alpha'},
        {id: 'Flow', title: 'Flow'},
        {id: 'GammaGain', title: 'GammaGain'},
        {id: 'GammaGainZero', title: 'GammaGainZero'}
     ];
    
    let header = [{id: 'id', title: 'id'}, {id: 'Options', title: 'Options'}, ...defaultHeader];
    
    if (group){
        header = [{id: 'id', title: 'id'}, ...defaultHeader]; 
    }
     
   const csvWriter = createCsvWriter({
        path: filename,
        header: header
   });

   csvWriter.writeRecords(exportArray).then(() => {
       console.log('...Done');
   });
};

const unMatchedStudentResults = (db, filename) => {
    let exportArray = [];
    const dataset = db.buildStudentUnmatched();
    for (let row of dataset){
        let r = {
            id: row.id,
            Exam1: row.Exam1,
            Exam2: row.Exam2
        };
        exportArray.push(r);
    }
    const csvWriter = createCsvWriter({
        path: filename,
        header: [
            {id: 'id', title: 'id'},
            {id: 'Exam1', title: 'Exam1'},
            {id: 'Exam2', title: 'Exam2'}   
        ]
    });

    csvWriter.writeRecords(exportArray).then(() => {
       console.log('...Done');
    });
};

const unMatchedExamResults = (db, filename) => {
    let exportArray = [];
    const dataset = db.buildExamUnmatched();
    for (let row of dataset){
        let r = {
            Q: row.q,
            Exam1: row.Exam1,
            Exam2: row.Exam2,
            Options: row.d
        };
        exportArray.push(r);
    }
    const csvWriter = createCsvWriter({
        path: filename,
        header: [
            {id: 'Q', title: 'Q'},
            {id: 'Exam1', title: 'Exam1'},
            {id: 'Exam2', title: 'Exam2'},
            {id: 'Options', title: 'Options'}
        ]
    });

    csvWriter.writeRecords(exportArray).then(() => {
       console.log('...Done');
    });
};

module.exports = {
    questionAnalysis: questionAnalysis,
    studentAnalysis: studentAnalysis,
    unMatchedStudentResults: unMatchedStudentResults,
    unMatchedExamResults: unMatchedExamResults
};