const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json()); // parse JSON body

const programPath = "/home/niclas/Programming/Projects/PoolPlay/build/app"

function printMatrix(matrix) {
  console.table(matrix);
}

app.post("/run", (req, res) => {
    const { flags, matrix } = req.body;
    console.log(flags);
    //printMatrix(matrix);
    
    // Spawn the process with flags
    const process = spawn(programPath, flags);
    process.stdin.write(JSON.stringify(matrix));

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
        output += data.toString();
        console.log("STDOUT:", data.toString());
    });

    process.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error("STDERR:", data.toString());
    });

    process.on("close", (code) => {
        console.log(`Process exited with code ${code}`);
        if (errorOutput) return res.status(500).json({ error: errorOutput });
        res.json({ output });
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));