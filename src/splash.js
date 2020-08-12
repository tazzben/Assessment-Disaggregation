$(document).ready(function () {
    $("#body").click(function () {
        window.api.send("toMain", "closeSplash");
    });
    setTimeout(function(){ window.api.send("toMain", "closeSplash"); }, 10000);
});