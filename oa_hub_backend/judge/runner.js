const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Use a local temp directory or strict system temp
const TEMP_DIR = path.join(__dirname, 'temp_jobs');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const TIMEOUT_MS = 5000; // 5 Seconds execution timeout

const CONFIG = {
    cpp: {
        image: 'judge-cpp',
        filename: 'Main.cpp',
        cmd: ['bash', '-c', 'g++ Main.cpp -o main && ./main']
    },
    python: {
        image: 'judge-python',
        filename: 'Main.py',
        cmd: ['python3', 'Main.py']
    },
    java: {
        image: 'judge-java',
        filename: 'Main.java',
        cmd: ['bash', '-c', 'javac Main.java && java Main']
    },
    javascript: {
        image: 'node:20-alpine',
        filename: 'Main.js',
        cmd: ['node', 'Main.js']
    }
};

/**
 * Runs code in a secure Docker container.
 * @param {string} language - cpp, python, java, javascript
 * @param {string} code - Source code
 * @param {string} input - Raw Raw STDIN input
 * @returns {Promise<{stdout: string, stderr: string, status: string}>}
 */
function runCode(language, code, input) {
    return new Promise((resolve) => {
        const config = CONFIG[language];
        if (!config) {
            return resolve({ stdout: "", stderr: "Language not supported", status: "RE" });
        }

        const jobId = crypto.randomUUID();
        const jobDir = path.join(TEMP_DIR, jobId);

        // 1. Setup Environment
        try {
            fs.mkdirSync(jobDir, { recursive: true });
            fs.writeFileSync(path.join(jobDir, config.filename), code);
        } catch (err) {
            return resolve({ stdout: "", stderr: "System Error: " + err.message, status: "RE" });
        }

        // 2. Prepare Docker Args
        // Network none, limit memory, auto-remove, mount volume
        const args = [
            'run', '--rm',
            '--network', 'none',
            '--memory=256m',
            '--cpus=0.5',
            '-v', `${jobDir}:/app`,
            '-w', '/app',
            '-i', // Interactive (Keep STDIN open)
            config.image,
            ...config.cmd
        ];

        // 3. Spawn
        const child = spawn('docker', args);

        let stdout = "";
        let stderr = "";
        let killed = false;

        // 4. Timeout Handling
        const timer = setTimeout(() => {
            killed = true;
            child.kill(); // SIGTERM
            // Force kill if stuck
            setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 500);
        }, TIMEOUT_MS);

        // 5. Handle I/O
        child.stdout.on('data', (data) => {
            if (stdout.length < 50000) stdout += data.toString(); // Limit output size
        });

        child.stderr.on('data', (data) => {
            if (stderr.length < 50000) stderr += data.toString();
        });

        // 6. Write Input to STDIN
        if (input) {
            child.stdin.write(input);
        }
        child.stdin.end(); // Important: Close stdin so process knows input is done

        // 7. Cleanup & Resolve
        child.on('close', (code) => {
            clearTimeout(timer);

            // Clean Files
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (e) { console.error("Cleanup failed:", e.message); }

            // Determine Status
            let status = "AC";
            if (killed) {
                status = "TLE";
                stderr += "\nTime Limit Exceeded";
            } else if (code !== 0) {
                // Heuristic for Compilation Error vs Runtime Error
                // Usually GCC prints to stderr. 
                status = "RE";
                // Simple keyword check (not perfect but helpful)
                if ((language === 'cpp' || language === 'java') && stderr.includes('error:')) {
                    status = "CE";
                }
            }

            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                status
            });
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (_) { }
            resolve({ stdout: "", stderr: "Docker Execution Error: " + err.message, status: "RE" });
        });
    });
}

module.exports = { runCode };
