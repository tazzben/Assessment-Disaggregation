
let tableData = [];

window.api.receive("fromMain", (data) => {
    tableData = data;
});


const drawTable = (data) => {
    let headerIgnore = ['question_options', 'simulation_type'];

    const headerMap = {
        "cv 0.900": "90% Critical Value",
        "cv 0.950": "95% Critical Value",
        "μ 0.025": "μ 95% CI (0.025)",
        "μ 0.975": "μ 95% CI (0.975)",
    };

    let table = $('<table></table>');
    table.addClass('table');
    table.addClass('table-striped');
    let headers = Object.keys(data[0]);
    let headerRow = $('<thead></thead>').append($('<tr></tr>'));
    headers.forEach(header => {
        if (!(headerIgnore.includes(header))) {
            if (header in headerMap) {
                header = headerMap[header];
            }
            header = header.replace(/\b\w/g, char => char.toUpperCase());
            headerRow.append($('<th></th>').text(header));
        } 
    });
    table.append(headerRow);
    let body = $('<tbody></tbody>');
    data.forEach(row => {
        let tableRow = $('<tr></tr>');
        headers.forEach(header => {
            if (!(headerIgnore.includes(header))){
                let cellValue = parseFloat(row[header]);
                if (!(header == 'class size')) {
                    cellValue = cellValue.toFixed(3);
                }
                tableRow.append($('<td></td>').text(cellValue));
            }
        });
        body.append(tableRow);
        table.append(body);
    });
    $('#tableContents').empty();
    $('#tableContents').append(table);
};

$(document).ready(function () {

    $('#smithwag').click(function () {
        window.api.send("toMain", "smithwag");
    });

    $('#smithwhite').click(function () {
        window.api.send("toMain", "smithwhite");
    });

    $('#filterForm').submit(function (event) {
        event.preventDefault();
        let numOptions = $('#numOptions').val();
        let estimatorType = $('#estimatorType').val();
        let filteredData = tableData.filter(row => row['question_options'] == numOptions && row['simulation_type'] == estimatorType);
        drawTable(filteredData);
    });

});