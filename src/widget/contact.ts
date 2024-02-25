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

import {PageWidget, PageWidgetType} from "../struct/widget";
import {Page} from "../struct/page";
import customProtocolCheck from "custom-protocol-check";
import {SwipedEvent} from "../struct/extypes";

export default class ContactPageWidget implements PageWidget {

    readonly renders: boolean = true
    readonly type: PageWidgetType = "contact";
    private _stage: AnimationStage | null = null;
    private _elements: Elements | null = null;
    private _dummyElements: Partial<Elements> = {};
    private _activeElementIndex: number = 1;
    private _abort: AbortController | null = null;

    init(page: Page): void {
        let elements: Partial<Elements> = {};

        const container: HTMLElement = page.root.querySelector('[data-role="contact-items"]')! as HTMLElement;
        container.innerHTML = "";
        const abort = new AbortController();
        for (let i=0; i < SOCIALS.length; i++) {
            let social: Social = SOCIALS[i];
            const el: HTMLImageElement = document.createElement("img");
            el.src = `assets/images/socials/${social.id}.svg`;
            el.alt = social.name;
            el.setAttribute("data-social-index", `${i}`);
            container.appendChild(el);
            elements[i] = el;

            const finalI: number = i;
            const me = this;
            el.addEventListener("click", () => {
                me._onClick(finalI);
            }, { signal: abort.signal });
        }
        elements.activeImage = page.root.querySelector('[data-role="contact-active-img"]')! as HTMLElement;
        elements.activeText = page.root.querySelector('[data-role="contact-active-text"]')! as HTMLElement;
        this._elements = elements as Elements;
        this._abort = abort;

        let mid: number = Math.floor((SOCIALS.length - 1) / 2);
        this._stage = new DeployAnimationStage(mid);
        this._activeElementIndex = mid;

        (page.root.querySelector('[data-role="contact-bg"]') as HTMLElement).style.background = SwapAnimationStage.stringifyColor(SwapAnimationStage.getColor(SOCIALS[mid].id));
        elements.activeText!.addEventListener("click", (e) => {
            e.stopPropagation();
        }, { signal: abort.signal });

        const me = this;
        const area = page.root.querySelector('[data-role="contact-nav-area"]') as HTMLElement;
        area.addEventListener("click", (e) => {
            me._onNavigate().catch(console.error);
        }, { signal: abort.signal });
        document.body.addEventListener("swiped", (e) => {
            let target: number = me._activeElementIndex;
            switch ((e as SwipedEvent).detail.dir) {
                case "left":
                    target++;
                    break;
                case "right":
                    target--;
                    break;
                default:
                    return;
            }
            if (target < 0) {
                target = SOCIALS.length - 1;
            } else if (target >= SOCIALS.length) {
                target = 0;
            }
            me._onClick(target);
        });
    }

    refresh(page: Page): void {
    }

    render(page: Page, delta: number): void {
        if (this._stage != null) {
            if (!(0 in this._dummyElements)) updateDummies(this._elements!, this._dummyElements);
            if (!this._stage!.render(delta, this._elements!, this._dummyElements as Elements)) {
                this._stage = null;
            }
        }
        if ((0 in this._dummyElements) && this._stage == null) {
            clearDummies(this._dummyElements);
        }
    }

    destroy(page: Page): void {
        if (0 in this._dummyElements) clearDummies(this._dummyElements);
        this._abort!.abort();
    }

    private _onClick(index: number) {
        if (!!this._stage) return;

        let indexStr: string = `${index}`;
        let i = 0;
        while (i in this._elements!) {
            if (indexStr === this._elements![i].getAttribute("data-social-index")) {
                index = i;
                break;
            }
            i++;
        }
        if (index == this._activeElementIndex) return;

        this._stage = (new UndeployAnimationStage(this._activeElementIndex))
            .then(new SwapAnimationStage(this._activeElementIndex, index))
            .then(new DeployAnimationStage(index));
        this._activeElementIndex = index;
    }

    private async _onNavigate() {
        if (!!this._stage) return;
        const idx = parseInt(this._elements![this._activeElementIndex].getAttribute("data-social-index")!);
        const social: Social = SOCIALS[idx];
        const { appUrl } = social;

        if (typeof appUrl === "string") {
            const p: boolean = await new Promise((res) => {
                customProtocolCheck(appUrl, () => {
                    console.warn("Protocol not supported: " + appUrl);
                    res(false);
                }, () => {
                    res(true)
                }, 200);
            });
            if (p) return;
        }
        window.open(social.url, "_blank");
    }

}

