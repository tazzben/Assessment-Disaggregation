window.api.receive("fromMain", (data) => {
    if (data.students != undefined) {
        let numberofStudents = Math.round(data.students);
        let examOne = data.examOne.score ? Math.round(data.examOne.score * 100).toString() + "%" : "-";
        let examTwo = data.examTwo.score ? Math.round(data.examTwo.score * 100).toString() + "%" : "-";
        let examOneCount = data.examOne.count ? Math.round(data.examOne.count).toString() + " students" : "";
        let examTwoCount = data.examTwo.count ? Math.round(data.examTwo.count).toString() + " students" : "";
        $("#examOne").text(examOne);
        $("#examTwo").text(examTwo);
        $("#students").text(numberofStudents);
        $("#pretestStudents").text(examOneCount);
        $("#posttestStudents").text(examTwoCount);
    }
    if (data.students) {
        $("#analysisDescription").hide()
        $("#analysisButtons").show();
    } else {
        $("#analysisButtons").hide();
        $("#analysisDescription").show()
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
    window.api.send("toMain", "update");
    let scroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scroll > 0) {
        $('#footer').hide();
    } else {
        $('#footer').show();
    }
});