const fs = require('fs')
const csv = require('csv-parser');
const stripBom = require('remove-bom-stream');
const path = require('path');


const stringToNumber = (stringName) => {
    let hash = 0,
        i, chr;
    for (i = 0; i < stringName.length; i++) {
        chr = stringName.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
};

const readStudentIds = (db, filename, callback) => {
    callback = callback || function () {};
    let results = [];
    let success = false;
    const headers = ['id', 'student id', 'external id', 'zipgrade id', 'ids', 'sis_id', 'id number'];
    fs.createReadStream(filename)
        .pipe(stripBom('utf-8'))
        .pipe(csv({
            mapHeaders: ({
                header,
            }) => header.toString().toLowerCase().trim()
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            db.deleteStudents();
            results.forEach(function (row) {
                for (let [key, value] of Object.entries(row)) {
                    let parsedInt = Number.parseInt(value, 10);
                    if (headers.includes(key) && !Number.isNaN(parsedInt)) {
                        db.insertStudents(parsedInt);
                        success = true;
                    }
                }
            });
            let fObj = {};
            if (success === false) {
                db.buildStudents();
            } else{
                fObj.studentFile = path.basename(filename,path.extname(filename));
            }
            callback(success, fObj);
        });
};

const readAssessmentFile = (db, filename, callback) => {
    callback = callback || function () {};
    let results = [];
    let success = false;
    const headers = {
        examOne: ['exam1', 'pretest', 'pre-test'],
        examTwo: ['exam2', 'posttest', 'post-test'],
        question: ['question', 'item', 'q'],
        options: ['options', 'answers', 'distractors', 'guess', 'guessing', 'probability', 'p']
    };
    fs.createReadStream(filename)
        .pipe(stripBom('utf-8'))
        .pipe(csv({
            mapHeaders: ({
                header,
            }) => header.toString().toLowerCase().trim()
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
                for (let [key, value] of Object.entries(row)) {
                    let parsedInt = Number.parseInt(value, 10);
                    if (headers.examOne.includes(key) && Number.isInteger(parsedInt)) {
                        insertion.examOne = parsedInt;
                    }
                    if (headers.examTwo.includes(key) && Number.isInteger(parsedInt)) {
                        insertion.examTwo = parsedInt;
                    }
                    if (headers.question.includes(key) && Number.isInteger(parsedInt)) {
                        insertion.num = parsedInt;
                    }
                    if (headers.options.includes(key) && !Number.isNaN(parsedInt)) {
                        let parsedFloat = Number.parseFloat(value);
                        insertion.distractors = parsedFloat < 1 ? (parsedFloat === 0 ? Math.sqrt(Number.MAX_VALUE) : 1 / parsedFloat) : parsedFloat;
                    }
                }
                if (insertion.examOne !== false && insertion.examTwo !== false && insertion.num !== false) {
                    db.insertAssessmentRecord(insertion.examOne, insertion.examTwo, insertion.num, insertion.distractors);
                    success = true;
                }
            });
            let fObj = {};
            if (success === false) {
                db.buildAssessment();
            } else {
                fObj.assessmentFile = path.basename(filename,path.extname(filename));
            }
            callback(success, fObj);
        });
};

const detectFormat = (filename, callback) => {
    callback = callback || function () {};
    let results = [];
    fs.createReadStream(filename)
        .pipe(stripBom('utf-8'))
        .pipe(csv({
            headers: false
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            if (results.length > 0) {
                const header = results[0];
                const {
                    scantron,
                    key
                } = detectScantron(header);
                const {
                    altgrading,
                    questionColumns,
                    attemptColumn,
                    idColumn,
                    sisidColumn,
                    zipgradeColumn,
                    googleQuiz,
                    questionID
                } = detectColumns(header);
                let fullSet = [];

                if (scantron || (attemptColumn !== false && (idColumn !== false || sisidColumn !== false))) {
                    fullSet = results;
                    fullSet.splice(0, 1);
                }

                const scantronData = scantron ? fullSet : [];
                const canvasData = (attemptColumn !== false && (idColumn !== false || sisidColumn !== false)) ? fullSet : [];
                callback({
                    scantron: scantron,
                    scantronKey: key,
                    scantronData: scantronData,
                    altgrading: altgrading,
                    questionColumns: questionColumns,
                    attemptColumn: attemptColumn,
                    header: header,
                    canvasData: canvasData,
                    idColumn: idColumn,
                    sisidColumn: sisidColumn,
                    zipgradeColumn: zipgradeColumn,
                    googleQuiz: googleQuiz,
                    questionID: questionID
                });
            } else {
                callback({});
            }
        });
};

const processCanvasData = (db, exam, header, data, attempt, idColumn, sisidColumn) => {
    let firstQuestion = Number(attempt) + 2;
    let lastQuestion = firstQuestion;
    for (let [key, value] of Object.entries(header)) {
        if (!Number.isNaN(Number(value)) && Number(key) > lastQuestion && Number(value) > 0) {
            lastQuestion = Number(key);
        }
    }
    let success = false;
    data.forEach(function (row) {

        let id = (Number.isInteger(Number(row[sisidColumn])) && Number(row[sisidColumn]) > 0) ? Number(row[sisidColumn]) : Number(row[idColumn]);

        let question = 1;
        for (let i = firstQuestion; i < lastQuestion + 1; i += 2) {
            let stringId = i.toString();

            let correct = (row[stringId] === header[stringId]) ? 1 : 0;
            if (id > 0) {
                db.insertExamRecord(exam, id, question, correct);
                success = true;
            }
            question += 1;
        }
    });
    return success;
};

const processScantronData = (db, exam, data, key) => {

    let success = false;
    data.forEach(function (row) {
        let id = Number(row["1"]);
        let question = 1;
        for (let i = 0; i < key.length; i++) {
            let questionPosition = i + 3;
            let questionValue = row[questionPosition.toString()];
            let correct = Number(key[i]) == Number(questionValue) ? 1 : 0;
            if (id > 0) {
                db.insertExamRecord(exam, id, question, correct);
                success = true;
            }
            question += 1;
        }
    });
    return success;
};

const processColumnData = (db, exam, filename, altgrading, zipgradeColumn, callback) => {
    callback = callback || function () {};
    let correctTest = ['a', 'b', 'c', 'd', 'e'];
    let results = [];
    let idKeys = ['id', 'student id', 'external id', 'zipgrade id', 'id number', 'ids', 'sis_id'];
    let success = false;
    fs.createReadStream(filename)
        .pipe(stripBom('utf-8'))
        .pipe(csv({
            mapHeaders: ({
                header,
            }) => header.toString().toLowerCase().trim()
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            results.forEach(function (row) {
                let regularExpressionTest = /^(q[.]?\s*)([\d]+\b)/i;
                let rowEnteries = [];
                let studentid = 0;
                for (let [key, value] of Object.entries(row)) {
                    if (idKeys.includes(key) && Number(value) > 0 && Number.isInteger(Number(value))) {
                        studentid = value;
                    }
                    let keymatch = key.match(regularExpressionTest);
                    if (keymatch && Number(keymatch[2]) > 0) {
                        let question = Number(keymatch[2]);
                        let correct = 0;
                        if ((altgrading && correctTest.includes(value.toLowerCase())) || Number(value) > 0) {
                            correct = 1;
                        }
                        if (Number.isInteger(question) && (zipgradeColumn === false || value.toString().trim() !== '')) {
                            rowEnteries.push([question, correct]);
                        }
                    }
                }
                if (studentid > 0) {
                    rowEnteries.forEach(function (r) {
                        const [q, c] = r;
                        db.insertExamRecord(exam, studentid, q, c);
                    });
                    success = true;
                }
            });
            callback(success);
        });
};

const processGoogleQuizData = (db, exam, filename, callback) => {
    callback = callback || function () {};
    let results = [];
    let idKeys = ['id', 'student id', 'external id', 'zipgrade id', 'id number', 'ids', 'sis_id'];
    let usernameKeys = ['username', 'usernames'];
    let success = false;
    fs.createReadStream(filename)
        .pipe(stripBom('utf-8'))
        .pipe(csv({
            mapHeaders: ({
                header,
            }) => header.toString().toLowerCase().trim()
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            results.forEach(function (row) {
                let regularExpressionTest = /\[score\]$/i;
                let splitValueTest = /^[\s]*([\d.]+)[\s]*\/[\s]([\d.]+)[\s]*$/;
                let rowEnteries = [];
                let studentid = 0;
                let usernameid = 0;
                let questionNumber = 0;
                for (let [key, value] of Object.entries(row)) {
                    if (idKeys.includes(key) && Number(value) > 0 && Number.isInteger(Number(value))) {
                        studentid = value;
                    }
                    if (usernameKeys.includes(key) && value.length > 0) {
                        usernameid = stringToNumber(value.toLowerCase());
                    }
                    let keymatch = key.match(regularExpressionTest);
                    if (keymatch) {
                        let valuematch = value.match(splitValueTest);
                        if (valuematch && !Number.isNaN(Number(valuematch[1])) && Number(valuematch[2]) > 0) {
                            let question = ++questionNumber;
                            let correct = (Number(valuematch[1]) == Number(valuematch[2]) ? 1 : 0);
                            rowEnteries.push([question, correct]);
                        }
                    }
                }
                studentid = studentid > 0 ? studentid : usernameid;
                if (studentid !== 0) {
                    rowEnteries.forEach(function (r) {
                        const [q, c] = r;
                        db.insertExamRecord(exam, studentid, q, c);
                    });
                    success = true;
                }
            });
            callback(success);
        });
};

const processBlackboardData = (db, exam, filename, callback) => {
    callback = callback || function () {};
    let results = [];
    let idKeys = ['id', 'student id', 'external id', 'zipgrade id', 'id number', 'ids', 'sis_id'];
    let usernameKeys = ['username', 'usernames'];
    let success = false;
    fs.createReadStream(filename)
        .pipe(stripBom('utf-8'))
        .pipe(csv({
            mapHeaders: ({
                header,
            }) => header.toString().toLowerCase().trim()
        }))
        .on('data', (row) => results.push(row))
        .on('end', () => {
            results.forEach(function (row) {
                let questionNumberRE = /([\d]+)$/;
                let studentid = 0;
                let usernameid = 0;
                let questionNumber = 0;
                let possiblePoints = 0;
                let autoscore = false;
                let manualscore = false;
                for (let [key, value] of Object.entries(row)) {
                    if (idKeys.includes(key) && Number(value) > 0 && Number.isInteger(Number(value))) {
                        studentid = value;
                    }
                    if (usernameKeys.includes(key) && value.length > 0) {
                        usernameid = stringToNumber(value.toLowerCase());
                    }
                    if (key == 'question id') {
                        let keymatch = value.match(questionNumberRE);
                        if (keymatch && !Number.isNaN(Number(keymatch[1]))) {
                            questionNumber = Number(keymatch[1]);
                        }
                    }
                    if (key == 'possible points' && value.length > 0 && !Number.isNaN(Number(value))) {
                        possiblePoints = Number(value);
                    }
                    if (key == 'auto score' && value.length > 0 && !Number.isNaN(Number(value))) {
                        autoscore = Number(value);
                    }
                    if (key == 'manual score' && value.length > 0 && !Number.isNaN(Number(value))) {
                        manualscore = Number(value);
                    }
                }
                studentid = studentid > 0 ? studentid : usernameid;
                manualscore = manualscore !== false ? manualscore : autoscore;
                if (studentid !== 0 && possiblePoints > 0 && questionNumber > 0) {
                    let correct = manualscore == possiblePoints ? 1 : 0;
                    db.insertExamRecord(exam, studentid, questionNumber, correct);
                    success = true;
                }
            });
            callback(success);
        });
};

const detectColumns = (header) => {
    let altgrading = false;
    let questionColumns = false;
    let attemptColumn = false;
    let idColumn = false;
    let sisidColumn = false;
    let zipgradeColumn = false;
    let googleQuiz = false;
    let questionID = false;
    const regularExpressionTest = /^(q[.]?\s*)([\d]+\b)/i;
    const googleQuizTest = /\[score\]$/i;
    for (let [key, value] of Object.entries(header)) {
        let keymatch = value.match(regularExpressionTest);
        let keymatchQuiz = value.match(googleQuizTest);
        if (value.toLowerCase() === 'grade') {
            altgrading = true;
        }
        if (keymatch && Number(keymatch[2]) > 0) {
            questionColumns = true;
        }
        if (keymatchQuiz) {
            googleQuiz = true;
        }
        if (value.toLowerCase() === 'attempt') {
            attemptColumn = key;
        }
        if (value.toLowerCase() === 'id') {
            idColumn = key;
        }
        if (value.toLowerCase() === 'question id') {
            questionID = true;
        }
        if (value.toLowerCase() === 'sis_id') {
            sisidColumn = key;
        }
        if (value.toLowerCase() === 'zipgrade id') {
            zipgradeColumn = key;
        }
    }
    return {
        altgrading: altgrading,
        questionColumns: questionColumns,
        attemptColumn: attemptColumn,
        idColumn: idColumn,
        sisidColumn: sisidColumn,
        zipgradeColumn: zipgradeColumn,
        googleQuiz: googleQuiz,
        questionID: questionID
    };
};

const detectScantron = (header) => {
    if (Object.prototype.hasOwnProperty.call(header,"2")) {
        let key = [];
        const numQuestions = Number(header["2"]);
        if (Number.isInteger(numQuestions)) {
            for (let i = 3; i < numQuestions + 3; i++) {
                let iString = i.toString();
                let value = Number(header[iString]);
                if (Number.isInteger(value)) {
                    key.push(value);
                } else {
                    return {
                        scantron: false,
                        key: []
                    };
                }
            }
            return {
                scantron: true,
                key: key
            };
        }
    }
    return {
        scantron: false,
        key: []
    };
};

const processExamFile = (db, filename, exam, callback) => {
    callback = callback || function () {};

    function OutcomeFunc(out) {
        let fObj = {};
        if (out) {
            db.buildAssessment();
            db.buildStudents();
            if (exam === 1){
                fObj.examFileOne = path.basename(filename,path.extname(filename));
            }
            if (exam === 2){
                fObj.examFileTwo = path.basename(filename,path.extname(filename));
            }
        }
        callback(out, fObj);
    }
    detectFormat(filename, function (robj) {
        const {
            scantron,
            scantronKey,
            scantronData,
            altgrading,
            questionColumns,
            attemptColumn,
            header,
            canvasData,
            idColumn,
            sisidColumn,
            zipgradeColumn,
            googleQuiz,
            questionID
        } = robj;

        if ((scantron && scantronKey.length > 0) || questionColumns || canvasData.length > 0 || googleQuiz || questionID) {
            db.deleteExams(exam);
        }
        if (scantron && scantronKey.length > 0) {
            let outcome = processScantronData(db, exam, scantronData, scantronKey);
            OutcomeFunc(outcome);
        } else if (questionColumns) {
            processColumnData(db, exam, filename, altgrading, zipgradeColumn, OutcomeFunc);
        } else if (canvasData.length > 0) {
            let outcome = processCanvasData(db, exam, header, canvasData, attemptColumn, idColumn, sisidColumn);
            OutcomeFunc(outcome);
        } else if (googleQuiz) {
            processGoogleQuizData(db, exam, filename, OutcomeFunc);
        } else if (questionID) {
            processBlackboardData(db, exam, filename, OutcomeFunc);
        } else {
            OutcomeFunc(false);
        }
    });
};

module.exports = {
    readStudentIds: readStudentIds,
    readAssessmentFile: readAssessmentFile,
    processExamFile: processExamFile
};
