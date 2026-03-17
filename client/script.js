let rows = 13;
let cols = 3;
const colValues = ['1', 'X', '2'];

const gridContainer = document.getElementById('button-grid');
const selectGame = document.getElementById("gameSelect");
const table = document.getElementById("distributionTable");

// Track active buttons
let buttonState = Array.from({ length: rows }, () => Array(cols).fill(false));

// Store DOM references
let gameLabels = [];
let buttonElements = []; // 2D array: buttonElements[row][col]

// Initial placeholders
let games = Array(rows).fill(null);
let odds = Array(rows).fill(null).map(() => Array(cols).fill('-'));
let percentages = Array(rows).fill(null).map(() => Array(cols).fill('-'));

let gamesMatrix = [];
let gameSelected = 0;

let result = [];
let signDistribution = Array.from({ length: rows }, () => Array(cols).fill(0));

// --------------------
// Histogram helper functions
// --------------------
function niceStep(range, bins) {
    const rough = range / bins;
    const power = Math.pow(10, Math.floor(Math.log10(rough)));
    const fraction = rough / power;

    let niceFraction;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * power;
}

function histogram(values, bins = 10) {
    const min = Math.min(...values);
    const max = Math.max(...values);

    let step = niceStep(max - min, bins);
    if (step === 0) step = Math.pow(10, Math.floor(Math.log10(max || 1)));

    const start = 0;
    const end = Math.max(step, Math.ceil(max / step) * step);

    const counts = [];
    const labels = [];

    for (let v = start; v < end; v += step) {
        counts.push(0);
        labels.push(`${v}–${v + step}`);
    }

    for (const val of values) {
        const i = Math.floor((val - start) / step);
        if (i >= 0 && i < counts.length) counts[i]++;
    }

    return { labels, counts };
}

let histogramChart = null;

function renderGrid() {
    gridContainer.innerHTML = "";
    buttonElements = [];
    gameLabels = [];
    for (let r = 0; r < rows; r++) {
        // Game label
        gameLabel = document.createElement('div');
        gameLabel.className = 'game-label';
        gameLabel.dataset.row = r;
        gameLabel.textContent = games[r] || `Game ${r + 1}`;
        gridContainer.appendChild(gameLabel);
        gameLabels.push(gameLabel);

        // Buttons
        buttonElements[r] = [];
        for (let c = 0; c < cols; c++) {
            const btn = document.createElement('button');
            btn.className = 'grid-btn';
            btn.dataset.row = r;
            btn.dataset.col = c;

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = colValues[c];

            const oddsText = document.createElement('span');
            oddsText.className = 'odds';
            oddsText.textContent = odds[r][c];

            const percentText = document.createElement('span');
            percentText.className = 'percent';
            percentText.textContent = percentages[r][c] + "%";

            btn.appendChild(label);
            btn.appendChild(oddsText);
            btn.appendChild(percentText);

            // Click handling
            btn.addEventListener('click', () => {
                const rowBtns = buttonElements[r];
                const activeCount = rowBtns.filter(b => b.classList.contains('active')).length;
                const isActive = btn.classList.contains('active');

                if (isActive) {
                    btn.classList.remove('active');
                    buttonState[r][c] = false;
                } else if (activeCount < 2) {
                    btn.classList.add('active');
                    buttonState[r][c] = true;
                }
            });

            gridContainer.appendChild(btn);
            buttonElements[r][c] = btn;
        }
    }
}

function getDistribution() {
    signDistribution = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < result.length; r++) {
        let row = 0;
        for (let l = 0; l < result[r][0].length; l++) {
            if (result[r][0][l] == "E" || result[r][0][l] == ",") {
                continue;
            } else {
                if (result[r][0][l] == "1") {
                    signDistribution[row][0] ++;
                } else if (result[r][0][l] == "X") {
                    signDistribution[row][1] ++;
                } else if (result[r][0][l] == "2") {
                    signDistribution[row][2] ++;
                }
                row ++;
            }
        }
    }
    for (let r = 0; r < signDistribution.length; r++) {
        for (let c = 0; c < signDistribution[0].length; c++) {
            signDistribution[r][c] = signDistribution[r][c] / result.length * 100;
        }
    }
}

