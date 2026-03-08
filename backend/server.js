const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// In-memory session store: Map<sessionId, githubAccessToken>
const sessions = new Map();

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

// --- Trace Enricher Logic (v2 - Structured Metadata) ---

// Reads ASM to get the raw instructions for simulation
function getInstructionLines(asm) {
    return asm.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith(';') && !line.endsWith(':'));
}

function enrichTrace(trace, debugInfo, asm) {
    const instructionLines = getInstructionLines(asm);
    const mockMemory = new Map();

    const allVarsByFunc = debugInfo.variables || {};
    const allFunctions = debugInfo.functions || {};

    // Track call stack as we iterate
    const callStack = []; // array of funcName strings

    return trace.map((step, i) => {
        const bp = typeof step.bp === 'number' ? step.bp : 1024;

        // 1. Find the current function from debugInfo by PC range
        let funcName = 'unknown';
        for (const [name, f] of Object.entries(allFunctions)) {
            if (step.pc >= f.start && step.pc <= f.end) {
                funcName = name;
                break;
            }
        }

        // 2. Maintain call stack by watching CALL/RET instructions
        const instruction = instructionLines[step.pc];
        if (instruction) {
            if (instruction.startsWith('CALL')) {
                // Push current function onto stack before the call
                const caller = callStack.length > 0 ? callStack[callStack.length - 1] : funcName;
                if (callStack.length === 0 || callStack[callStack.length - 1] !== caller) {
                    callStack.push(caller);
                }
                // The callee will be detected in next steps by funcName
            } else if (instruction.startsWith('RET')) {
                if (callStack.length > 0) callStack.pop();
            } else if (instruction.startsWith('STORE_LOCAL')) {
                const parts = instruction.split(/[ ,]+/).filter(Boolean);
                if (parts.length >= 3) {
                    const offset = parseInt(parts[1], 10);
                    const regName = parts[2].toLowerCase();
                    const val = (typeof step[regName] === 'number') ? step[regName] : 0;
                    mockMemory.set(bp + offset, val);
                }
            } else if (instruction.startsWith('STORE_GLOBAL')) {
                const parts = instruction.split(/[ ,]+/).filter(Boolean);
                if (parts.length >= 3) {
                    const addr = parseInt(parts[1], 10);
                    const regName = parts[2].toLowerCase();
                    const val = (typeof step[regName] === 'number') ? step[regName] : 0;
                    mockMemory.set(addr, val);
                }
            }
        }

        // 3. Keep callStack in sync with funcName changes (push when entering a new function)
        if (funcName !== 'unknown') {
            if (callStack.length === 0) {
                callStack.push(funcName);
            } else if (callStack[callStack.length - 1] !== funcName) {
                // Check if we returned to a previous function or entered a new one
                const existingIdx = callStack.lastIndexOf(funcName);
                if (existingIdx !== -1) {
                    // We returned - pop everything above it
                    callStack.splice(existingIdx + 1);
                } else {
                    // New function call
                    callStack.push(funcName);
                }
            }
        }

        // 4. Collect variables for this function
        let varList = allVarsByFunc[funcName] || [];
        if (funcName === 'unknown' || varList.length === 0) {
            varList = Object.values(allVarsByFunc).flat();
        }

        const vars = varList.map(v => {
            const isLocal = (v.offset > -500 && v.offset < 500);
            const addr = isLocal ? (bp + v.offset) : v.offset;
            const value = mockMemory.get(addr);
            return {
                name: v.name,
                address: `0x${(addr < 0 ? 0 : addr).toString(16).toUpperCase().padStart(4, '0')}`,
                value: typeof value === 'number' ? value : 0
            };
        });

        return {
            ...step,
            func: funcName,
            callStack: [...callStack], // snapshot of current call stack
            vars
        };
    });
}

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
                // Enrich trace with function names and variables from debug metadata
                const asm = fs.existsSync(TEMP_ASM) ? fs.readFileSync(TEMP_ASM, 'utf8') : '';
                const debugPath = TEMP_ASM.replace('.asm', '.debug.json');
                let debugInfo = { functions: {}, variables: {} };
                if (fs.existsSync(debugPath)) {
                    try {
                        debugInfo = JSON.parse(fs.readFileSync(debugPath, 'utf8'));

                    } catch (e) {
                        console.error("Failed to parse debug info:", e);
                    }
                } else {
                    console.warn('[Debug] No debug.json found at:', debugPath);
                }
                const enrichedTrace = enrichTrace(trace, debugInfo, asm);
                // Log sample enriched step
                const sampleWithVars = enrichedTrace.find(s => s.vars && s.vars.length > 0);
                console.log('[Debug] First step with vars:', JSON.stringify(sampleWithVars, null, 2));
                console.log('[Debug] Last step vars:', JSON.stringify(enrichedTrace[enrichedTrace.length - 1]?.vars));
                res.json({ success: true, trace: enrichedTrace });
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

