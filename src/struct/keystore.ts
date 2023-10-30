import * as hex from "@stablelib/hex";
import { pbkdf2 } from "pbkdf2";
import nacl from "tweetnacl";
import { request } from "../util/request";


const MAGIC: string = "nacl_secret_key";
export default class KeyStore {

    static hasKey(): boolean {
        return this._getSSP().has(MAGIC);
    }

    static getKey(): Uint8Array | null {
        const ssp: SessionStorageProvider = this._getSSP();
        const raw: string | null = ssp.get(MAGIC);
        if (raw === null) return null;

        try {
            return hex.decode(raw);
        } catch (e) {
            console.warn(e);
        }
        return null;
    }

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
        const stored: string = await request.getPrivate("./.key", key);
        if (stored !== password) throw new Error(`Illegal key configuration (stored: ${stored}, provided: ${password})`);

        if (doProgress) progress!("Storing key");
        const ssp: SessionStorageProvider = this._getSSP();
        ssp.set(MAGIC, hex.encode(key, false));

        return key;
    }

    private static _ssp: SessionStorageProvider;
    private static _sspInit: boolean = false;
    private static _getSSP(): SessionStorageProvider {
        if (!this._sspInit) {
            if (!!window["sessionStorage"]) {
                this._ssp = new NativeSessionStorageProvider();
                this._sspInit = true;
            } else {
                this._ssp = new CookieSessionStorageProvider();
            }
        }
        return this._ssp;
    }

}

interface SessionStorageProvider {

    get(key: string): string | null;

    set(key: string, value: string): void;

    has(key: string): boolean;

    remove(key: string): void;

}

class NativeSessionStorageProvider implements SessionStorageProvider {

    get(key: string): string | null {
        return window.sessionStorage.getItem(key);
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    set(key: string, value: string): void {
        window.sessionStorage.setItem(key, value);
    }

    remove(key: string): void {
        window.sessionStorage.removeItem(key);
    }

}

class CookieSessionStorageProvider implements SessionStorageProvider {

    get(key: string): string | null {
        const keyEq = `${key}=`;
        const keyStart = keyEq.charAt(0);
        const components: string[] = document.cookie.split(";");

        outer:
        for (let i=0; i < components.length; i++) {
            const component: string = components[i];
            let z: number = 0;
            while (z < component.length) {
                const char = component.charAt(z);
                if (char === keyStart) break;
                if (char !== " ") continue outer;
                z++;
            }
            if (component.indexOf(keyEq) === z) return component.substring(z + keyEq.length, component.length);
        }
        return null;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    set(key: string, value: string): void {
        const date = new Date();
        date.setTime(date.getTime() + 900000);
        document.cookie = `${key}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
    }

    remove(key: string): void {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }

}
