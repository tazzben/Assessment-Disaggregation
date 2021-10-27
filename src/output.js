const createCsvWriter = require('csv-writer').createObjectCsvWriter;


const calcGamma = (Options, NL, PL, RL) => {
    return Options > 1 ? (Options * (NL + PL * Options + RL - 1)) / (Options - 1) ** 2 : Number.NaN;
};

const calcGammaZero = (NL, PL, RL) => {
    return 1 - NL - PL - RL > 0 ? ((PL - NL) * (1 - PL - RL)) / (1 - NL - PL - RL) : Number.NaN;
};

const calcMu = (Options, NL, RL) => {
    return Options > 1 ? (NL + RL - 1) / (Options - 1) + NL + RL : Number.NaN;
};

const calcAlpha = (Options, NL, PL, RL) => {
    return Options > 1 ? (Options * (NL * Options + PL + RL - 1)) / (Options - 1) ** 2 : Number.NaN;
};

const calcFlow = (Options, NL, PL, RL) => {
    return calcGamma(Options, NL, PL, RL) - calcAlpha(Options, NL, PL, RL);
};

const calcGammaGain = (Options, NL, PL, RL) => {
    return calcGamma(Options, NL, PL, RL) / (1 - calcMu(Options, NL, RL));
};

const calcGammaGainZero = (NL, PL, RL) => {
    return NL + RL < 1 ? (PL - NL) / (1 - NL - RL) : Number.NaN;
};

const calcR = (Options, NL, PL, RL) => {
    const ep = Options > 1 ? 1 / Options : Number.NaN;
    return 2 * PL + NL * (1 + ep) + (-1 + RL) * (1 + ep) === 0 ? Number.NaN : (-1 + NL + PL + RL) / (2 * PL + NL * (1 + ep) + (-1 + RL) * (1 + ep));
};

const calcRZero = (NL, PL, RL) => {
    return 1 + NL - 2 * PL - RL === 0 ? Number.NaN : (1 - PL - RL) / (1 + NL - 2 * PL - RL);
};

const sumReducer = (accumulator, currentValue) => accumulator + currentValue;

