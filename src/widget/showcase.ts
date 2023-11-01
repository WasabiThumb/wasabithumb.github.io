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
import TestShowcaseSlide from "./showcase/test";

const TRANSITION_PERIOD: number = 1;
const STAY_PERIOD: number = 5; // must be greater than transition time, time in transition counts towards the age of the next slide

export default class ShowcasePageWidget implements PageWidget {

    readonly type: PageWidgetType = "main-showcase";
    readonly renders: boolean = true;
    rt: ShowcaseSlideRenderTarget = new ShowcaseSlideBasicRenderTarget();
    transitionRt: ShowcaseSlideRenderTarget = new ShowcaseSlideOffscreenRenderTarget();
    private _state: ShowcaseSlideState = { type: "invalid" };


    init(page: Page) {
        this.transitionRt.init(this, page);
        this.rt.init(this, page);
        this._reset();
    }

    refresh(page: Page) {
        this._reset();
    }

    private _reset() {
        this._clearExisting();
        const slide = this.rt.spawn();
        this._state = { type: "simple", slide, age: 0 };
    }

    private _clearExisting() {
        switch (this._state.type) {
            case "simple":
                this._state.slide.destroy();
                break;
            case "transition":
                this._state.slide.destroy();
                this._state.to.destroy();
                break;
        }
        this._state = { type: "invalid" };
    }

    render(page: Page, delta: number) {
        if (this._state.type === "invalid") return;
        if (!this.rt.isValid()) return;

        let offset: number = 0;
        if (this._state.type === "transition") offset = this._state.offset;
        let effAge: number = this._state.age + offset;
        this.rt.render(this._state.slide, delta, effAge);

        if (this._state.type === "transition") {
            let prog: number = this._state.age / TRANSITION_PERIOD;
            let advance: boolean = false;
            if (prog > 1)  {
                prog = 1;
                advance = true;
            }
            if (this.transitionRt.isValid()) {
                this.transitionRt.render(this._state.to, delta, this._state.age);
                this.rt.blit(this.transitionRt.getOutput(), prog);
            }
            if (advance) {
                this._state = { type: "simple", slide: this._state.to, age: this._state.age };
            }
        } else if (effAge >= STAY_PERIOD) {
            this._state = { type: "transition", slide: this._state.slide, to: this.transitionRt.isValid() ? this.transitionRt.spawn() : this.rt.spawn(), age: 0, offset: effAge };
        }

        this._state.age += delta;
    }

    destroy(page: Page) {
        this._clearExisting();
        this.rt.destroy();
        this.transitionRt.destroy();
    }

}

export type ShowcaseSlideParameters = {
    page: Page,
    widget: ShowcasePageWidget,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
};

export interface ShowcaseSlide {

    init(param: ShowcaseSlideParameters): void;

    render(param: ShowcaseSlideParameters, delta: number, age: number): void;

    destroy(): void;

}

type ShowcaseSlideRegistry = { new(): ShowcaseSlide }[];


const SLIDES: ShowcaseSlideRegistry = [
    TestShowcaseSlide
];

const randomSlide: (() => ShowcaseSlide) = (() => {

    let unused: ShowcaseSlideRegistry = [];

    return (() => {
        if (unused.length < 1) {
            unused = [...SLIDES];
        }
        const con = unused.splice(Math.floor(Math.random() * unused.length), 1)[0];
        return new con();
    });

})();

type ShowcaseSlideState = ShowcaseSlideInvalidState | ShowcaseSlideSimpleState | ShowcaseSlideTransitionState;

type ShowcaseSlideInvalidState = { readonly type: "invalid" };

type ShowcaseSlideSimpleState = { readonly type: "simple", slide: ShowcaseSlide, age: number };

type ShowcaseSlideTransitionState = { readonly type: "transition", slide: ShowcaseSlide, to: ShowcaseSlide, age: number, offset: number };



interface ShowcaseSlideRenderTarget {

    init(widget: ShowcasePageWidget, page: Page): void;

    destroy(): void;

    isValid(): boolean;

    render(slide: ShowcaseSlide, delta: number, age: number): void;

    blit(image: OffscreenCanvas, opacity: number): void;

    getOutput(): OffscreenCanvas;

    spawn(): ShowcaseSlide;

}

class ShowcaseSlideBasicRenderTarget implements ShowcaseSlideRenderTarget {

    params: ShowcaseSlideParameters | null = null;
    private _abortController: AbortController | null = null;
    private _valid: boolean = false;

    init(widget: ShowcasePageWidget, page: Page): void {
        const el: HTMLCanvasElement | null = page.root.querySelector("canvas[data-role='showcase']");
        if (el !== null) {
            this.params = { page, widget, canvas: el, ctx: el.getContext("2d")! };

            try {
                this._abortController = new AbortController();
            } catch (e) {
                this._abortController = null;
            }
            const me = this;
            el.addEventListener("resize", () => {
                me._updateSize(el.getBoundingClientRect());
            }, { signal: this._abortController?.signal });
            window.addEventListener("resize", () => {
                me._updateSize(el.getBoundingClientRect());
            }, { signal: this._abortController?.signal });
            setTimeout(() => {
                me._updateSize(el.getBoundingClientRect());
            }, 10);

            this._valid = true;
        } else {
            this._valid = false;
            this._abortController = null;
        }
    }

    destroy(): void {
        if (this._valid) {
            if (this._abortController !== null) {
                this._abortController.abort();
            }
            this._abortController = null;
        }
        this._valid = false;
    }

    private _updateSize(rect: DOMRect): void {
        if (!this._valid) return;
        this.params!.canvas.width = rect.width;
        this.params!.canvas.height = rect.height;
        const transition = this.params!.widget.transitionRt;
        if (transition.isValid()) {
            if (transition instanceof ShowcaseSlideOffscreenRenderTarget) {
                transition.params!.canvas.width = rect.width;
                transition.params!.canvas.height = rect.height;
            }
        }
    }

    isValid(): boolean {
        return this._valid;
    }

    render(slide: ShowcaseSlide, delta: number, age: number): void {
        slide.render(this.params!, delta, age);
    }

    blit(image: OffscreenCanvas, opacity: number) {
        const ctx = this.params!.ctx;
        const alpha = ctx.globalAlpha;
        ctx.globalAlpha = opacity;
        ctx.drawImage(image, 0, 0);
        ctx.globalAlpha = alpha;
    }

    getOutput(): OffscreenCanvas {
        throw new Error("Basic render target has no output");
    }

    spawn(): ShowcaseSlide {
        const ret = randomSlide();
        ret.init(this.params!);
        return ret;
    }

}


class ShowcaseSlideOffscreenRenderTarget implements ShowcaseSlideRenderTarget {

    params: ShowcaseSlideParameters | null = null;
    private _valid: boolean = false;

    init(widget: ShowcasePageWidget, page: Page): void {
        try {
            const off = new OffscreenCanvas(800, 600);
            const ctx = off.getContext("2d")!;
            this.params = { widget, page, canvas: off, ctx };
            this._valid = true;
        } catch (e) {
            console.warn(e);
            this._valid = false;
        }
    }

    destroy(): void {
        this._valid = false;
    }

    isValid(): boolean {
        return this._valid;
    }

    render(slide: ShowcaseSlide, delta: number, age: number): void {
        slide.render(this.params!, delta, age);
    }

    blit(image: OffscreenCanvas, opacity: number) { }

    getOutput(): OffscreenCanvas {
        return this.params!.canvas as OffscreenCanvas;
    }

    spawn(): ShowcaseSlide {
        const ret = randomSlide();
        ret.init(this.params!);
        return ret;
    }

}
