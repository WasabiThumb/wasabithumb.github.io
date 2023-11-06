const fs = require("fs/promises");
const path = require('path');
const buildscript = require("../package.json");


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
            console.warn("Failed to identify current branch");
            return "dev";
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

// injects the version into src/util/version.ts
const setVersion = (async (version) => {
    const fn = path.resolve(__dirname, "..", "src", "util", "version.ts");
    const f = await fs.open(fn, 'r');
    const tmp = await fs.open(fn + ".tmp", 'w');

    for await (const line of f.readLines()) {
        if (/^(.*)LIB_VERSION(.*)/i.test(line)) {
            await tmp.write(`export const LIB_VERSION: string = "${version}";\n`);
        } else {
            await tmp.write(`${line}\n`);
        }
    }

    await f.close();
    await tmp.close();

    await fs.rename(fn + ".tmp", fn);
    await fs.rm(fn + ".tmp").catch(() => {});
});

// queries, updates, and returns the version data
const version = (() => {
    return Git.Repository.open(path.resolve(__dirname, "..")).then(async (repo) => {
        const branch = await repo.getCurrentBranch();
        const commit = await repo.getHeadCommit();
        if (branch.shorthand().toLowerCase() === "master") {
            return { mode: 'production', devtool: false, version: buildscript.version };
        } else {
            const postfix = commit.sha().slice(0, 7);
            return { mode: 'development', devtool: 'inline-source-map', version: `${buildscript.version}-git-${postfix}` };
        }
    }).then(async (dat) => {
        await setVersion(dat.version);
        return dat;
    });
});

module.exports = version;
