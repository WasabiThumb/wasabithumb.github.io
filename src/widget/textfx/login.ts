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

import {TextEffect, TextEffectTarget, TextEffectType} from "../textfx";
import {ConstantData} from "../../util/constdata";
import KeyStore from "../../struct/keystore";
import {request} from "../../util/request";


export default class LoginTextEffect implements TextEffect {

    readonly type: TextEffectType = "login";
    private _revealed: boolean = false;
    private _abort: AbortController | null = null;
    private _center: HTMLImageElement | null = null;

    init(target: TextEffectTarget): void {
        const center: HTMLImageElement = document.createElement("img");
        center.src = ConstantData.LOCK_SVG;
        center.style.position = "absolute";
        center.style.filter = "none";
        center.style.zIndex = "700";
        center.style.filter = "drop-shadow(0 0 0.75em black)";
        center.style.cursor = "pointer";
        center.alt = "Encrypted";
        center.classList.add("hover-expand-wiggle");

        const parent = target.parentElement!;
        parent.style.position = "relative";
        this._position(parent, target, center);
        parent.appendChild(center);
        this._center = center;

        const abort: AbortController = new AbortController();
        const me = this;
        center.addEventListener("click", () => {
            if (me._revealed) return;
            me._onClick(target);
        }, { signal: abort.signal });
        this._abort = abort;

        if (KeyStore.hasKey()) this._onClick(target);
    }

    render(target: TextEffectTarget, delta: number): boolean {
        if (this._revealed) return false;
        const center: HTMLImageElement = this._center!;
        this._position(target.parentElement!, target, center);
        return true;
    }

    destroy(target: TextEffectTarget): void {
        if (!!this._abort) this._abort.abort();
        target.parentElement!.removeChild(this._center!);
    }

    private _position(parent: HTMLElement, target: TextEffectTarget, icon: HTMLImageElement) {
        const parentRect = parent.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const size = 0.6 * Math.min(targetRect.width, targetRect.height);
        icon.style.width = `${size}px`;
        icon.style.height = `${size}px`;
        icon.style.left = `${(targetRect.width - size) / 2 + (targetRect.left - parentRect.left)}px`;
        icon.style.top = `${(targetRect.height - size) / 2 + (targetRect.top - parentRect.top)}px`;
    }

    private _processingAuth: boolean = false;
    private _onClick(target: TextEffectTarget): void {
        if (this._processingAuth) return;
        this._processingAuth = true;

        const center: HTMLImageElement = this._center!;
        let loadTimeout: number = window.setTimeout(() => {
            center.src = ConstantData.LOADING_GRID_SVG;
        }, 50);

        const me = this;
        this._reveal(target).then((body: string | null) => {
            if (!!body) target.innerText = body;
            window.clearTimeout(loadTimeout);
            target.classList.remove("private");
            me._revealed = true;
            me._processingAuth = false;
        }).catch((e) => {
            console.warn(e);
            window.clearTimeout(loadTimeout);
            center.src = ConstantData.LOCK_SVG;
            me._processingAuth = false;
        });
    }

    private async _reveal(target: TextEffectTarget): Promise<string | null> {
        let key: Uint8Array = KeyStore.hasKey() ? KeyStore.getKey()! : await KeyStore.loginModal();

        const id: string | null = target.getAttribute("data-text-private");
        if (!id) return null;

        return (await request.getPrivate(`assets/text/${id}.txt`, key, undefined, "text")) as string;
    }

}
