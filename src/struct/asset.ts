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

import nacl from "tweetnacl";
import * as utf8 from "@stablelib/utf8";
import * as base64 from "@stablelib/base64";
import { absoluteURL } from "../util/url";
import {request} from "../util/request";


export type AssetElement = HTMLScriptElement | HTMLLinkElement;
export type AssetTag = "script" | "link";
type IEAssetElement = AssetElement & { readyState: string, onreadystatechange?: (() => void) | null };


const ASSET_MAGIC = -889278443;
export class Asset {

    static of(asset: Asset | AssetElement): Asset {
        if ((asset as unknown as { _magic?: any })["_magic"] === ASSET_MAGIC) {
            return asset as Asset;
        } else {
            return new Asset(asset as AssetElement);
        }
    }

    readonly element: AssetElement;
    readonly tag: AssetTag;
    readonly url: string;
    readonly hash: string;
    private readonly _magic = ASSET_MAGIC;
    private _loaded: boolean;
    private readonly _loadCallbacks: ((asset: Asset) => void)[] = [];
    constructor(element: AssetElement) {
        this.element = element;
        switch (element.tagName.toLowerCase()) {
            case "script":
                this.tag = "script";
                this.url = (this.element as HTMLScriptElement).src;
                break;
            default:
                this.tag = "link";
                this.url = (this.element as HTMLLinkElement).href;
                break;
        }

        let hash: string;
        if (element.hasAttribute("data-asset-hash")) {
            hash = element.getAttribute("data-asset-hash")!;
        } else {
            let buf: Uint8Array = utf8.encode(`${this.tag}$${absoluteURL(this.url)}`);
            buf = nacl.hash(buf);
            hash = base64.encode(buf);
            element.setAttribute("data-asset-hash", hash);
        }
        this.hash = hash;

        this._loaded = element.hasAttribute("data-asset-loaded");
        if (this._loaded) return;

        const me = this;
        let loadFunc = (() => { me._load(); });

        if (this.tag === "script" && "readyState" in element) {
            const ie: IEAssetElement = element as unknown as IEAssetElement;
            ie.onreadystatechange = function () {
                if (ie.readyState === "loaded" || ie.readyState === "complete") {
                    ie.onreadystatechange = null;
                    loadFunc();
                }
            }
            return;
        }

        if (!("onload" in element) || !("onerror" in element)) {
            let img: HTMLImageElement;
            if (typeof Image === "function") {
                img = new Image();
            } else {
                img = document.createElement("img");
            }
            img.onerror = loadFunc;
            img.src = this.url;
            return;
        }

        if ("addEventListener" in element) {
            let undoAndLoadFunc: (() => void);
            undoAndLoadFunc = (() => {
                try {
                    element.removeEventListener("load", undoAndLoadFunc);
                    element.removeEventListener("error", undoAndLoadFunc);
                } catch (ignored) { }
                loadFunc();
            });

            element.addEventListener("load", undoAndLoadFunc);
            element.addEventListener("error", undoAndLoadFunc);
            return;
        }

        const wack: AssetElement = element as unknown as AssetElement;
        const { onload, onerror } = wack;

        wack.onload = function () {
            wack.onload = onload;
            wack.onerror = onerror;
            loadFunc();
        }

        wack.onerror = function () {
            wack.onload = onload;
            wack.onerror = onerror;
            loadFunc();
        }
    }

    get loaded(): boolean {
        return this._loaded;
    }

    private _load() {
        if (this._loaded) return;
        for (let cb of this._loadCallbacks) {
            try {
                cb(this);
            } catch (e) {
                console.error(e);
            }
        }
        this._loaded = true;
        this.element.setAttribute("data-asset-loaded", "1");
    }

    onLoad(cb: (asset: Asset) => void): void {
        if (this._loaded) {
            try {
                cb(this);
            } catch (e) {
                console.error(e);
            }
        } else {
            this._loadCallbacks.push(cb);
        }
    }

}

export class DocumentAssetManager {

    readonly head: HTMLHeadElement;
    private readonly map: { [hash: string]: Asset } = {};
    constructor(head: HTMLHeadElement) {
        this.head = head;

        const query = head.querySelectorAll("script, link");
        for (let i=0; i < query.length; i++) {
            const item: AssetElement = query.item(i) as AssetElement;
            item.setAttribute("data-asset-loaded", "1");
            const asset = new Asset(item);
            this.map[asset.hash] = asset;
        }
    }

    getOrCreate(asset: Asset | AssetElement): Asset {
        let ob: Asset = Asset.of(asset);
        const hash: string = ob.hash;
        if (hash in this.map) {
            return this.map[hash];
        } else {
            const existing = this.head.querySelector(`${ob.tag}[data-asset-hash="${ob.hash}"]`);
            if (!!existing) {
                ob = Asset.of(existing as AssetElement);
            } else {
                this.head.appendChild(ob.element);
            }
            this.map[hash] = ob;
            return ob;
        }
    }

}

export const AssetManager: DocumentAssetManager = new DocumentAssetManager(document.head);


export class LazyImage {

    readonly url: string
    private _init: boolean = false;
    private _value: HTMLImageElement | null = null;
    private _available: boolean = false;
    private readonly _objectMode: boolean;

    constructor(url: string) {
        this.url = url
        this._objectMode = typeof URL === "function" && !!URL["createObjectURL"] && typeof Blob === "function";
    }

    startLoading() {
        this._init = true;

        const me = this;
        const img: HTMLImageElement = (typeof Image === "function") ? new Image() : document.createElement("img");
        img.onload = function () {
            if (!me._init) {
                if (me._objectMode) URL.revokeObjectURL(img.src);
                return;
            }
            me._value = img;
            me._available = true;
        };
        img.onerror = function () {
            if (me._objectMode) URL.revokeObjectURL(img.src);
        };

        if (this._objectMode) {
            request.getPotentiallyPrivate(this.url, undefined, "bytes").then((bytes: Uint8Array) => {
                if (!me._init) return;
                const blob: Blob = new Blob([ bytes.buffer ]);
                img.src = URL.createObjectURL(blob);
            }).catch(console.error);
        } else {
            img.src = absoluteURL(this.url);
        }
    }

    isAvailable() {
        return this._available;
    }

    get(): HTMLImageElement {
        return this._value!;
    }

    destroy() {
        if (this._available && this._objectMode) {
            URL.revokeObjectURL(this._value!.src);
        }
        this._available = false;
        this._value = null;
        this._init = false;
        this._gridCache = {};
    }

    private _gridCache: { [hash: number]: ImageBitmap | null } = {};
    getGrid(width: number, height: number): ImageBitmap | null {
        if (width < 1 || width > 0xffff || height < 1 || height > 0xffff) throw new Error(`Dimensions out of bounds: ${width}x${height}`);
        if (!this._available) return null;

        let hash: number = ((width & 0xffff) << 16) | (height & 0xffff);
        let cached = this._gridCache[hash];
        if (!!cached || cached === null) return cached;

        try {
            const img: HTMLImageElement = this._value!;
            const offscreen: OffscreenCanvas = new OffscreenCanvas(img.naturalWidth * width, img.naturalHeight * height);

            const ctx: OffscreenCanvasRenderingContext2D = offscreen.getContext("2d")!;
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    ctx.drawImage(img, x * img.naturalWidth, y * img.naturalHeight, img.naturalWidth, img.naturalHeight);
                }
            }

            const bmp = offscreen.transferToImageBitmap();
            this._gridCache[hash] = bmp;
            return bmp;
        } catch (e) {
            console.warn(e);
            this._gridCache[hash] = null;
            return null;
        }
    }

}