// ==================== GITHUB INTEGRATION ====================

// 1. Initiate GitHub Login
app.get('/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK;

    if (!clientId || !redirectUri) {
        return res.status(500).json({ error: "GitHub OAuth not configured on server" });
    }

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;
    res.redirect(githubAuthUrl);
});

// 2. GitHub Callback
app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
        // Exchange code for AT
        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_CALLBACK
            },
            { headers: { Accept: 'application/json' } }
        );

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error("Failed to get access token");

        // Get GitHub user details
        const userRes = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const username = userRes.data.login;
        // Generate secure session ID
        const sessionId = crypto.randomBytes(32).toString('hex');

        // Store in memory map
        sessions.set(sessionId, accessToken);

        // Redirect back to frontend with session details
        res.redirect(`http://localhost:5173?session_id=${sessionId}&username=${username}`);
    } catch (err) {
        console.error("GitHub Auth Error:", err.message);
        res.status(500).send("Authentication failed");
    }
});

// Middleware to check GitHub session
const requireGithubSession = (req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: "Unauthorized: Invalid or missing session ID" });
    }
    req.githubToken = sessions.get(sessionId);
    next();
};

// 3. Get User Repositories
app.get('/github/repos', requireGithubSession, async (req, res) => {
    try {
        const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: { Authorization: `Bearer ${req.githubToken}` }
        });

        const repos = response.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            owner: {
                login: repo.owner.login
            },
            default_branch: repo.default_branch,
            updated_at: repo.updated_at
        }));

        res.json({ success: true, repos });
    } catch (err) {
        console.error("Fetch Repos Error:", err.message);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
});

// 4. Get Repository File Tree (Filtered for .c files)
app.get('/github/repo-files', requireGithubSession, async (req, res) => {
    const { owner, repo, branch } = req.query;
    if (!owner || !repo || !branch) {
        return res.status(400).json({ error: "Missing owner, repo, or branch" });
    }

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
            headers: { Authorization: `Bearer ${req.githubToken}` }
        });

        // Filter for only .c files
        const files = response.data.tree
            .filter(item => item.type === 'blob' && item.path.endsWith('.c'))
            .map(item => ({
                path: item.path,
                sha: item.sha,
                size: item.size
            }));

        res.json({ success: true, files });
    } catch (err) {
        console.error("Fetch Repo Files Error:", err.message);
        res.status(500).json({ error: "Failed to fetch repository files" });
    }
});

// 5. Get File Content
app.get('/github/file-content', requireGithubSession, async (req, res) => {
    const { owner, repo, path: filePath } = req.query;
    if (!owner || !repo || !filePath) {
        return res.status(400).json({ error: "Missing owner, repo, or path" });
    }

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            headers: { Authorization: `Bearer ${req.githubToken}` }
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        res.json({
            success: true,
            content,
            sha: response.data.sha
        });
    } catch (err) {
        console.error("Fetch File Content Error:", err.message);
        res.status(500).json({ error: "Failed to fetch file content" });
    }
});

// 6. Push Changes to GitHub (Supports both create and update)
app.put('/github/push', requireGithubSession, async (req, res) => {
    const { owner, repo, path: filePath, content, sha, message } = req.body;

    // content can be empty string, so check for undefined
    if (!owner || !repo || !filePath || content === undefined) {
        return res.status(400).json({ error: "Missing required fields for push" });
    }

    try {
        const base64Content = Buffer.from(content, 'utf8').toString('base64');

        const payload = {
            message: message || `Update ${filePath} from VoltC IDE`,
            content: base64Content,
        };

        if (sha) {
            payload.sha = sha;
        }

        const response = await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, payload, {
            headers: { Authorization: `Bearer ${req.githubToken}` }
        });

        res.json({
            success: true,
            newSha: response.data.content.sha,
            commit: response.data.commit.message
        });
    } catch (err) {
        console.error("Push Error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.message || "Failed to push changes to GitHub" });
    }
});

// 7. Create New Repository
app.post('/github/create-repo', requireGithubSession, async (req, res) => {
    const { name, description, private: isPrivate } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Repository name is required" });
    }

    try {
        const response = await axios.post('https://api.github.com/user/repos', {
            name,
            description,
            private: isPrivate || false,
            auto_init: true // Create a README so the repo has a default branch
        }, {
            headers: { Authorization: `Bearer ${req.githubToken}` }
        });

        res.json({
            success: true,
            repo: {
                id: response.data.id,
                name: response.data.name,
                full_name: response.data.full_name,
                owner: {
                    login: response.data.owner.login
                },
                default_branch: response.data.default_branch
            }
        });
    } catch (err) {
        console.error("Create Repo Error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.message || "Failed to create repository" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`C Compiler Backend API running on http://localhost:${PORT}`);
});
