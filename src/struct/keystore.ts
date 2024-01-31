/*
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
*/

import * as hex from "@stablelib/hex";
import { pbkdf2 } from "pbkdf2";
import nacl from "tweetnacl";
import { request } from "../util/request";
import SessionStorage from "../util/storage";


const MAGIC: string = "nacl_secret_key";
export default class KeyStore {

    static hasKey(): boolean {
        return SessionStorage.has(MAGIC);
    }

    static getKey(): Uint8Array | null {
        const raw: string | null = SessionStorage.get(MAGIC);
        if (raw === null) return null;

        try {
            return hex.decode(raw);
        } catch (e) {
            console.warn(e);
        }
        return null;
    }

    /**
     * DO NOT ALLOW CALLING THIS METHOD IF PROTOCOL IS NOT HTTPS
     */
    static async login(password: string, progress?: (message: string) => void): Promise<Uint8Array | null> {
        const doProgress: boolean = typeof progress === "function";
        if (doProgress) progress!("Generating key");

        const key: Uint8Array = await new Promise<Uint8Array>((res, rej) => {
            pbkdf2(password, 'Wa$abiL0vesS4lt!', 600000, nacl.secretbox.keyLength, 'sha512', function (err, key) {
                if (!!err) {
                    rej(err);
                } else {
                    res(key);
                }
            });
        });

        if (doProgress) progress!("Verifying key");
        let stored: string;
        try {
            stored = await request.getPrivate("./key", key);
        } catch (e) {
            console.warn(e);
            return null;
        }
        if (stored !== password) throw new Error(`Illegal key configuration (stored: ${stored}, provided: ${password})`);

        if (doProgress) progress!("Storing key");
        SessionStorage.set(MAGIC, hex.encode(key, false));

        return key;
    }

}
