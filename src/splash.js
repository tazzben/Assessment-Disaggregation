window.api.receive("fromMain", (data) => {
    if (data == "startTimer") {
        setTimeout(function () {
            window.api.send("toMain", "closeSplash");
        }, 10000);
    }
});

$(document).ready(function () {
    $("#body").click(function () {
        window.api.send("toMain", "closeSplash");
    });
});