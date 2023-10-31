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

const ts: (() => number) = (() => {
    if (typeof performance === "object" && !!performance["now"]) return (() => performance.now());
    return (() => Date.now());
})();

export default abstract class RenderDispatch {

    public static create(): RenderDispatch {
        if (!!window["requestAnimationFrame"]) {
            return new AnimationFrameRenderDispatch();
        } else {
            return new FixedIntervalRenderDispatch();
        }
    }

    public static null(): RenderDispatch {
        return new NullRenderDispatch();
    }

    abstract onRender(cb: (delta: number) => void): void;

    abstract interrupt(): void;

}

export class NullRenderDispatch extends RenderDispatch {
    onRender(cb: (delta: number) => void) { }
    interrupt() { }
}

export class AnimationFrameRenderDispatch extends RenderDispatch {

    private _running: boolean = true;
    private _lastTick: number;
    private readonly _callbacks: ((delta: number) => void)[] = [];
    constructor() {
        super();
        this._lastTick = ts();
        this._checkpoint();
    }

    private _checkpoint() {
        if (!this._running) return;
        const me = this;
        window.requestAnimationFrame((now) => {
            const delta: number = (now - me._lastTick) / 1000;
            for (let cb of me._callbacks) {
                if (!me._running) break;
                try {
                    cb(delta);
                } catch (e) {
                    console.error(e);
                }
            }
            me._lastTick = now;
            me._checkpoint();
        });
    }

    interrupt(): void {
        this._running = false;
    }

    onRender(cb: (delta: number) => void): void {
        this._callbacks.push(cb);
    }

}

export class FixedIntervalRenderDispatch extends RenderDispatch {

    private readonly _interval: any;
    private readonly _callbacks: ((delta: number) => void)[] = [];
    constructor(delay: number = 10) {
        super();
        const me = this;

        let last: number = ts();
        this._interval = setInterval(() => {
            let now: number = ts();
            let delta: number = (now - last) / 1000;
            for (let cb of me._callbacks) cb(delta);
            last = now;
        }, delay);
    }

    interrupt(): void {
        clearInterval(this._interval as unknown as number);
    }

    onRender(cb: (delta: number) => void): void {
        this._callbacks.push(cb);
    }

}