function updateGrid(newGames, newOdds, newPercentages) {
    for (let r = 0; r < rows; r++) {
        if (gameLabels[r]) gameLabels[r].textContent = newGames?.[r] || `Game ${r + 1}`;

        for (let c = 0; c < cols; c++) {
            const btn = buttonElements[r][c];
            if (!btn) continue;

            const oddsSpan = btn.querySelector('.odds');
            const percentSpan = btn.querySelector('.percent');

            if (oddsSpan) oddsSpan.textContent = newOdds?.[r]?.[c] ?? '-';
            if (percentSpan) percentSpan.textContent = (newPercentages?.[r]?.[c] ?? '-') + '%';
        }
    }
}

//document.getElementById("btn2")?.addEventListener("click", async () => {
selectGame.addEventListener("change", async () => {
    gameSelected = selectGame.selectedIndex;

    const flags = ["-w",
                   "-i",
                   "-g", gamesMatrix[gameSelected][1],
                   gamesMatrix[gameSelected][2] == 0 ? "" : "-o",
                   gamesMatrix[gameSelected][2] == 0 ? "" : gamesMatrix[gameSelected][2]
                  ];

    const response = await fetch("http://localhost:3000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            flags: flags,
            matrix: buttonState
        })
    });
    const data = await response.json();
    // Example: new random data
    const lines = data.output
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // games
    const games = lines.filter(l => l.includes("-"));
    const n = games.length;

    // helper to parse numbers
    function parseRow(line) {
    return line.trim().split(/\s+/).map(Number);
    }

    // percentages matrix
    const percentages = lines
        .slice(n, n * 2)
        .map(parseRow);

    // odds matrix
    const odds = lines
        .slice(n * 2, n * 3)
        .map(parseRow);

    rows = games.length;
    buttonState = Array.from({ length: rows }, () => Array(cols).fill(false));

    renderGrid();
    updateGrid(games, odds, percentages);
});

document.getElementById('btn').addEventListener('click', async () => {
    //const flags = ["-w", "-M", "-b", "100"];
    const flags = ["-w",
                   "-M",
                   "-b", 67,
                   "-g", gamesMatrix[gameSelected][1],
                   gamesMatrix[gameSelected][2] == 0 ? "" : "-o",
                   gamesMatrix[gameSelected][2] == 0 ? "" : gamesMatrix[gameSelected][2]
                  ];
    //const flags = ["-w", "-M", "-b", "100", "-g", gamesMatrix[gameSelected][1]]

    const response = await fetch("http://localhost:3000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            flags: flags,
            matrix: buttonState
        })
    });

    const data = await response.json();
    result = data.output.trim().split('\n').map(line => {
        const [text, num] = line.split(/\s+/);
        return [text, parseFloat(num)];
    });

    //console.log(result)
    getDistribution();
    console.log(signDistribution);
    drawDistributions()

    const values = result.map(r => r[1]);
    const hist = histogram(values, 15);

    if (histogramChart) histogramChart.destroy();

    histogramChart = new Chart(document.getElementById('histogram'), {
        type: 'bar',
        data: { labels: hist.labels, datasets: [{ data: hist.counts }] },
        options: { plugins: { legend: { display: false } }, scales: { x: {}, y: {} } }
    });

});

async function getAvailableGames() {
    const flags = ["-a"];

    const response = await fetch("http://localhost:3000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            flags: flags,
            matrix: buttonState
        })
    });
    const data = await response.json();

    const typeMap = {
        stryktipset: 0,
        europatipset: 1,
        topptipset: 2,
        powerplay: 3
    };

    gamesMatrix = data.output
        .trim()
        .split('\n')
        .map(line => {
            const [name, omgPart] = line.split(',');
            const type = typeMap[name] ?? -1;

            let omg = 0;
            if (omgPart && omgPart.startsWith('omg=')) {
            omg = parseInt(omgPart.split('=')[1], 10);
            }

            return [name, type, omg];
        });

    gamesMatrix.forEach(row => {
        const [name, , omg] = row;

        const option = document.createElement("option");

        option.value = omg;

        option.textContent = omg !== 0 
            ? `${name} ${omg}`
            : name;

        selectGame.appendChild(option);
    });
}

function drawDistributions() {
    table.innerHTML = "";
    signDistribution.forEach(row => {
        row.forEach(value => {

            const cell = document.createElement("div");
            cell.className = "cell";

            const fill = document.createElement("div");
            fill.className = "fill";
            fill.style.height = value + "%";

            const label = document.createElement("div");
            label.className = "label";
            label.innerText = value.toFixed(1) + "%";

            cell.appendChild(fill);
            cell.appendChild(label);

            table.appendChild(cell);

        });
    });
}

getAvailableGames();
renderGrid()