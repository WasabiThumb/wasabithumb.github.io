/*
The "private" directory is not included in the Git repo, and will be ignored if it does not
exist. If it does exist, its contents will be encrypted using a key set in private/key,
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
const privateKeyFile = path.resolve(privateDir, "key");

try {
    fs.accessSync(privateKeyFile, fs.constants.F_OK);
} catch (e) {
    console.warn("No private key found, skipping private file processing");
    process.exit(0);
}
console.info("Checking private contents");

const privateKey = fs.readFileSync(privateKeyFile, { encoding: "utf8" });
const derivedKey = pbkdf2.pbkdf2Sync(
    privateKey,
    'Wa$abiL0vesS4lt!',
    600000,
    nacl.secretbox.keyLength,
    'sha512'
);
const PROCESSED = [];
const checkNotChanged = ((data, dest) => {
    const nonceLength = nacl.secretbox.nonceLength;
    let nonce = new Uint8Array(nonceLength);
    let storedBox = new Uint8Array(8192);

    try {
        fs.accessSync(dest, fs.constants.F_OK);
    } catch (e) {
        return false;
    }

    const handle = fs.openSync(dest, 'r');
    try {
        let head = 0;
        let read;
        while (head < nonceLength) {
            read = fs.readSync(handle, nonce, head, nonceLength - head, head);
            if (read < 1) return false; // unexpected EOF
            head += read;
        }

        head = 0;
        while (true) {
            let rem = storedBox.length - head;
            if (rem < 1) {
                const newBox = new Uint8Array(storedBox.length * 2);
                newBox.set(storedBox);
                storedBox = newBox;
                rem = storedBox.length - head;
            }
            read = fs.readSync(handle, storedBox, head, rem, head + nonceLength);
            if (read < 1) break;
            head += read;
        }
        storedBox = storedBox.subarray(0, head);
    } finally {
        fs.closeSync(handle);
    }

    const expected = nacl.secretbox(data, nonce, derivedKey);
    return nacl.verify(expected, storedBox);
});
const encrypt = ((file) => {
    const rel = path.relative(privateDir, file);
    PROCESSED.push(rel);

    const dest = path.join(staticDir, rel + ".private");
    const parent = path.dirname(dest);
    try {
        fs.accessSync(parent, fs.constants.F_OK);
    } catch (e) {
        fs.mkdirSync(parent, { recursive: true });
    }

    const data = fs.readFileSync(file);
    if (checkNotChanged(data, dest)) return;
    console.log("Encrypting file \"" + rel + "\"");
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
fs.writeFileSync(path.join(staticDir, "assets/data/private_contents.json"), JSON.stringify(PROCESSED), { encoding: "utf8" });
