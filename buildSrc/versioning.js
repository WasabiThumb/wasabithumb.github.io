const fs = require("fs/promises");
const path = require('path');


// A replacement for the parts of the "nodegit" module that we actually use.
// nodegit is great and very fast but GH Actions doesnt seem to like it. instead we will use FS if it is not installed.
const Git = (() => {
    try {
        return require("nodegit");
    } catch (e) {
        if (e instanceof Error && e.code === "MODULE_NOT_FOUND") {
            console.log("\"nodegit\" library not found, install with \"npm install -g nodegit\" for faster builds");
        } else {
            throw e;
        }
    }

    const repo = (async (p) => {
        const metaPath = path.resolve(p, ".git");
        const stats = await fs.stat(metaPath);
        if (!stats.isDirectory()) throw new Error("No git metadata");

        const currentBranchPromise = (async () => {
            const f = await fs.open(path.resolve(metaPath, "HEAD"), 'r');
            try {
                for await (const line of f.readLines()) {
                    const match = line.match(/^ref:\s*(.*)/i);
                    if (!match) continue;
                    return match[1];
                }
            } finally {
                await f.close();
            }
            throw new Error("Failed to identify current branch");
        })();

        return {
            getCurrentBranch: (async () => {
                const ref = await currentBranchPromise;
                return {
                    shorthand: (() => ref.split(/[/\\]/i).at(-1))
                };
            }),
            getHeadCommit: (async () => {
                const ref = await currentBranchPromise;
                const f = await fs.readFile(path.resolve(metaPath, ref), { encoding: 'utf8', flag: 'r' });
                return {
                    sha: (() => f.split(/\n|\r\n/i)[0])
                }
            })
        };
    });

    return {
        Repository: {
            open: repo
        }
    };
})();
