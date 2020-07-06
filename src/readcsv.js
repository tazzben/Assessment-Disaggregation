const fs  = require('fs')
const csv = require('csv-parser');
const stripBom = require('strip-bom-stream');

const readStudentIds = (db, filename, callback) => {
    callback = callback || function(){};
    let results = [];
    let success = false;
    const headers = ['id', 'ids'];
    fs.createReadStream(filename)
        .pipe(stripBom())
        .pipe(csv({
            mapHeaders: ({ header, index }) => header.toString().toLowerCase().trim()
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            db.deleteStudents();
            results.forEach(function (row) {
                for(let [key, value] of Object.entries(row)){
                    let parsedInt = Number.parseInt(value,10);
                    if (headers.includes(key) && !Number.isNaN(parsedInt)){
                        db.insertStudents(parsedInt);
                        success = true;
                    }
                }
            });
            callback(success);
        });
};

const readAssessmentFile = (db, filename, callback) => {
    callback = callback || function(){};
    let results = [];
    let success = false;
    const headers = {
        examOne: ['exam1','pretest','pre-test'],
        examTwo: ['exam2','posttest','post-test'],
        question: ['question','item','q'],
        options: ['options', 'answers', 'distractors','guess','guessing','probability','p']
    };
    fs.createReadStream(filename)
        .pipe(stripBom())
        .pipe(csv({
            mapHeaders: ({ header, index }) => header.toString().toLowerCase().trim()
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            db.deleteAssessment();
            results.forEach(function (row) {
                let insertion = {
                    examOne: false,
                    examTwo: false,
                    num: false,
                    distractors: 4
                };
                for(let [key, value] of Object.entries(row)){
                    let parsedInt = Number.parseInt(value,10);
                    if (headers.examOne.includes(key) && Number.isInteger(parsedInt)){
                        insertion.examOne = parsedInt;
                    }
                    if (headers.examTwo.includes(key) && Number.isInteger(parsedInt)){
                        insertion.examTwo = parsedInt;
                    }
                    if (headers.question.includes(key) && Number.isInteger(parsedInt)){
                        insertion.num = parsedInt;
                    }
                    if (headers.options.includes(key) && !Number.isNaN(parsedInt)){
                        let parsedFloat = Number.parseFloat(value);
                        insertion.distractors = parsedFloat < 1 ? 1/parsedFloat : parsedFloat;
                    }
                }
                if (insertion.examOne !== false && insertion.examTwo !== false && insertion.num !== false){
                    db.insertAssessmentRecord (insertion.examOne, insertion.examTwo, insertion.num, insertion.distractors);    
                    success = true;
                }
            });
            callback(success);
        });
};

const detectFormat = (filename, callback) => {
    callback = callback || function(){};
    let results = [];
    fs.createReadStream(filename)
    .pipe(stripBom())
    .pipe(csv({
        headers: false
    }))
    .on('data', (row) => results.push(row))
    .on('end', () => {
        if (results.length > 0){
            const header = results[0];
            const {scantron, key} = detectScantron(header);
            const {altgrading, questionColumns, attemptColumn, idColumn, sisidColumn} = detectColumns(header);
            let fullSet = [];

            if (scantron || (attemptColumn > 0 && (idColumn > 0 || sisidColumn > 0))){
                fullSet = results;
                fullSet.splice(0,1);
            }

            const scantronData = scantron ? fullSet : [];
            const canvasData = (attemptColumn > 0 && (idColumn > 0 || sisidColumn > 0)) ? fullSet : [];
            callback (
                {      scantron: scantron,
                    scantronKey: key,
                   scantronData: scantronData,
                     altgrading: altgrading,
                questionColumns: questionColumns,
                  attemptColumn: attemptColumn,
                         header: header, 
                     canvasData: canvasData,
                     idColumn: idColumn,
                     sisidColumn: sisidColumn
              }
            );
        }else{
            callback ({});
        }
    });
};

const processCanvasData = (db, exam, header, data, attempt, idColumn, sisidColumn) => {
    let firstQuestion = Number(attempt)+2;
    let lastQuestion = firstQuestion;
    for (let [key, value] of Object.entries(header)){
        if (!Number.isNaN(Number(value)) && Number(key) > lastQuestion && Number(value) > 0){
            lastQuestion = Number(key);
        }
    }
    let success = false; 
    data.forEach(function (row) {

        let id = Number.isInteger(Number(row[sisidColumn])) ? Number(row[sisidColumn]) : Number(row[idColumn]);
        
        let question = 1;
        for (let i = firstQuestion; i < lastQuestion + 1; i += 2){
            let stringId = i.toString();
            
            let correct = (row[stringId]===header[stringId]) ? 1 : 0;
            if (id > 0){
                db.insertExamRecord (exam, id, question, correct);
                success = true;
            }
            question += 1;
        }
    });
    return success;
};

const processScantronData = (db, exam, data, key) => {
    
    let success = false; 
    data.forEach(function (row){
        let id = Number(row["1"]);
        let question = 1;
        for (let i = 0; i < key.length; i++){
            let questionPosition = i + 3;
            let questionValue = row[questionPosition.toString()];
            let correct = Number(key[i]) == Number(questionValue) ? 1 : 0;
            if (id > 0){
                db.insertExamRecord (exam, id, question, correct);
                success = true;
            }
            question += 1;
        }
    });
    return success;
};

const processColumnData = (db, exam, filename, altgrading, callback) => {
    callback = callback || function(){};
    let correctTest = ['a', 'b', 'c', 'd', 'e'];
    let results = [];
    let idKeys = ['id','student id','external id'];
    let success = false;
    fs.createReadStream(filename)
    .pipe(stripBom())
    .pipe(csv({
        mapHeaders: ({ header, index }) => header.toString().toLowerCase().trim()
    }))
    .on('data', (row) => results.push(row))
    .on('end', () => {
        results.forEach(function (row){
            let rowEnteries = [];
            let studentid = 0;
            for(let [key, value] of Object.entries(row)){
                if (idKeys.includes(key.toLowerCase()) && Number(value) > 0){
                    studentid = value;
                }
                if (key.substr(0,1).toLowerCase() == "q" && Number(key.substr(1))>0){
                    let question = Number(key.substr(1));
                    let correct = 0;
                    if ((altgrading && correctTest.includes(value.toLowerCase())) || Number(value) > 0){
                        correct = 1;
                    }
                    if (Number.isInteger(question)){
                        rowEnteries.push ([question, correct]);
                    }
                }
            }
            if (studentid > 0){
                rowEnteries.forEach(function(r){
                    const [q, c] = r;
                    db.insertExamRecord (exam, studentid, q, c);
                });
                success = true;
            } 
        });
        callback(success);
    });
};

const detectColumns = (header) => {
    let altgrading = false; 
    let questionColumns = false;
    let attemptColumn = 0;
    let idColumn = 0;
    let sisidColumn = 0;
    
    for(let [key, value] of Object.entries(header)){
        if (value.toLowerCase() === 'grade') {
            altgrading = true;
        }
        if (value.toLowerCase().startsWith("q") && Number.isInteger(Number(value.substr(1)))) {
            questionColumns = true;
        }
        if (value.toLowerCase() === 'attempt'){
            attemptColumn = key;
        }
        if (value.toLowerCase() === 'id'){
            idColumn = key;
        }
        if (value.toLowerCase() === 'sis_id'){
            sisidColumn = key
        }
    }
    return { altgrading: altgrading,
        questionColumns: questionColumns,
          attemptColumn: attemptColumn,
               idColumn: idColumn,
            sisidColumn: sisidColumn
    };
};

const detectScantron = (header) => {
    if (header.hasOwnProperty("2") ){
        let key = [];
        const numQuestions = Number(header["2"]);
        if (Number.isInteger(numQuestions)){
            for (let i = 3; i < numQuestions+3; i++){
                let iString = i.toString();
                let value = Number(header[iString]);
                if (Number.isInteger(value)){
                    key.push(value);
                }else{
                    return { scantron: false,
                             key: [] };
                }
            }
            return { scantron: true,
                        key: key };
        }
    }
    return { scantron: false,
                key: [] };
};

const processExamFile = (db, filename, exam, callback) => {
    callback = callback || function(){};
    function OutcomeFunc (out){
        if(out){
            db.buildAssessment ();
            db.buildStudents ();
        }
        callback(out);
    } 
    detectFormat (filename, function (robj){
        const {scantron, scantronKey, scantronData, altgrading, questionColumns, attemptColumn, header, canvasData, idColumn, sisidColumn} = robj;
        
        if ((scantron && scantronKey.length >0 ) || questionColumns || canvasData.length > 0){
            db.deleteExams(exam);
        }
        if (scantron && scantronKey.length >0 ){
            let outcome = processScantronData(db, exam, scantronData, scantronKey);
            OutcomeFunc(outcome);
        } else if (questionColumns){
            processColumnData(db, exam, filename, altgrading, OutcomeFunc);
        } else if (canvasData.length > 0){
            let outcome = processCanvasData(db, exam, header, canvasData, attemptColumn, idColumn, sisidColumn);
            OutcomeFunc(outcome);
        } else {
            OutcomeFunc(false);
        }
    });  
};

module.exports = {
    readStudentIds : readStudentIds, 
    readAssessmentFile : readAssessmentFile,
    processExamFile : processExamFile
};
