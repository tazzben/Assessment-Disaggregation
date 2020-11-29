window.api.receive("fromMain", (data) => {
    if (data.students != undefined) {
        let numberofStudents = Math.round(data.students);
        let examOne = data.examOne.score ? Math.round(data.examOne.score * 100).toString() + "%" : "-";
        let examTwo = data.examTwo.score ? Math.round(data.examTwo.score * 100).toString() + "%" : "-";
        let examOneCount = data.examOne.count ? Math.round(data.examOne.count).toString() + " students" : "";
        let examTwoCount = data.examTwo.count ? Math.round(data.examTwo.count).toString() + " students" : "";
        let matchedStudents = data.questions ? Math.round(data.questions).toString() + " matched questions" : "";
        $("#examOne").text(examOne);
        $("#examTwo").text(examTwo);
        $("#students").text(numberofStudents);
        $("#pretestStudents").text(examOneCount);
        $("#posttestStudents").text(examTwoCount);
        $("#matchedQuestions").text(matchedStudents);
    }
    if (data.students) {
        $("#analysisDescription").hide()
        $("#analysisButtons").show();
    } else {
        $("#analysisButtons").hide();
        $("#analysisDescription").show()
    }
    if (data.questionOptions) {
        let numWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
        let wordOptions = (Number.isInteger(data.questionOptions) && numWords.length > data.questionOptions) ? numWords[data.questionOptions] : data.questionOptions.toString();
        $("#questionOptions").text(wordOptions);
    }
    if (data.appVersion) {
        $("#appVersion").text(data.appVersion);
    }
    let scroll = document.documentElement.scrollHeight + 25 - document.documentElement.clientHeight;
    if (scroll > 0) {
        $('#footer').hide();
    } else {
        $('#footer').show();
    }
});

$(document).ready(function () {
    $("#pretest").click(function () {
        window.api.send("toMain", "pretest");
    });
    $("#posttest").click(function () {
        window.api.send("toMain", "posttest");
    });
    $("#assessmentMap").click(function () {
        window.api.send("toMain", "map");
    });
    $("#studentList").click(function () {
        window.api.send("toMain", "students");
    });
    $("#MatchedQuestion").click(function () {
        window.api.send("toMain", "matchedOutputQ");
    });
    $("#MatchedStudent").click(function () {
        window.api.send("toMain", "matchedOutputStudents");
    });
    $("#MatchedStudentByOption").click(function () {
        window.api.send("toMain", "matchedOutputStudentsbyGroup");
    });
    window.api.send("toMain", "update");
    let scroll = document.documentElement.scrollHeight + 25 - document.documentElement.clientHeight;
    if (scroll > 0) {
        $('#footer').hide();
    } else {
        $('#footer').show();
    }
});