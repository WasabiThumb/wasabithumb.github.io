const fs = require("fs");
const path = require("path");
const utf8 = require("@stablelib/utf8");
const exec = require("child_process").exec;

const srcDir = path.resolve(__filename, "../../src");

const NOTICE = `/*
   Copyright 2023 WasabiThumb

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/\n\n`;
const NOTICE_BYTES = utf8.encode(NOTICE);

const CHUNK_SIZE = 8192;
const patchSourceFile = ((dir, file) => {
    let fd = fs.openSync(file, 'r');
    const chunks = [];

    let head = Buffer.allocUnsafe(CHUNK_SIZE);
    let read = 0;
    let cursor = 0;

    while ((read = fs.readSync(fd, head, cursor, CHUNK_SIZE - cursor)) > 0) {
        if (cursor === 0) {
            // if the first character is a forward slash assume the notice is already included
            if (head[0] === 0x2F) {
                fs.closeSync(fd);
                return;
            }
        }
        cursor += read;
        if (cursor >= CHUNK_SIZE) {
            chunks.push(head);
            head = Buffer.allocUnsafe(CHUNK_SIZE);
            cursor = 0;
        }
    }
    const length = cursor + (chunks.length * CHUNK_SIZE);
    const data = Buffer.concat([...chunks, head], length);
    fs.closeSync(fd);

    console.log("File appears to have no copyright notice (" + path.relative(srcDir, file) + "), fixing");

    fd = fs.openSync(file, 'w');
    fs.writeSync(fd, NOTICE_BYTES);
    fs.writeSync(fd, data);
    fs.closeSync(fd);

    console.log("Adding file to git...");
    exec(`git add ${file}`, { cwd: dir }, function (error) {
        if (!!error) console.warn(error);
    }).stdout.pipe(process.stdout);
});

const patchSourceFiles = ((root) => {
    const listing = fs.readdirSync(root, { withFileTypes: true });
    for (let ent of listing) {
        if (ent.isDirectory()) {
            patchSourceFiles(path.resolve(root, ent.name));
        } else if (ent.isFile()) {
            patchSourceFile(root, path.resolve(root, ent.name));
        }
    }
});


if (require.main === module) {
    patchSourceFiles(srcDir);
    console.log("Checked copyright notices for source files");
}