const questionAnalysis = (db, filename, summary = false) => {
    let exportArray = [];
    const dataset = db.buildMatched();
    for (let row of dataset) {
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
            R: calcR(row.Options, row.NL, row.PL, row.RL),
            GammaZero: calcGammaZero(row.NL, row.PL, row.RL),
            GammaGainZero: calcGammaGainZero(row.NL, row.PL, row.RL),
            RZero: calcRZero(row.NL, row.PL, row.RL)
        };
        r.RMinSensitivity = (Math.abs(r.R) < 1) ? 'GammaGain' : 'Gamma';
        r.RZeroMinSensitivity = (Math.abs(r.RZero) < 1) ? 'GammaGainZero' : 'GammaZero';
        exportArray.push(r);
    }

    if (summary && exportArray.length > 0) {
        let r = {
            Q: 'Averages',
            PL: exportArray.reduce((r, c)=> r + c.PL, 0) / exportArray.length,
            RL: exportArray.reduce((r, c)=> r + c.RL, 0) / exportArray.length,
            ZL: exportArray.reduce((r, c)=> r + c.ZL, 0) / exportArray.length,
            NL: exportArray.reduce((r, c)=> r + c.NL, 0) / exportArray.length,
            PreTest: exportArray.reduce((r, c)=> r + c.PreTest, 0) / exportArray.length,
            PostTest: exportArray.reduce((r, c)=> r + c.PostTest, 0) / exportArray.length,
            Delta: exportArray.reduce((r, c)=> r + c.Delta, 0) / exportArray.length,
            Gamma: exportArray.reduce((r, c)=> r + c.Gamma, 0) / exportArray.length,
            Mu: exportArray.reduce((r, c)=> r + c.Mu, 0) / exportArray.length,
            Alpha: exportArray.reduce((r, c)=> r + c.Alpha, 0) / exportArray.length,
            Flow: exportArray.reduce((r, c)=> r + c.Flow, 0) / exportArray.length,
            GammaGain: exportArray.reduce((r, c)=> r + c.GammaGain, 0) / exportArray.length,
            R: '',
            GammaZero: exportArray.reduce((r, c)=> r + c.GammaZero, 0) / exportArray.length,
            GammaGainZero: exportArray.reduce((r, c)=> r + c.GammaGainZero, 0) / exportArray.length,
            RZero: ''
        };
        
        if (exportArray.length > 1){
            let s = {
                Q: 'St Dev',
                PL: (exportArray.reduce((p, c)=> p + (c.PL - r.PL) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                RL: (exportArray.reduce((p, c)=> p + (c.RL - r.RL) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                ZL: (exportArray.reduce((p, c)=> p + (c.ZL - r.ZL) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                NL: (exportArray.reduce((p, c)=> p + (c.NL - r.NL) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                PreTest: (exportArray.reduce((p, c)=> p + (c.PreTest - r.PreTest) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                PostTest: (exportArray.reduce((p, c)=> p + (c.PostTest - r.PostTest) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                Delta: (exportArray.reduce((p, c)=> p + (c.Delta - r.Delta) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                Gamma: (exportArray.reduce((p, c)=> p + (c.Gamma - r.Gamma) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                Mu: (exportArray.reduce((p, c)=> p + (c.Mu - r.Mu) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                Alpha: (exportArray.reduce((p, c)=> p + (c.Alpha - r.Alpha) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                Flow: (exportArray.reduce((p, c)=> p + (c.Flow - r.Flow) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                GammaGain: (exportArray.reduce((p, c)=> p + (c.GammaGain - r.GammaGain) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                R: '',
                GammaZero: (exportArray.reduce((p, c)=> p + (c.GammaZero - r.GammaZero) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                GammaGainZero: (exportArray.reduce((p, c)=> p + (c.GammaGainZero - r.GammaGainZero) ** 2, 0) * 1 / (exportArray.length - 1)) ** 0.5,
                RZero: ''
            };
            exportArray.push(r);
            exportArray.push(s);
        } else {
            exportArray.push(r);
        }
        exportArray.push({
            Q: '',
        });
        exportArray.push({
            Q: 'Number of matched students:',
            PL: db.getNumberOfMatchedStudents()
        }); 
        exportArray.push({
            Q: 'Number of matched questions:',
            PL: db.getNumberOfMatchedQuestions()
        });     
    }
    const csvWriter = createCsvWriter({
        path: filename,
        header: [{
                id: 'Q',
                title: 'Q'
            },
            {
                id: 'PL',
                title: 'PL'
            },
            {
                id: 'RL',
                title: 'RL'
            },
            {
                id: 'ZL',
                title: 'ZL'
            },
            {
                id: 'NL',
                title: 'NL'
            },
            {
                id: 'PreTest',
                title: 'PreTest'
            },
            {
                id: 'PostTest',
                title: 'PostTest'
            },
            {
                id: 'Delta',
                title: 'Delta'
            },
            {
                id: 'Gamma',
                title: 'Gamma'
            },
            {
                id: 'Mu',
                title: 'Mu'
            },
            {
                id: 'Alpha',
                title: 'Alpha'
            },
            {
                id: 'Flow',
                title: 'Flow'
            },
            {
                id: 'GammaGain',
                title: 'GammaGain'
            },
            {
                id: 'R',
                title: 'R'
            },
            {
                id: 'GammaZero',
                title: 'GammaZero'
            },
            {
                id: 'GammaGainZero',
                title: 'GammaGainZero'
            },
            {
                id: 'RZero',
                title: 'RZero'
            }, 
            {
                id: 'RMinSensitivity',
                title: 'RMinSensitivity'
            },
            {
                id: 'RZeroMinSensitivity',
                title: 'RZeroMinSensitivity'
            }
        ]
    });
    csvWriter.writeRecords(exportArray).then(() => {
        console.log('...Done');
    });
};

const studentAnalysis = (db, filename, group = false, summary = false) => {
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
        R: [],
        c: []
    };

    const clearGroup = JSON.parse(JSON.stringify(rowGroup));
    let currentOptions = 0;
    let currentId = 0;
    let studentIds = [];
    for (let row of dataset) {
        if (!((row.Options == currentOptions || group) && row.id == currentId || (currentOptions == 0 && currentId == 0))) {
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
                GammaGain: (rowGroup["Gamma"].reduce(sumReducer, 0) / totQs) / (1 - rowGroup["Mu"].reduce(sumReducer, 0) / totQs),
                R: rowGroup["R"].reduce(sumReducer, 0) / totQs,
                GammaZero: calcGammaZero(rowGroup["NL"].reduce(sumReducer, 0) / totQs, rowGroup["PL"].reduce(sumReducer, 0) / totQs, rowGroup["RL"].reduce(sumReducer, 0) / totQs),
                GammaGainZero: calcGammaGainZero(rowGroup["NL"].reduce(sumReducer, 0) / totQs, rowGroup["PL"].reduce(sumReducer, 0) / totQs, rowGroup["RL"].reduce(sumReducer, 0) / totQs),
                RZero: calcRZero(rowGroup["NL"].reduce(sumReducer, 0) / totQs, rowGroup["PL"].reduce(sumReducer, 0) / totQs, rowGroup["RL"].reduce(sumReducer, 0) / totQs)
            };
            exportArray.push(r);
            studentIds.push(r.id);
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
        rowGroup["R"].push(calcR(row.Options, row.NL, row.PL, row.RL) * row.c);
        rowGroup["c"].push(row.c);
        currentOptions = row.Options;
        currentId = row.id;
    }
    if (summary && exportArray.length > 0) {
        let totalQuestions = exportArray.reduce((r, c)=> r + c.Questions, 0);
        
        let r = {
            id: (group) ? 'Averages' : 'Weighted Averages',
            Options: '',
            Questions: '',
            PL: exportArray.reduce((r, c)=> r + (c.Questions * c.PL), 0) / totalQuestions,
            RL: exportArray.reduce((r, c)=> r + (c.Questions * c.RL), 0) / totalQuestions,
            ZL: exportArray.reduce((r, c)=> r + (c.Questions * c.ZL), 0) / totalQuestions,
            NL: exportArray.reduce((r, c)=> r + (c.Questions * c.NL), 0) / totalQuestions,
            PreTest: exportArray.reduce((r, c)=> r + (c.Questions * c.PreTest), 0) / totalQuestions,
            PostTest: exportArray.reduce((r, c)=> r + (c.Questions * c.PostTest), 0) / totalQuestions,
            Delta: exportArray.reduce((r, c)=> r + (c.Questions * c.Delta), 0) / totalQuestions,
            Gamma: exportArray.reduce((r, c)=> r + (c.Questions * c.Gamma), 0) / totalQuestions,
            Mu: exportArray.reduce((r, c)=> r + (c.Questions * c.Mu), 0) / totalQuestions,
            Alpha: exportArray.reduce((r, c)=> r + (c.Questions * c.Alpha), 0) / totalQuestions,
            Flow: exportArray.reduce((r, c)=> r + (c.Questions * c.Flow), 0) / totalQuestions,
            GammaGain: exportArray.reduce((r, c)=> r + (c.Questions * c.GammaGain), 0) / totalQuestions,
            R: '',
            GammaZero: exportArray.reduce((r, c)=> r + (c.Questions * c.GammaZero), 0) / totalQuestions,
            GammaGainZero: exportArray.reduce((r, c)=> r + (c.Questions * c.GammaGainZero), 0) / totalQuestions,
            RZero: ''
        };

        if (exportArray.length > 1){
            const uStudentIds = [...new Set(studentIds)];
            const basselM = (uStudentIds.length / (uStudentIds.length - 1)) * (1 / totalQuestions);

            let s = {
                id: (group) ? 'St Dev' : 'Weighted St Dev',
                Options: '',
                Questions: '',
                PL: (exportArray.reduce((p, c)=> p + c.Questions * (c.PL - r.PL) ** 2, 0) * basselM) ** 0.5,
                RL: (exportArray.reduce((p, c)=> p + c.Questions * (c.RL - r.RL) ** 2, 0) * basselM) ** 0.5,
                ZL: (exportArray.reduce((p, c)=> p + c.Questions * (c.ZL - r.ZL) ** 2, 0) * basselM) ** 0.5,
                NL: (exportArray.reduce((p, c)=> p + c.Questions * (c.NL - r.NL) ** 2, 0) * basselM) ** 0.5,
                PreTest: (exportArray.reduce((p, c)=> p + c.Questions * (c.PreTest - r.PreTest) ** 2, 0) * basselM) ** 0.5,
                PostTest: (exportArray.reduce((p, c)=> p + c.Questions * (c.PostTest - r.PostTest) ** 2, 0) * basselM) ** 0.5,
                Delta: (exportArray.reduce((p, c)=> p + c.Questions  * (c.Delta - r.Delta) ** 2, 0) * basselM) ** 0.5,
                Gamma: (exportArray.reduce((p, c)=> p + c.Questions * (c.Gamma - r.Gamma) ** 2, 0) * basselM) ** 0.5,
                Mu: (exportArray.reduce((p, c)=> p + c.Questions * (c.Mu - r.Mu) ** 2, 0) * basselM) ** 0.5,
                Alpha: (exportArray.reduce((p, c)=> p + c.Questions * (c.Alpha - r.Alpha) ** 2, 0) * basselM) ** 0.5,
                Flow: (exportArray.reduce((p, c)=> p + c.Questions * (c.Flow - r.Flow) ** 2, 0) * basselM) ** 0.5,
                GammaGain: (exportArray.reduce((p, c)=> p + c.Questions * (c.GammaGain - r.GammaGain) ** 2, 0) * basselM) ** 0.5,
                R: '',
                GammaZero: (exportArray.reduce((p, c)=> p + c.Questions * (c.GammaZero - r.GammaZero) ** 2, 0) * basselM) ** 0.5,
                GammaGainZero: (exportArray.reduce((p, c)=> p + c.Questions * (c.GammaGainZero - r.GammaGainZero) ** 2, 0) * basselM) ** 0.5,
                RZero: ''
            };

            exportArray.push(r);
            exportArray.push(s);
        } else {
            exportArray.push(r);
        }
           
        exportArray.push({
            id: '',
        });
        let mStudents = {
            id: 'Number of matched students:',
        };
        
        if (group) {
            mStudents['Questions'] = db.getNumberOfMatchedStudents();
        } else {
            mStudents['Options'] = db.getNumberOfMatchedStudents();
        }

        exportArray.push(mStudents); 
    }
    let defaultHeader = [{
            id: 'Questions',
            title: 'Questions'
        },
        {
            id: 'PL',
            title: 'PL'
        },
        {
            id: 'RL',
            title: 'RL'
        },
        {
            id: 'ZL',
            title: 'ZL'
        },
        {
            id: 'NL',
            title: 'NL'
        },
        {
            id: 'PreTest',
            title: 'PreTest'
        },
        {
            id: 'PostTest',
            title: 'PostTest'
        },
        {
            id: 'Delta',
            title: 'Delta'
        },
        {
            id: 'Gamma',
            title: 'Gamma'
        },
        {
            id: 'Mu',
            title: 'Mu'
        },
        {
            id: 'Alpha',
            title: 'Alpha'
        },
        {
            id: 'Flow',
            title: 'Flow'
        },
        {
            id: 'GammaGain',
            title: 'GammaGain'
        },
        {
            id: 'R',
            title: 'R'
        },
        {
            id: 'GammaZero',
            title: 'GammaZero'
        },
        {
            id: 'GammaGainZero',
            title: 'GammaGainZero'
        },
        {
            id: 'RZero',
            title: 'RZero'
        }
    ];

    let header = [{
        id: 'id',
        title: 'id'
    }, {
        id: 'Options',
        title: 'Options'
    }, ...defaultHeader];

    if (group) {
        header = [{
            id: 'id',
            title: 'id'
        }, ...defaultHeader];
    }

    const csvWriter = createCsvWriter({
        path: filename,
        header: header
    });

    csvWriter.writeRecords(exportArray).then(() => {
        console.log('...Done');
    });
};

const unMatchedStudentResults = (db, filename, summary = false) => {
    let exportArray = [];
    const dataset = db.buildStudentUnmatched();
    for (let row of dataset) {
        let r = {
            id: row.id,
            Exam1: row.Exam1,
            Exam2: row.Exam2
        };
        exportArray.push(r);
    }

    if (summary && exportArray.length > 0) {
        let r = {
            id: 'Averages',
            Exam1: exportArray.reduce((r, c)=> r + c.Exam1, 0) / exportArray.length,
            Exam2: exportArray.reduce((r, c)=> r + c.Exam2, 0) / exportArray.length
        };
        if (exportArray.length > 1) {
            let s = {
                id: 'St Dev',
                Exam1: (exportArray.reduce((p, c)=> p + (c.Exam1 - r.Exam1) ** 2, 0) / (exportArray.length - 1)) ** 0.5,
                Exam2: (exportArray.reduce((p, c)=> p + (c.Exam2 - r.Exam2) ** 2, 0) / (exportArray.length - 1)) ** 0.5
            };
            exportArray.push(r);
            exportArray.push(s);
        } else {
            exportArray.push(r);
        }
    }

    const csvWriter = createCsvWriter({
        path: filename,
        header: [{
                id: 'id',
                title: 'id'
            },
            {
                id: 'Exam1',
                title: 'Exam1'
            },
            {
                id: 'Exam2',
                title: 'Exam2'
            }
        ]
    });

    csvWriter.writeRecords(exportArray).then(() => {
        console.log('...Done');
    });
};

const unMatchedExamResults = (db, filename, summary = false) => {
    let exportArray = [];
    const dataset = db.buildExamUnmatched();
    for (let row of dataset) {
        let r = {
            Q: row.q,
            Exam1: row.Exam1,
            Exam2: row.Exam2,
            Options: row.d
        };
        exportArray.push(r);
    }

    if (summary && exportArray.length > 0) {
        let r = {
            Q: 'Averages',
            Exam1: exportArray.reduce((r, c)=> r + c.Exam1, 0) / exportArray.length,
            Exam2: exportArray.reduce((r, c)=> r + c.Exam2, 0) / exportArray.length,
            Options: ''
        };
        
        if (exportArray.length > 1) {
            let s = {
                Q: 'St Dev',
                Exam1: (exportArray.reduce((p, c)=> p + (c.Exam1 - r.Exam1) ** 2, 0) / (exportArray.length - 1)) ** 0.5,
                Exam2: (exportArray.reduce((p, c)=> p + (c.Exam2 - r.Exam2) ** 2, 0) / (exportArray.length - 1)) ** 0.5,
                Options: ''
            };
            exportArray.push(r);
            exportArray.push(s);
        } else {
            exportArray.push(r);
        }
    }

    const csvWriter = createCsvWriter({
        path: filename,
        header: [{
                id: 'Q',
                title: 'Q'
            },
            {
                id: 'Exam1',
                title: 'Exam1'
            },
            {
                id: 'Exam2',
                title: 'Exam2'
            },
            {
                id: 'Options',
                title: 'Options'
            }
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