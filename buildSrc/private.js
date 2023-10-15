/*
The "private" directory is not included in the Git repo, and will be ignored if it does not
exist. If it does exist, its contents will be encrypted using a key set in private/.key,
and saved to the "static" directory appended with ".private". This allows only users with
the key to see certain content on the site, without the need for a preprocessor like PHP.
*/
if (require.main !== module) process.exit(0);

const fs = require("fs");
const path = require("path");
const pbkdf2 = require("pbkdf2");
const nacl = require("tweetnacl");

const privateDir = path.resolve(__filename, "../../private");
const staticDir = path.resolve(__filename, "../../static");
const privateKeyFile = path.resolve(privateDir, ".key");

try {
    fs.accessSync(privateKeyFile, fs.constants.F_OK);
} catch (e) {
    console.warn("No private key found, skipping private file processing");
    process.exit(0);
}

const privateKey = fs.readFileSync(privateKeyFile, { encoding: "utf8" });
const derivedKey = pbkdf2.pbkdf2Sync(
    privateKey,
    'Wa$abiL0vesS4lt!',
    600000,
    nacl.secretbox.keyLength,
    'sha512'
);
const PROCESSED = [];
const encrypt = ((file) => {
    const rel = path.relative(privateDir, file);
    console.log("Encrypting file \"" + rel + "\"");
    PROCESSED.push(rel);

    const dest = path.join(staticDir, rel + ".private");
    const parent = path.dirname(dest);
    try {
        fs.accessSync(parent, fs.constants.F_OK);
    } catch (e) {
        fs.mkdirSync(parent, { recursive: true });
    }

    const data = fs.readFileSync(file);
    const handle = fs.openSync(dest, 'w');

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const box = nacl.secretbox(data, nonce, derivedKey);
    fs.writeSync(handle, nonce);
    fs.writeSync(handle, box);
    fs.closeSync(handle);
});
const cleanup = ((file) => {
    let rel = path.relative(staticDir, file);
    if (!rel.endsWith(".private")) return;
    rel = rel.slice(0, -8);
    if (PROCESSED.indexOf(rel) >= 0) return;
    console.log("Cleaning up non-backed private file \"" + rel + "\"");
    fs.rmSync(file);
});

const walk = ((head, action) => {
    const found = fs.opendirSync(head);
    let dirent;
    while (true) {
        dirent = found.readSync();
        if (!dirent) break;

        const abs = path.join(head, dirent.name);
        if (dirent.isDirectory()) {
            walk(abs, action);
        } else if (dirent.isFile()) {
            action(abs);
        }
    }
});
walk(privateDir, encrypt);
walk(staticDir, cleanup);