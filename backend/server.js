const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const COMPILER_PATH = path.join(__dirname, 'compiler.exe');
const VM_PATH = path.join(__dirname, 'vm.exe');
const TEMP_C = path.join(__dirname, 'temp.c');
const TEMP_ASM = path.join(__dirname, 'temp.asm');

// Quick compilation step
app.post('/compile', (req, res) => {
    const code = req.body.code;
    fs.writeFileSync(TEMP_C, code);

    // Run compiler
    exec(`"${COMPILER_PATH}" "${TEMP_C}" "${TEMP_ASM}"`, (error, stdout, stderr) => {
        if (error) {
            return res.status(400).json({ success: false, error: stderr || stdout || error.message });
        }

        const asm = fs.existsSync(TEMP_ASM) ? fs.readFileSync(TEMP_ASM, 'utf8') : '';
        const stats = {
            binarySize: Buffer.byteLength(asm, 'utf8'),
            compiler: "Custom AST Compiler",
            target: "Custom ISA"
        };

        res.json({ success: true, assembly: asm, stats });
    });
});

// Run compiled ASM in VM
app.post('/run', (req, res) => {
    if (!fs.existsSync(TEMP_ASM)) {
        return res.status(400).json({ success: false, error: "No compiled assembly found. Compile first." });
    }

    const start = process.hrtime();
    exec(`"${VM_PATH}" "${TEMP_ASM}"`, (error, stdout, stderr) => {
        const end = process.hrtime(start);
        const execTimeMs = (end[0] * 1000 + end[1] / 1000000).toFixed(3);

        // Parse final state for the frontend gauges
        const stateMatch = stdout.match(/FINAL_STATE: ({.+})/);
        let finalState = null;
        if (stateMatch) {
            try {
                finalState = JSON.parse(stateMatch[1]);
            } catch (e) {
                console.error("Failed to parse FINAL_STATE:", e);
            }
        }

        // Clean output: remove the state line completely
        const cleanOutput = stdout.replace(/FINAL_STATE: {.*}/g, '').trim();

        res.json({
            success: !error,
            output: cleanOutput,
            error: stderr,
            finalState: finalState,
            execTime: execTimeMs,
            exitCode: error ? (error.code || 1) : 0
        });
    });
});

// Run compiled ASM in Debug mode (Traced execution)
app.post('/debug', (req, res) => {
    if (!fs.existsSync(TEMP_ASM)) {
        return res.status(400).json({ success: false, error: "No compiled assembly found. Compile first." });
    }

    // The VM outputs JSON to stdout natively when --debug is passed
    exec(`"${VM_PATH}" "${TEMP_ASM}" --debug`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error && !stdout) {
            return res.status(400).json({ success: false, error: stderr || error.message });
        }

        try {
            // Filter purely JSON blocks ignoring any stray print_str inside trace
            // Actually our debug trace array starts with [ and ends with ] on isolated lines
            const startIdx = stdout.indexOf('[\n');
            const endIdx = stdout.lastIndexOf('\n]\n');
            if (startIdx !== -1 && endIdx !== -1) {
                const jsonStr = stdout.substring(startIdx, endIdx + 3);
                const trace = JSON.parse(jsonStr);
                res.json({ success: true, trace });
            } else {
                res.status(500).json({ success: false, error: "Failed to parse debug trace from VM output." });
            }
        } catch (e) {
            console.log(stdout)
            res.status(500).json({ success: false, error: "JSON parsing error: " + e.message, raw: stdout });
        }
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`C Compiler Backend API running on http://localhost:${PORT}`);
});