type Social = {
    id: string,
    name: string,
    text: string,
    url: string,
    appUrl?: string
};
const SOCIALS: Social[] = [
    { id: "twitter", name: "Twitter", text: "@CylinderLife", url: "https://twitter.com/CylinderLife", appUrl: "twitter:profile?username=@CylinderLife" },
    { id: "github", name: "GitHub", text: "@WasabiThumb", url: "https://github.com/WasabiThumb" },
    { id: "discord", name: "Discord", text: "@wasabithumbs", url: "https://discord.com/users/292053354564157441", appUrl: "discord://-/users/292053354564157441" },
    { id: "gmail", name: "GMail", text: "wasabithumbs@gmail.com", url: "https://mail.google.com/mail/?view=cm&fs=1&to=wasabithumbs@gmail.com", appUrl: "mailto:wasabithumbs@gmail.com" },
    { id: "linkedin", name: "LinkedIn", text: "WIP", url: "data:text/plain;charset=utf-8;base64,UGxlYXNlIGNvbWUgYmFjayBsYXRlciB0byBzZWUgbXkgTGlua2VkSW4hIFRoZSBwbGFuIGlzIHRvIGhhdmUgdGhpcyBvYmZ1c2NhdGVkIGluIHRoZSBzYW1lIHdheSB0aGUgQWJvdXQgcGFnZSBpcy4=" },
];

type Elements = {
    [index: number]: HTMLElement,
    activeImage: HTMLElement,
    activeText: HTMLElement
}
const SPECIAL_ELEMENT_KEYS: (keyof Elements)[] = ["activeImage", "activeText"];
const CARRIED_ATTRS: string[] = ["src", "alt"];
const CARRIED_STYLES: ("font" | "color" | "opacity" | "textAlign" | "padding" | "objectFit" | "objectPosition")[] = ["font", "color", "opacity", "textAlign", "padding", "objectFit", "objectPosition"];

const clearDummies = ((dest: Partial<Elements>) => {
    let i: number;

    i = 0;
    while (i in dest) {
        document.body.removeChild(dest[i]!);
        delete dest[i];
        i++;
    }
    for (let k of SPECIAL_ELEMENT_KEYS) {
        if (k in dest) {
            document.body.removeChild(dest[k]!);
        }
        delete dest[k];
    }
});

const updateDummies = ((ref: Elements, dest: Partial<Elements>) => {
    clearDummies(dest);

    const copyElement = ((k: keyof Elements) => {
        const src: HTMLElement = ref[k];
        const cpy: HTMLElement = document.createElement(src.tagName) as HTMLElement;

        for (let attr of CARRIED_ATTRS) {
            if (src.hasAttribute(attr)) cpy.setAttribute(attr, src.getAttribute(attr)!);
        }
        if (cpy instanceof HTMLParagraphElement || cpy instanceof HTMLSpanElement || cpy instanceof HTMLHeadingElement) {
            cpy.innerText = src.innerText;
        }

        const rect: DOMRect = src.getBoundingClientRect();
        const computed: CSSStyleDeclaration = window.getComputedStyle(src);
        cpy.style.position = "absolute";
        cpy.style.left = `${rect.left}px`;
        cpy.style.top = `${rect.top}px`;
        cpy.style.width = `${rect.width}px`;
        cpy.style.height = `${rect.height}px`;
        cpy.style.pointerEvents = "none";
        cpy.style.zIndex = "800";
        cpy.style.display = "none";
        for (let style of CARRIED_STYLES) cpy.style[style] = computed[style];
        document.body.appendChild(cpy);
        dest[k] = cpy;
    });

    let i: number = 0;
    while (i in ref) {
        copyElement(i);
        i++;
    }
    for (let k of SPECIAL_ELEMENT_KEYS) copyElement(k);
});

abstract class AnimationStage {

    private _then: AnimationStage | null = null;
    private _age: number = 0;
    abstract readonly duration: number;

    render(delta: number, elements: Elements, dummyElements: Elements): boolean {
        if (this._age >= this.duration) {
            if (!!this._then) return this._then.render(delta, elements, dummyElements);
            return false;
        }
        if (this._age === 0) this.onStart(elements, dummyElements);
        this._age += delta;
        if (this._age >= this.duration) {
            this.onRender(1, elements, dummyElements);
            this.onEnd(elements, dummyElements);
            updateDummies(elements, dummyElements);
        } else {
            this.onRender(this._age / this.duration, elements, dummyElements);
        }
        return true;
    }

    then(stage: AnimationStage): this {
        if (!!this._then) {
            let head: AnimationStage = this._then!;
            let child: AnimationStage | null = head._then;
            while (child != null) {
                head = child!;
                child = head._then;
            }
            head._then = stage;
        } else {
            this._then = stage;
        }
        return this;
    }

