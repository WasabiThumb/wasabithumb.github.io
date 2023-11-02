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
import {LIB_VERSION} from "../util/version";
import PerformanceShowcaseSlide from "./showcase/performance";
import PlanetsShowcaseSlide from "./showcase/planets";
import MazeShowcaseSlide from "./showcase/maze";

const TRANSITION_PERIOD: number = 1;
const STAY_PERIOD: number = 8; // must be greater than transition time, time in transition counts towards the age of the next slide

export default class ShowcasePageWidget implements PageWidget {

    readonly type: PageWidgetType = "main-showcase";
    readonly renders: boolean = true;
    rt: ShowcaseSlideRenderTarget = new ShowcaseSlideBasicRenderTarget();
    offscreenRt: ShowcaseSlideRenderTarget = new ShowcaseSlideOffscreenRenderTarget();
    private _state: ShowcaseSlideState = { type: "invalid" };
    private _debugState: ShowcaseDebugState = { active: false, fontSize: 0, head: 0, fpsLog: [] };


    init(page: Page) {
        this.offscreenRt.init(this, page);
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
        const offValid: boolean = this.offscreenRt.isValid();

        let offset: number = 0;
        if (this._state.type === "transition") offset = this._state.offset;
        let effAge: number = this._state.age + offset;
        if (offValid) this.offscreenRt.params!.ctx.save();
        this.rt.render(this._state.slide, delta, effAge);
        if (offValid) this.offscreenRt.params!.ctx.restore();

        if (this._state.type === "transition") {
            let prog: number = this._state.age / TRANSITION_PERIOD;
            let advance: boolean = false;
            if (prog > 1)  {
                prog = 1;
                advance = true;
            }
            if (offValid) {
                this.offscreenRt.render(this._state.to, delta, this._state.age);
                this.rt.blit(this.offscreenRt.getOutput(), prog);
            }
            if (advance) {
                this._state.slide.destroy();
                this._state = { type: "simple", slide: this._state.to, age: this._state.age };
            }
        } else if (effAge >= STAY_PERIOD) {
            this._state = { type: "transition", slide: this._state.slide, to: this.offscreenRt.isValid() ? this.offscreenRt.spawn() : this.rt.spawn(), age: 0, offset: effAge };
        }

        if (LIB_VERSION.indexOf("git") < 0) {
            this._state.age += delta;
            return;
        }
        this._debug(delta, this._state.type === "transition" ? `${effAge.toFixed(2)} (${this._state.age.toFixed(2)})` : effAge.toFixed(2));
        this._state.age += delta;
    }

    destroy(page: Page) {
        this._clearExisting();
        this.rt.destroy();
        this.offscreenRt.destroy();
    }

    private _debug(delta: number, age: string) {
        const fps = (1 / delta);
        this._debugState.fpsLog.push(fps);
        let len: number = this._debugState.fpsLog.length;
        while (len > 1000) {
            this._debugState.fpsLog.splice(0, 1);
            len--;
        }
        let sum: number = 0;
        for (let i=0; i < len; i++) sum += this._debugState.fpsLog[i];
        sum /= len;

        let capabilities: string[] | string = [];
        if (this.rt.isValid()) capabilities.push("Canvas");
        if (this.offscreenRt.isValid()) capabilities.push("OffscreenCanvas");
        capabilities = capabilities.join(", ");

        this._debugStart();
        this._debugLine("DEBUG");
        this._debugState.head += 0.25;
        this._debugLine("Slide Age (s): " + age);
        this._debugLine("Slide Mode: " + this._state.type);
        this._debugLine("Slide Class: " + ((this._state.type === "invalid") ? "INVALID" : (this._state as ShowcaseSlideSimpleState).slide.constructor.name));
        this._debugLine("FPS: " + fps.toFixed(2) + " (" + sum.toFixed(2) + " avg)");
        this._debugLine(`Size: ${this.rt.params!.canvas.width} x ${this.rt.params!.canvas.height}`);
        this._debugLine(`Capabilities: ${capabilities}`);
        this._debugOffscreen();
        this._debugEnd();
    }

