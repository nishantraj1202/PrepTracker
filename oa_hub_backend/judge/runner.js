const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

const IMAGES = {
    cpp: 'judge-cpp',
    python: 'judge-python',
    java: 'judge-java',
    javascript: 'node:20.10.0-alpine' // Use standard Node alpine image
};

const FILE_NAMES = {
    cpp: 'Main.cpp',
    python: 'Main.py',
    java: 'Main.java',
    javascript: 'Main.js'
};

const CMD_TIMEOUT = 10000; // 10s max for container life

function runCode(language, code, input) {
    return new Promise((resolve, reject) => {
        // Validation
        if (!IMAGES[language]) {
            return reject(new Error(`Language ${language} not supported`));
        }

        const jobId = Date.now() + Math.random().toString(36).substring(7);
        const jobDir = path.join(TEMP_DIR, jobId);

        try {
            // Create job-specific directory
            fs.mkdirSync(jobDir);

            const fileName = FILE_NAMES[language];
            const codePath = path.join(jobDir, fileName);
            const inputPath = path.join(jobDir, 'input.txt');

            fs.writeFileSync(codePath, code);
            fs.writeFileSync(inputPath, input || "");

            // Docker command
            // On Windows, $(pwd) in git bash maps to path, but here we use node path
            // We need absolute path for volume mount
            const workDir = jobDir;

            // Adjust memory/cpu as needed
            // Note: --network none is CRITICAL
            const image = IMAGES[language];
            let runCmd = '';

            // This relies on the Entrypoint of your custom images.
            // But for standard Node image, we need to specify "node Main.js"
            if (language === 'javascript') {
                runCmd = `docker run --rm --network none --memory="256m" --cpus="0.5" -v "${workDir}:/app" -w /app ${image} node Main.js`;
            } else {
                // For my custom images (judge-cpp, etc.), they might have ENTRYPOINT scripts that compile and run.
                // Assuming they are set up to run automatically
                runCmd = `docker run --rm --network none --memory="256m" --cpus="0.5" -v "${workDir}:/app" ${image}`;
            }

            const cmd = runCmd;

            exec(cmd, { timeout: CMD_TIMEOUT }, (err, stdout, stderr) => {
                // Helper to clean up
                const cleanup = () => {
                    try {
                        // Retry loop or async cleanup could be better but sync is fine for MVP
                        fs.rmSync(jobDir, { recursive: true, force: true });
                    } catch (e) {
                        console.error(`Failed to cleanup ${jobDir}:`, e.message);
                    }
                };

                // Prepare result
                const result = {
                    stdout: stdout ? stdout.toString() : "",
                    stderr: stderr ? stderr.toString() : "",
                    status: "AC", // Default
                };

                if (err) {
                    if (err.killed) {
                        result.status = "TLE";
                        result.stderr += "\nTime Limit Exceeded";
                    } else if (result.stdout.includes("Compilation Error")) {
                        result.status = "CE";
                    } else {
                        // Runtime Error usually
                        result.status = "RE";
                    }
                }

                cleanup();
                resolve(result);
            });

        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { runCode };