    abstract onStart(elements: Elements, dummyElements: Elements): void;

    abstract onRender(progress: number, elements: Elements, dummyElements: Elements): void;

    abstract onEnd(elements: Elements, dummyElements: Elements): void;

    protected interpolateABD(a: HTMLElement, b: HTMLElement, dummy: HTMLElement, progress: number, opacityMode: boolean | null = null): void {
        let yp: number = 3 * Math.pow(progress, 2) - 2 * Math.pow(progress, 3);
        let iyp: number = 1 - yp;
        let xp: number = 4 * Math.pow(progress, 5) - 10 * Math.pow(progress, 4) + 6 * Math.pow(progress, 3) + Math.pow(progress, 2);
        let ixp: number = 1 - xp;

        const aRect: DOMRect = a.getBoundingClientRect();
        const bRect: DOMRect = b.getBoundingClientRect();

        dummy.style.left = `${ixp * aRect.left + xp * bRect.left}px`;
        dummy.style.top = `${iyp * aRect.top + yp * bRect.top}px`;
        dummy.style.width = `${ixp * aRect.width + xp * bRect.width}px`;
        dummy.style.height = `${iyp * aRect.height + yp * bRect.height}px`;
        if (typeof opacityMode === "boolean") {
            if (opacityMode) {
                dummy.style.opacity = `${(6 + 4 * iyp) / 10}`;
            } else {
                dummy.style.opacity = `${(4 * yp + 6) / 10}`;
            }
        }
    }

}

class DeployAnimationStage extends AnimationStage {

    readonly duration: number = 0.4;
    private readonly _index: number;
    constructor(index: number) {
        super();
        this._index = index;
    }

    onStart(elements: Elements, dummyElements: Elements): void {
        elements.activeImage.classList.add("dummy-mode");
        elements.activeText.style.opacity = "0";
        elements[this._index].classList.add("dummy-mode");
        dummyElements[this._index].style.display = "block";

        let num: string | number = elements[this._index].getAttribute("data-social-index")!;
        num = parseInt(num);
        if (!isNaN(num)) {
            const social: Social = SOCIALS[num];
            (elements.activeImage as HTMLImageElement).src = `assets/images/socials/${social.id}.svg`;
            (elements.activeImage as HTMLImageElement).alt = social.name;
            elements.activeText.innerText = `${social.name}\n${social.text}`;
        }
    }

    onRender(progress: number, elements: Elements, dummyElements: Elements): void {
        const a: HTMLElement = elements[this._index];
        const b: HTMLElement = elements.activeImage;
        const dummy: HTMLElement = dummyElements[this._index];
        this.interpolateABD(a, b, dummy, progress, false);
        if (progress > 0.6) {
            elements.activeText.style.opacity = `${(progress - 0.6) * 2.5}`;
        }
    }

    onEnd(elements: Elements, dummyElements: Elements): void {
        elements.activeImage.classList.remove("dummy-mode");
        elements.activeText.style.opacity = "1";
        dummyElements[this._index].style.display = "none";
    }

}

class UndeployAnimationStage extends AnimationStage {

    readonly duration: number = 0.3;
    private readonly _index: number;
    constructor(index: number) {
        super();
        this._index = index;
    }

    onStart(elements: Elements, dummyElements: Elements): void {
        dummyElements[this._index].style.display = "block";
        elements.activeImage.classList.add("dummy-mode");
        elements[this._index].classList.add("dummy-mode");
    }

    onRender(progress: number, elements: Elements, dummyElements: Elements): void {
        const a: HTMLElement = elements.activeImage;
        const b: HTMLElement = elements[this._index];
        const dummy: HTMLElement = dummyElements[this._index];
        this.interpolateABD(a, b, dummy, progress, true);
        if (progress > 0.6) {
            elements.activeText.style.opacity = `${1 - ((progress - 0.6) * 2.5)}`;
        }
    }

    onEnd(elements: Elements, dummyElements: Elements): void {
        elements[this._index].classList.remove("dummy-mode");
        dummyElements[this._index].style.display = "none";
    }

}

type BackgroundCSS = BackgroundCSSSolid | BackgroundCSSRadialGradient;
type BackgroundCSSSolid = { red: number, green: number, blue: number, type: "solid" };
const BackgroundCSSSolidRegExp: RegExp = /rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i;
type BackgroundCSSRadialGradient = { start: BackgroundCSSSolid, end: BackgroundCSSSolid, type: "gradient" };
const BackgroundCSSRadialGradientRegExp: RegExp = /rgb\((\d+),\s*(\d+),\s*(\d+)\)\s+0(?:px|%)?,\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)\s+100(?:px|%)?\)$/i;
const BackgroundCSSBlack: BackgroundCSSSolid = { red: 0, green: 0, blue: 0, type: "solid" };

