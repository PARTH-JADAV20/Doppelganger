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
        // In debug mode, VM may exit with code but still output valid JSON
        // Only treat as error if there's no stdout at all
        if (error && !stdout) {
            return res.status(400).json({ success: false, error: stderr || error.message });
        }

        try {
            // More robust JSON extraction - find the JSON array in the output
            // The VM outputs: [\n  {...},\n  {...}\n]\n
            // But there might be other output before/after
            
            // Try multiple patterns to find the JSON array
            let jsonStr = null;
            let trace = null;
            
            // Pattern 1: Look for [\n at the start
            const startPattern1 = stdout.indexOf('[\n');
            const endPattern1 = stdout.lastIndexOf('\n]\n');
            if (startPattern1 !== -1 && endPattern1 !== -1 && endPattern1 > startPattern1) {
                jsonStr = stdout.substring(startPattern1, endPattern1 + 3);
                try {
                    trace = JSON.parse(jsonStr);
                } catch (e) {
                    jsonStr = null; // Try next pattern
                }
            }
            
            // Pattern 2: Look for [ at the start (without newline)
            if (!trace) {
                const startPattern2 = stdout.indexOf('[');
                const endPattern2 = stdout.lastIndexOf(']');
                if (startPattern2 !== -1 && endPattern2 !== -1 && endPattern2 > startPattern2) {
                    jsonStr = stdout.substring(startPattern2, endPattern2 + 1);
                    try {
                        trace = JSON.parse(jsonStr);
                    } catch (e) {
                        jsonStr = null;
                    }
                }
            }
            
            // Pattern 3: Try to extract JSON from lines that look like JSON objects
            if (!trace) {
                const lines = stdout.split('\n');
                const jsonLines = [];
                let inJson = false;
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === '[' || trimmed.startsWith('[')) {
                        inJson = true;
                        jsonLines.push(trimmed);
                    } else if (trimmed === ']' || trimmed.endsWith(']')) {
                        jsonLines.push(trimmed);
                        inJson = false;
                        break;
                    } else if (inJson || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                        jsonLines.push(trimmed);
                    }
                }
                if (jsonLines.length > 0) {
                    jsonStr = jsonLines.join('\n');
                    try {
                        trace = JSON.parse(jsonStr);
                    } catch (e) {
                        // Last attempt: try to fix common issues
                        jsonStr = jsonStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
                        try {
                            trace = JSON.parse(jsonStr);
                        } catch (e2) {
                            console.error("JSON parse error:", e2.message);
                            console.error("Attempted JSON:", jsonStr.substring(0, 500));
                        }
                    }
                }
            }
            
            if (trace && Array.isArray(trace)) {
                res.json({ success: true, trace });
            } else {
                console.error("Failed to extract valid trace array");
                console.error("Stdout length:", stdout.length);
                console.error("Stdout preview:", stdout.substring(0, 1000));
                console.error("Stderr:", stderr);
                res.status(500).json({ 
                    success: false, 
                    error: "Failed to parse debug trace from VM output. Expected JSON array.",
                    details: `Output length: ${stdout.length}, Preview: ${stdout.substring(0, 200)}`
                });
            }
        } catch (e) {
            console.error("Debug endpoint error:", e);
            console.error("Stdout:", stdout.substring(0, 1000));
            console.error("Stderr:", stderr);
            res.status(500).json({ 
                success: false, 
                error: "JSON parsing error: " + e.message,
                details: `Output preview: ${stdout.substring(0, 500)}`
            });
        }
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`C Compiler Backend API running on http://localhost:${PORT}`);
});