    private _debugStart() {
        if (this._debugState.active) return;
        const size = Math.min(window.innerWidth, window.innerHeight) * 0.025;
        this._debugState = { ...this._debugState, active: true, fontSize: size, head: 0 };

        const setupCtx = ((ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
            ctx.textBaseline = "top";
            ctx.font = `${size}px Ubuntu Mono`;
            ctx.fillStyle = "white";
            ctx.shadowColor = "black";
            ctx.shadowBlur = (size / 4);
        });

        if (this.rt.isValid()) setupCtx(this.rt.params!.ctx);
        if (this.offscreenRt.isValid()) setupCtx(this.offscreenRt.params!.ctx);
    }

    private _debugLine(text: string) {
        if (!this._debugState.active) return;
        const { fontSize } = this._debugState;
        let x: number = fontSize * 0.5;
        let y: number = fontSize * (0.5 + (this._debugState.head++));

        if (this.rt.isValid()) this.rt.params!.ctx.fillText(text, x, y);
        if (this.offscreenRt.isValid()) this.offscreenRt.params!.ctx.fillText(text, x, y);
    }

    private _debugOffscreen() {
        if (!this._debugState.active) return;
        if (!this.offscreenRt.isValid()) return;
        this._debugLine("Offscreen:");

        const { canvas } = this.offscreenRt.params!;
        const { fontSize } = this._debugState;
        let x: number = fontSize * 0.5;
        let y: number = fontSize * (0.5 + this._debugState.head + 0.5);
        this._debugState.head += 6;
        let height: number = fontSize * 5;
        let width: number = (canvas.width / canvas.height) * height;

        const { ctx } = this.rt.params!;
        const osb = ctx.shadowBlur;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, width, height);
        ctx.drawImage(canvas, x + 1, y + 1, width - 2, height - 2);
        ctx.shadowBlur = osb;
    }

    private _debugEnd() {
        if (!this._debugState.active) return;
        this._debugState.active = false;

        if (this.rt.isValid()) this.rt.params!.ctx.shadowBlur = 0;
        if (this.offscreenRt.isValid()) this.offscreenRt.params!.ctx.shadowBlur = 0;
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
    PlanetsShowcaseSlide,
    MazeShowcaseSlide,
];

const randomSlide: (() => ShowcaseSlide) = (() => {

    let unused: ShowcaseSlideRegistry = [];
    let lastUsed: { new(): ShowcaseSlide } | null = null;

    const splice: (() => { new(): ShowcaseSlide }) = (() => {
        return unused.splice(Math.floor(Math.random() * unused.length), 1)[0];
    });

    return (() => {
        if (unused.length < 1) {
            unused = [...SLIDES];
        }
        let ret: { new(): ShowcaseSlide } = splice();
        if (ret === lastUsed) {
            let retry = splice();
            unused.push(ret);
            ret = retry;
        }
        lastUsed = ret;
        return new ret();
    });

})();

type ShowcaseSlideState = ShowcaseSlideInvalidState | ShowcaseSlideSimpleState | ShowcaseSlideTransitionState;

type ShowcaseSlideInvalidState = { readonly type: "invalid" };

type ShowcaseSlideSimpleState = { readonly type: "simple", slide: ShowcaseSlide, age: number };

type ShowcaseSlideTransitionState = { readonly type: "transition", slide: ShowcaseSlide, to: ShowcaseSlide, age: number, offset: number };

type ShowcaseDebugState = { active: boolean, fontSize: number, head: number, fpsLog: number[] };



interface ShowcaseSlideRenderTarget {

    params: ShowcaseSlideParameters | null;

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
        const transition = this.params!.widget.offscreenRt;
        if (transition.isValid()) {
            transition.params!.canvas.width = rect.width;
            transition.params!.canvas.height = rect.height;
        }
    }

    isValid(): boolean {
        return this._valid;
    }

    render(slide: ShowcaseSlide, delta: number, age: number): void {
        this.params!.ctx.save();
        slide.render(this.params!, delta, age);
        this.params!.ctx.restore();
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
        this.params!.ctx.save();
        slide.render(this.params!, delta, age);
        this.params!.ctx.restore();
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