class SwapAnimationStage extends AnimationStage {

    readonly duration: number = 0.15;
    private readonly _from: number;
    private readonly _to: number;
    private readonly _bg: HTMLElement;
    constructor(from: number, to: number) {
        super();
        this._from = from;
        this._to = to;
        this._bg = document.querySelector('[data-role="contact-bg"]')! as HTMLElement;
    }

    private _fromColor: BackgroundCSS = BackgroundCSSBlack;
    private _toColor: BackgroundCSS = BackgroundCSSBlack;
    onStart(elements: Elements, dummyElements: Elements): void {
        const fromIndex: number = parseInt(elements[this._from].getAttribute("data-social-index")!);
        const toIndex: number = parseInt(elements[this._to].getAttribute("data-social-index")!);
        const fromType = SOCIALS[fromIndex].id;
        const toType = SOCIALS[toIndex].id;
        this._fromColor = SwapAnimationStage.getColor(fromType);
        this._toColor = SwapAnimationStage.getColor(toType);

        for (let i=0; i < SOCIALS.length; i++) {
            if (toIndex === i) {
                this._bg.classList.add(SOCIALS[i].id);
            } else {
                this._bg.classList.remove(SOCIALS[i].id);
            }
        }
    }

    onRender(progress: number, elements: Elements, dummyElements: Elements): void {
        this._bg.style.background = SwapAnimationStage.stringifyColor(SwapAnimationStage.lerpColor(this._fromColor, this._toColor, progress));
    }

    onEnd(elements: Elements, dummyElements: Elements): void {
    }

    static stringifyColor(color: BackgroundCSS): string {
        switch (color.type) {
            case "solid":
                return `rgb(${color.red}, ${color.green}, ${color.blue})`;
            case "gradient":
                return `radial-gradient(circle, ${SwapAnimationStage.stringifyColor(color.start)} 0%, ${SwapAnimationStage.stringifyColor(color.end)} 100%)`;
        }
    }

    static lerpColor(a: BackgroundCSS, b: BackgroundCSS, d: number): BackgroundCSS {
        if (a.type === b.type) {
            switch (a.type) {
                case "solid":
                    return this.lerpColorSolid(a, b as BackgroundCSSSolid, d);
                case "gradient":
                    return this.lerpColorGradient(a, b as BackgroundCSSRadialGradient, d);
            }
        }
        switch (a.type) {
            case "solid":
                return this.lerpColorGradient({ start: a, end: a, type: "gradient" }, b as BackgroundCSSRadialGradient, d);
            case "gradient":
                const solid = b as BackgroundCSSSolid;
                return this.lerpColorGradient(a, { start: solid, end: solid, type: "gradient" }, d);
        }
    }

    static lerpColorGradient(a: BackgroundCSSRadialGradient, b: BackgroundCSSRadialGradient, d: number): BackgroundCSSRadialGradient {
        return {
            start: SwapAnimationStage.lerpColorSolid(a.start, b.start, d),
            end: SwapAnimationStage.lerpColorSolid(a.end, b.end, d),
            type: "gradient"
        };
    }

    static lerpColorSolid(a: BackgroundCSSSolid, b: BackgroundCSSSolid, d: number): BackgroundCSSSolid {
        const v: number = 1 - d;
        const component = ((k: Exclude<keyof BackgroundCSSSolid, "type">) => {
            return (a[k] * v) + (b[k] * d);
        });
        return { red: component("red"), green: component("green"), blue: component("blue"), type: a.type };
    }

    static getColor(type: string): BackgroundCSS {
        const el = document.createElement("div");
        el.classList.add("contact-bg", type);
        el.style.display = "none";

        document.body.appendChild(el);
        const bg = window.getComputedStyle(el).background;
        document.body.removeChild(el);

        const gradient: boolean = bg.charAt(1).toLowerCase() === "a";
        const regex: RegExp = gradient ? BackgroundCSSRadialGradientRegExp : BackgroundCSSSolidRegExp;
        const match = regex.exec(bg);
        if (!match) return BackgroundCSSBlack;

        let a: BackgroundCSSSolid = {
            red: parseInt(match[1]),
            green: parseInt(match[2]),
            blue: parseInt(match[3]),
            type: "solid"
        };
        if (gradient) {
            let b: BackgroundCSSSolid = {
                red: parseInt(match[4]),
                green: parseInt(match[5]),
                blue: parseInt(match[6]),
                type: "solid"
            };
            return { start: a, end: b, type: "gradient" };
        }
        return a;
    }

}
