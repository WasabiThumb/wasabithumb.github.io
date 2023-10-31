import {IPage, Page} from "./page";
import {LoaderDOMContentToken} from "../util/loader";
import {request} from "../util/request";
import {absoluteURL} from "../util/url";
import {AssetElement, AssetManager} from "./asset";
import {PageWidget, PageWidgets} from "./widget";
import KeyStore from "./keystore";
import {AsyncLock} from "../util/lock";
import RenderDispatch from "../util/render";
import {ConstantData} from "../util/constdata";


type NavigateCallback = ((oldPage: IPage, newPage: IPage) => void);
export default class Navigator {

    private _activePage: IPage;
    private readonly _pageCache: Record<string, { mode: "async", value: Promise<IPage> } | { mode: "sync", value: IPage }> = {};
    private readonly _callbacks: NavigateCallback[];
    private readonly _lock: AsyncLock;
    private _firstAutoNavigate: boolean = true;


    constructor() {
        this._activePage = Navigator._getInitialPage("204");
        this._pageCache[this._activePage.id] = { mode: "sync", value: this._activePage };
        this._callbacks = [];
        this._lock = new AsyncLock();
    }

    get activePage(): IPage {
        return this._activePage;
    }

    checkHash(): void {
        const hash: string = window.location.hash;
        const dest: string = ((hash.length < 2) ? "home" : hash.substring(1)).toLowerCase();
        if (dest === this._activePage.id.toLowerCase()) return;
        if (this._firstAutoNavigate) {
            this._firstAutoNavigate = false;
            window.loader.addToken("navigator-initial-page");
            this.onNavigate(() => {
                window.loader.removeToken("navigator-initial-page");
            });
        }
        this.navigate(dest);
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
            await this._lock.lock();
            try {
                this._transitionStart();
                const page: IPage = await prom;
                this._transitionStop();
                for (let cb of this._callbacks) {
                    try {
                        cb(this._activePage, page);
                    } catch (e) {
                        console.error(e);
                    }
                }
                this._swap(this._activePage, page);
            } finally {
                this._lock.unlock();
            }
        })().catch((e) => {
            console.error(e);
            try {
                if (window.location.hash.toLowerCase() === `#${id.toLowerCase()}`) {
                    window.history.replaceState(undefined, document.title, window.location.protocol + "//" + window.location.host + window.location.pathname + "#404");
                }
            } catch (ignored) { }
            this.navigate("404");
        });
    }

    onNavigate(cb: NavigateCallback) {
        this._callbacks.push(cb);
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
        await new Promise<void>((res) => {
            window.loader.onRemoveToken(LoaderDOMContentToken, () => {
                res();
            });
        });

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

        let el: HTMLElement;
        const existing: HTMLElement | null = document.body.querySelector(`[data-page="${id}"]`);
        if (!!existing) {
            el = existing;
            el.innerHTML = "";
        } else {
            el = document.createElement(id === "home" ? "main" : "section");
            el.classList.add("dyn-page");
            el.setAttribute("data-page", id);
            document.body.appendChild(el);
        }

        const body: HTMLBodyElement | null = element.querySelector("body");
        const moveFrom: HTMLElement = (!!body) ? body : element;
        while (moveFrom.hasChildNodes()) el.appendChild(moveFrom.firstChild!);

        return new Page(id, el, widgets);
    }

    private readonly _txControl: TransitionController = new TransitionController();
    private _transitionStart() {
        this._txControl.start();
    }

    private _transitionStop() {
        this._txControl.stop();
    }

    private readonly _swapFadeControllers: FadeController[] = [];
    private _swap(oldPage: IPage, newPage: IPage) {
        for (let controller of this._swapFadeControllers) {
            controller.end();
        }
        this._swapFadeControllers.length = 0;

        oldPage.close();
        newPage.open();
        this._activePage = newPage;
        try {
            const dest: string = window.location.protocol + "//" + window.location.host + window.location.pathname + (newPage.id === "home" ? "" : `#${newPage.id}`);
            if (dest !== window.location.toString()) window.history.pushState(undefined, document.title, dest);
        } catch (ignored) { }

        const extract: ((page: IPage) => HTMLElement | null) = (page) =>
            (page instanceof Page) ? page.root :
            document.querySelector(`body > [data-page="${page.id}"]`);
        const oldElement: HTMLElement | null = extract(oldPage);
        const newElement: HTMLElement | null = extract(newPage);

        const me = this;
        function activate(element: HTMLElement) {
            me._swapFadeControllers.push(new FadeController(element, FadeDirection.IN, 8));
            element.classList.add("active");
            element.removeAttribute("aria-hidden");
            element.focus({ preventScroll: true });
            element.parentElement?.prepend(element);
        }

        function deactivate(element: HTMLElement) {
            me._swapFadeControllers.push(new FadeController(element, FadeDirection.OUT, 8));
            element.classList.remove("active");
            element.setAttribute("aria-hidden", "true");
        }

        if (!!oldElement && !!newElement) {
            deactivate(oldElement);
            activate(newElement);
        } else {
            // contingency
            const others = document.querySelectorAll("body > [data-page]");
            if (!!newElement) activate(newElement);
            for (let i=0; i < others.length; i++) {
                const el = others.item(i);
                if (el.getAttribute("data-page") === newPage.id) continue;
                deactivate(el as HTMLElement);
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

enum FadeDirection {
    IN = 0,
    OUT = 1
}

class FadeController {

    readonly element: HTMLElement;
    readonly direction: FadeDirection;
    readonly speed: number;
    private _timer: number;
    private readonly _renderDispatch: RenderDispatch;

    constructor(element: HTMLElement, direction: FadeDirection = FadeDirection.IN, speed: number = 1) {
        this.element = element;
        this.direction = direction;
        this.speed = speed;
        this._timer = 1;
        this._renderDispatch = RenderDispatch.create();
        this.element.style.display = "";
        this.element.style.opacity = (this.direction) ? "1" : "0";

        const me = this;
        this._renderDispatch.onRender((delta) => {
            me._onRender(delta);
        });
    }

    private _onRender(delta: number) {
        this._timer -= (delta * this.speed);
        if (this._timer <= 0) {
            this.end();
            return;
        }
        if (this.direction) {
            this.element.style.opacity = this._timer.toString();
        } else {
            this.element.style.opacity = (1 - this._timer).toString();
        }
    }

    end() {
        this._renderDispatch.interrupt();
        this._onEnd();
    }

    private _ended: boolean = false;
    private _onEnd() {
        if (this._ended) return;
        this._ended = true;

        if (this.direction) {
            this.element.style.display = "none";
        }
        this.element.style.opacity = (this.direction) ? "0" : "1";
    }

}

/* Despite the name, does not control transition between 2 pages. This is done while the next page to be shown is still
    loading, to provide visual feedback to clients that have a slow connection. It also blocks the cursor from clicking
    anything, preventing a cascade of queued navigations.
 */
class TransitionController {

    private _element: HTMLElement | null = null;
    private _elementInit: boolean = false;
    private _slowTimeout: number = -1;
    private _inSlow: boolean = false;

    start() {
        if (!this._elementInit) {
            const el = document.createElement("div");
            el.classList.add("blocker");
            const img = document.createElement("img");
            img.src = ConstantData.LOADING_GRID_B64;
            el.appendChild(img);
            document.body.appendChild(el);

            this._element = el;
            this._elementInit = true;
        }
        window.clearTimeout(this._slowTimeout);
        this._element!.classList.remove("slow");
        this._inSlow = false;

        const me = this;
        this._slowTimeout = window.setTimeout(() => {
            me._slow();
        }, 100);
    }

    stop() {
        window.clearTimeout(this._slowTimeout);
        if (this._elementInit) {
            const me = this;
            const finalize = (() => {
                if (!me._elementInit) return;
                document.body.removeChild(me._element!);
                me._elementInit = false;
            });

            if (this._inSlow) {
                this._element!.classList.remove("slow");
                this._slowTimeout = window.setTimeout(finalize, 100);
            } else {
                finalize();
            }
        }
    }

    private _slow() {
        if (this._elementInit) this._element!.classList.add("slow");
    }

}
