import nacl from "tweetnacl";
import * as utf8 from "@stablelib/utf8";
import * as base64 from "@stablelib/base64";
import { absoluteURL } from "../util/url";


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
