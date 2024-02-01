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
import {Asset, AssetManager} from "./asset";


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
    static async login(password: string, progress?: (message: string, state: LoginState) => void): Promise<Uint8Array> {
        const doProgress: boolean = typeof progress === "function";
        if (doProgress) progress!("Generating key", LoginState.GENERATING);

        const key: Uint8Array = await new Promise<Uint8Array>((res, rej) => {
            pbkdf2(password, 'Wa$abiL0vesS4lt!', 600000, nacl.secretbox.keyLength, 'sha512', function (err, key) {
                if (!!err) {
                    rej(err);
                } else {
                    res(key);
                }
            });
        });

        if (doProgress) progress!("Verifying key", LoginState.VERIFYING);
        let stored: string = await request.getPrivate("./key", key);
        if (stored !== password) throw new Error(`Illegal key configuration (stored: ${stored}, provided: ${password})`);

        if (doProgress) progress!("Storing key", LoginState.STORING);
        SessionStorage.set(MAGIC, hex.encode(key, false));

        return key;
    }

    static async loginModal(): Promise<Uint8Array> {
        const container: HTMLDivElement = document.createElement("div");
        container.style.zIndex = "9999";
        container.style.background = "rgba(0, 0, 0, 0.6)";
        container.style.position = "fixed";
        container.style.left = "0px";
        container.style.top = "0px";
        container.style.width = "100vw";
        container.style.height = `max(inherit, ${window.innerHeight}px)`;
        container.style.animationName = "fade-in";
        container.style.animationDuration = "200ms";
        container.style.animationTimingFunction = "ease-in-out";
        container.classList.add("login-modal");
        document.body.appendChild(container);

        const css: HTMLLinkElement = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "assets/stylesheets/login-modal.css";

        const asset: Asset = AssetManager.getOrCreate(css);
        await new Promise<Asset>((res) => {
            asset.onLoad(res);
        });

        const inner: HTMLDivElement = document.createElement("div");
        inner.classList.add("inner");

        const h2 = document.createElement("h2");
        h2.innerText = "Authentication";
        inner.appendChild(h2);

        const p = document.createElement("p");
        p.innerText = "Enter my personal e-mail address to view private content";
        inner.appendChild(p);

        const inputEmail: HTMLInputElement = document.createElement("input");
        inputEmail.type = "email";
        inputEmail.placeholder = "name@domain.com";
        inner.appendChild(inputEmail);

        const inputSubmit: HTMLInputElement = document.createElement("input");
        inputSubmit.type = "submit";
        inputSubmit.value = "🏃︎";
        inner.appendChild(inputSubmit);

        const span: HTMLSpanElement = document.createElement("span");
        span.innerText = "i'm a ninja";
        inner.appendChild(span);

        container.appendChild(inner);
        inner.addEventListener("click", (e) => {
            e.stopPropagation();
        });
        inputEmail.focus();

        //

        const closeContainer = (() => document.body.removeChild(container));
        let statusClearTimeout: number = -1;
        const pushStatus = ((text: string, color?: string) => {
            window.clearTimeout(statusClearTimeout);
            span.classList.remove("updated");
            span.innerText = text;
            span.style.color = color || "inherit";
            span.classList.add("updated");
            statusClearTimeout = window.setTimeout(() => {
                span.classList.remove("updated");
            }, 2500);
        });

        return new Promise<Uint8Array>((res, rej) => {
            container.addEventListener("click", () => {
                closeContainer();
                rej("Login modal closed by user");
            });

            const submit = (async () => {
                const loc: Location = window["location"] || location;
                if (loc.protocol !== "https:" && !(loc.hostname === "localhost" || loc.hostname === "127.0.0.1")) {
                    pushStatus("Refusing to authenticate (not using HTTPS)", "red");
                    return;
                }

                let reachedState: LoginState = LoginState.GENERATING;
                try {
                    pushStatus("Authenticating");
                    const key = await KeyStore.login(inputEmail.value, (msg: string, state: LoginState) => {
                        pushStatus(msg);
                        reachedState = state;
                    });
                    pushStatus("Success", "#3db406");
                    await new Promise((res) => setTimeout(res, 500));
                    closeContainer();
                    res(key);
                } catch (e) {
                    if ((reachedState as LoginState) === LoginState.VERIFYING) {
                        pushStatus("Could not verify key. Please try again with a different e-mail.", "red");
                    } else {
                        pushStatus("Unexpected error. Please try again.", "red");
                        console.warn(e);
                    }
                }
            });

            let lockSubmissions: boolean = false;
            const submitSync = (() => {
                if (lockSubmissions) return;
                lockSubmissions = true;
                submit().then(() => {
                    lockSubmissions = false;
                }).catch((e) => {
                    lockSubmissions = false;
                    closeContainer();
                    rej(e);
                });
            });

            inputEmail.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.code === "Enter" || e.which === 13 || e.keyCode === 13) {
                    e.preventDefault();
                    submitSync();
                }
            });
            inputSubmit.addEventListener("click", submitSync);
        });
    }

}

export enum LoginState {
    GENERATING,
    VERIFYING,
    STORING
}
