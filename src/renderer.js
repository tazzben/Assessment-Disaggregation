window.api.receive("fromMain", (data) => {
    if (data.students != undefined) {
        let numberofStudents = Math.round(data.students);
        let examOne = data.examOne.score ? Math.round(data.examOne.score * 100).toString() + "%" : "-";
        let examTwo = data.examTwo.score ? Math.round(data.examTwo.score * 100).toString() + "%" : "-";
        let examOneCount = data.examOne.count ? Math.round(data.examOne.count).toString() + " students" : "";
        let examTwoCount = data.examTwo.count ? Math.round(data.examTwo.count).toString() + " students" : "";
        let examOneQuestions = data.examOne.questionCount ? Math.round(data.examOne.questionCount).toString() + " questions" : "";
        let examTwoQuestions = data.examTwo.questionCount ? Math.round(data.examTwo.questionCount).toString() + " questions" : "";
        let matchedStudents = data.questions ? Math.round(data.questions).toString() + " matched questions" : "";
        $("#examOne").text(examOne);
        $("#examTwo").text(examTwo);
        $("#students").text(numberofStudents);
        $("#pretestStudents").text(examOneCount);
        $("#posttestStudents").text(examTwoCount);
        $("#pretestQuestions").text(examOneQuestions);
        $("#posttestQuestions").text(examTwoQuestions);
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
    if (data.examFileOne && data.examFileOne.length > 0) {
        $("#pretestFile").text("(\"" + data.examFileOne + "\")");
        $("#pretest").attr("title", "\"" + data.examFileOne + "\" is loaded as the pretest");
        $("#pretest").attr("data-original-title", "\"" + data.examFileOne + "\" is loaded as the pretest");
        $("#pretest").tooltip('update');
        if (!data.startup) {
            $("#pretest").tooltip('show');
        }
    }
    if (data.examFileTwo && data.examFileTwo.length > 0) {
        $("#posttestFile").text("(\"" + data.examFileTwo + "\")");
        $("#posttest").attr("title", "\"" + data.examFileTwo + "\" is loaded as the posttest");
        $("#posttest").attr("data-original-title", "\"" + data.examFileTwo + "\" is loaded as the posttest");
        $("#posttest").tooltip('update');
        if (!data.startup) {
            $("#posttest").tooltip('show');
        }
    }
    if (data.assessmentFile && data.assessmentFile.trim().length > 0) {
        $("#assessmentMapExtra").hide();
        $("#assessmentFile").text(" (you have selected \"" + data.assessmentFile + "\")");
        $("#assessmentMap").attr("title", "\"" + data.assessmentFile + "\" is loaded as the assessment map");
        $("#assessmentMap").attr("data-original-title", "\"" + data.assessmentFile + "\" is loaded as the assessment map");
        $("#assessmentMap").tooltip('update');
    } else if (data.assessmentFile) {
        $("#assessmentMapExtra").show();
        $("#assessmentFile").text("");
        $("#assessmentMap").attr("title", "Click to load the assessment map file");
        $("#assessmentMap").attr("data-original-title", "Click to load the assessment map file");
        $("#assessmentMap").tooltip('update');
    }
    if (!data.startup && data.assessmentFile) {
        $("#assessmentMap").tooltip('show');
    }
    if (data.studentFile && data.studentFile.trim().length > 0) {
        $("#studentListExtra").hide();
        $("#studentFile").text(" (you have selected \"" + data.studentFile + "\") ");
        $("#studentList").attr("title", "\"" + data.studentFile + "\" is loaded as the student list");
        $("#studentList").attr("data-original-title", "\"" + data.studentFile + "\" is loaded as the student list");
        $("#studentList").tooltip('update');
    } else if (data.studentFile) {
        $("#studentListExtra").show();
        $("#studentFile").text("");
        $("#studentList").attr("title", "Click to load the student list file");
        $("#studentList").attr("data-original-title", "Click to load the student list file");
        $("#studentList").tooltip('update');
    }
    if (!data.startup && data.studentFile) {
        $("#studentList").tooltip('show');
    }
    if (data.appVersion) {
        $("#appVersion").text(data.appVersion);
    }
    let scroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
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
    $('[data-toggle="tooltip"]').tooltip();
    window.api.send("toMain", "update");
    let scroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scroll > 0) {
        $('#footer').hide();
    } else {
        $('#footer').show();
    }
});