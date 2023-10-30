import {IPage, Page} from "./page";
import {LoaderDOMContentToken} from "../util/loader";
import {request} from "../util/request";
import {absoluteURL} from "../util/url";
import {AssetElement, AssetManager} from "./asset";
import {PageWidget, PageWidgets} from "./widget";
import KeyStore from "./keystore";


export default class Navigator {

    private _activePage: IPage;
    private _pageCache: Record<string, { mode: "async", value: Promise<IPage> } | { mode: "sync", value: IPage }>;

    constructor() {
        this._activePage = Navigator._getInitialPage("204");
        this._pageCache = {};
        this._pageCache[this._activePage.id] = { mode: "sync", value: this._activePage };
    }

    get activePage(): IPage {
        return this._activePage;
    }

    navigate(id: string): void {
        let prom: Promise<IPage>;
        const cached = this._pageCache[id];
        if (!!cached) {
            if (cached.mode === "async") {
                prom = cached.value;
            } else {
                prom = Promise.resolve(cached.value);
            }
        } else {
            prom = this._doNavigate(id);
            const me = this;
            me._pageCache[id] = { mode: "async", value: prom };
            prom.then((page) => {
                me._pageCache[id] = { mode: "sync", value: page };
            });
        }

        (async () => {
            this._transitionStart();
            const page: IPage = await prom;
            this._transitionStop();
            this._swap(this._activePage, page);
        })().catch((e) => {
            console.error(e);
            this.navigate("404");
        });
    }

    async isPrivate(id: string): Promise<boolean> {
        const absURL = absoluteURL(`assets/pagedef/${id}.html`);
        for (let privateEntry in await this._getPrivateContents()) {
            if (privateEntry === absURL) {
                return true;
            }
        }
        return false;
    }

    private async _doNavigate(id: string): Promise<Page> {
        console.log("doing navigate: " + id);
        await new Promise<void>((res) => {
            window.loader.onRemoveToken(LoaderDOMContentToken, () => {
                res();
            });
        });
        console.log("awaited dom-content");

        const pageDataURL = `assets/pagedef/${id}.html`;
        const priv: boolean = await this.isPrivate(id);

        let pageData: string;
        if (priv) {
            if (!KeyStore.hasKey()) throw new Error(`Cannot navigate to page ${id}, requires authentication`);
            pageData = await request.getPrivate(pageDataURL, KeyStore.getKey()!);
        } else {
            pageData = await request.get(pageDataURL);
        }
        const element: HTMLHtmlElement = document.createElement("html");
        element.innerHTML = pageData;

        const head: HTMLHeadElement | null = element.querySelector("head");
        const widgets: PageWidget[] = [];
        if (!!head) {
            const tags = head.querySelectorAll("script, link");

            await new Promise<void>((res) => {
                const total: number = tags.length;
                if (total === 0) {
                    res();
                    return;
                }
                let loaded: number = 0;

                for (let i=0; i < total; i++) {
                    AssetManager.getOrCreate(tags.item(i) as AssetElement).onLoad((asset) => {
                        loaded++;
                        console.log(`Loaded ${asset.tag} asset (${loaded}/${total}): ${asset.url}`);
                        if (loaded >= total) res();
                    });
                }
            });

            const metas = head.querySelectorAll("meta");
            for (let z=0; z < metas.length; z++) {
                const meta: HTMLMetaElement = metas.item(z);
                if (meta.getAttribute("name")?.toLowerCase() === "widgets") {
                    for (let widgetType of meta.content.split(/\s+/g)) {
                        const widget = PageWidgets.createOrNull(widgetType);
                        if (!!widget) widgets.push(widget);
                    }
                }
            }
        }

        let el: HTMLDivElement;
        const existing: HTMLDivElement | null = document.body.querySelector(`[data-page="${id}"]`);
        if (!!existing) {
            el = existing;
            el.innerHTML = "";
        } else {
            el = document.createElement("div");
            el.classList.add("dyn-page");
            el.setAttribute("data-page", id);
            document.body.appendChild(el);
        }

        const body: HTMLBodyElement | null = element.querySelector("body");
        const moveFrom: HTMLElement = (!!body) ? body : element;
        while (moveFrom.hasChildNodes()) el.appendChild(moveFrom.firstChild!);

        return new Page(id, el, widgets);
    }

    private _transitionStart() {

    }

    private _transitionStop() {

    }

    private _swap(oldPage: IPage, newPage: IPage) {
        oldPage.close();
        newPage.open();
        this._activePage = newPage;

        const extract: ((page: IPage) => HTMLElement | null) = (page) =>
            (page instanceof Page) ? page.root :
            document.querySelector(`body > [data-page="${page.id}"]`);
        const oldElement: HTMLElement | null = extract(oldPage);
        const newElement: HTMLElement | null = extract(newPage);

        if (!!oldElement && !!newElement) {
            const carry = document.createElement("div");
            while (oldElement.hasChildNodes()) carry.appendChild(oldElement.firstChild!);
            while (newElement.hasChildNodes()) oldElement.appendChild(newElement.firstChild!);
            while (carry.hasChildNodes()) newElement.appendChild(carry.firstChild!);
            oldElement.setAttribute("data-page", newPage.id);
            oldElement.classList.add("active");
            newElement.setAttribute("data-page", oldPage.id);
            newElement.classList.remove("active");
        } else {
            // contingency
            const others = document.querySelectorAll("body > [data-page]");
            if (!!newElement) newElement.classList.add("active");
            for (let i=0; i < others.length; i++) {
                const el = others.item(i);
                if (el.getAttribute("data-page") === newPage.id) continue;
                el.classList.remove("active");
            }
        }
    }

    private _privateContentsPromise: Promise<string[]> = Promise.resolve([]);
    private _privateContentsPromiseInit: boolean = false;
    private _getPrivateContents(): Promise<string[]> {
        if (!this._privateContentsPromiseInit) {
            this._privateContentsPromise = new Promise<string[]>(async (res) => {
                const json = await request.get("assets/data/private_contents.json", undefined, "json");
                if (Array.isArray(json)) {
                    res((json as unknown[]).map((v) => absoluteURL(`${v}`)));
                } else {
                    res([]);
                }
            });
            this._privateContentsPromiseInit = true;
        }
        return this._privateContentsPromise;
    }

    private static _getInitialPage(defaultID: string): IPage {
        if (!window.loader.hasToken(LoaderDOMContentToken)) {
            const el = document.querySelector("body > .dyn-page.active");
            if (!!el) {
                let pid = el.getAttribute("data-page");
                return new Page(!pid ? defaultID : pid, el as HTMLElement);
            }
        }
        return Page.null(defaultID);
    }

}
