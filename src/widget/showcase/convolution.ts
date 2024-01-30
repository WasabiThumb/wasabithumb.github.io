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

import {ShowcaseSlide, ShowcaseSlideParameters} from "../showcase";
import {
    ConvolutionSolver,
    createSolver
} from "./convolution/solver";
import {LazyImage} from "../../struct/asset";
import {ConvolutionKernel} from "./convolution/types";
import {ConvolutionKernels} from "./convolution/kernels";
import {RGB} from "../../util/color";
import {CursorTracker} from "../../util/input";


const KERNELS: ConvolutionKernel[] = [
    ConvolutionKernels.SHARPEN,
    ConvolutionKernels.GAUSSIAN_APPROX,
    ConvolutionKernels.EDGE_DETECT,
    ConvolutionKernels.EMBOSS
];
const IMAGES = [ "4.2.01.png", "4.2.07.png", "house.png", "4.1.05.png" ];
type AnimState = { type: "idling", remaining: number }
    | { type: "transitioning", a: ConvolutionKernel, b: ConvolutionKernel, start: number, duration: number };

export default class ConvolutionShowcaseSlide implements ShowcaseSlide {

    private _image: LazyImage = new LazyImage("data:image/png;");
    private _kernel: ConvolutionKernel = [...ConvolutionKernels.IDENTITY];
    private _animState: AnimState = { type: "idling", remaining: 0 };
    private _animStack: ConvolutionKernel[] = [];
    private _cursor: CursorTracker | null = null;
    init(param: ShowcaseSlideParameters): void {
        const src = "assets/images/usc-sipi/" + IMAGES[Math.floor(Math.random() * IMAGES.length)];
        this._image = new LazyImage(src);
        this._image.startLoading();
        this._kernel = [...ConvolutionKernels.IDENTITY];
        this._animState = { type: "idling", remaining: 0.25 };
        this._animStack = [...KERNELS];
        this._cursor = new CursorTracker();
    }

    private _solver: ConvolutionSolver | null = null;
    private _solverInit: boolean = false;
    render(param: ShowcaseSlideParameters, delta: number, age: number): void {
        const { ctx, canvas } = param;
        const { width, height } = canvas;

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        if (!this._image.isAvailable()) {
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            const em = Math.min(width, height) / 12;
            ctx.font = `${em}px 'Ubuntu Mono', monospace`;
            ctx.fillStyle = "white";
            ctx.fillText("Loading...", width / 2, height / 2);
            return;
        }

        ctx.globalCompositeOperation = "luminosity";
        ctx.globalAlpha = 0.4;
        const bg = this._image.get();
        const bgSize = Math.max(width, height);
        ctx.drawImage(bg, (width - bgSize) / 2, (height - bgSize) / 2, bgSize, bgSize);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        let solver: ConvolutionSolver;
        if (!this._solverInit) {
            let firefox: boolean = false;
            try {
                firefox = /firefox/i.test(window.navigator.userAgent);
            } catch (e) { }
            solver = createSolver(firefox ? 256 : 128);
            solver.init(this._image.get());
            this._solver = solver;
            this._solverInit = true;
        } else {
            solver = this._solver!;
        }

        this._handleAnimation(delta, age);
        solver.update(this._kernel);

        let offscreen: OffscreenCanvasRenderingContext2D | undefined = undefined;
        if (param.widget.offscreenRt.isValid()) {
            offscreen = param.widget.offscreenRt.params!.ctx as OffscreenCanvasRenderingContext2D;
        }

        let wide: boolean = width >= height;
        let containerW: number;
        let containerH: number;
        if (wide) {
            containerW = width * 0.9;
            containerH = containerW * (1 / 3);
            if (containerH >= (height * 0.9)) {
                containerH = height * 0.9;
                containerW = containerH * 3;
            }
        } else {
            containerH = height * 0.9;
            containerW = containerH * (1 / 3);
            if (containerW >= (width * 0.9)) {
                containerW = width * 0.9;
                containerH = containerW * 3;
            }
        }
        let containerX: number = (width - containerW) / 2;
        let containerY: number = (height - containerH) / 2;
        let boxDimension: number = Math.min(containerW, containerH);

        this._renderImageBox(ctx, containerX, containerY, boxDimension, false, offscreen);
        if (wide) { containerX += boxDimension; } else { containerY += boxDimension; }
        this._renderArrowBox(ctx, containerX, containerY, boxDimension, wide, offscreen);
        if (wide) { containerX += boxDimension; } else { containerY += boxDimension; }
        this._renderImageBox(ctx, containerX, containerY, boxDimension, true, offscreen);
    }

    private _renderImageBox(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, size: number, output: boolean, offscreen: OffscreenCanvasRenderingContext2D | undefined) {
        if (output) {
            if (this._solver!.readyToDraw()) {
                this._solver!.draw(ctx as CanvasRenderingContext2D, x, y, size, size, offscreen);
            } else {
                ctx.fillStyle = "black";
                ctx.fillRect(x, y, size, size);
            }
        } else {
            ctx.drawImage(this._image!.get(), x, y, size, size);
        }
    }

    private _renderArrowBox(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, size: number, horizontal: boolean, offscreen: OffscreenCanvasRenderingContext2D | undefined) {
        const tx = ctx.getTransform();
        if (horizontal) {
            ctx.setTransform(1, 0, 0, 1, x, y);
        } else {
            ctx.setTransform(0, 1, -1, 0, x + size, y);
        }

        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        let a: number = 0.1;
        let b: number = 0.5;
        let c: number = 0.9;
        let lineWeight: number = 0.175;
        let baseWeight: number = 0.4;

        ctx.beginPath();
        ctx.moveTo(a * size, (0.5 - lineWeight) * size);
        ctx.lineTo(b * size, (0.5 - lineWeight) * size);
        ctx.lineTo(b * size, (0.5 - baseWeight) * size);
        ctx.lineTo(c * size, 0.5 * size);
        ctx.lineTo(b * size, (0.5 + baseWeight) * size);
        ctx.lineTo(b * size, (0.5 + lineWeight) * size);
        ctx.lineTo(a * size, (0.5 + lineWeight) * size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.setTransform(tx);

        let mbs: number = (lineWeight * 2 * size) * 0.88;
        let mbp: number = (size - mbs) / 2;
        this._drawKernel(ctx, x + mbp, y + mbp, mbs);
    }

    private _drawKernel(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, size: number) {
        const tx = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, x, y);

        const cellSize: number = size / 3;
        const pad: number = size * 0.0125;
        const innerCellSize: number = cellSize - (pad * 2);
        const cellColor: ((weight: number) => string) = ((weight) => {
            let v: number = (weight + 9) / 19;
            v = Math.min(Math.max(v, 0), 1);
            if (v <= 0.5) {
                v = 4 * (v * v * v);
            } else {
                v = 4 * Math.pow(v - 1, 3) + 1;
            }
            const n: number = Math.round(v * 255);
            return RGB.toCSS([ n, n, n ]);
        });

        ctx.font = `${(innerCellSize / 4)}px 'Ubuntu Mono', monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        let kernelIndex: number = 0;
        for (let ky=0; ky < 3; ky++) {
            const top: number = ky * cellSize + pad;
            for (let kx=0; kx < 3; kx++) {
                const left: number = kx * cellSize + pad;

                const weight: number = this._kernel[kernelIndex++];
                ctx.fillStyle = cellColor(weight);
                ctx.fillRect(left, top, innerCellSize, innerCellSize);

                ctx.fillStyle = weight < 0 ? "white" : "black";
                ctx.fillText(weight.toFixed(2), left + (innerCellSize / 2), top + (innerCellSize / 2));
            }
        }

        ctx.setTransform(tx);
    }

    private _handleAnimation(delta: number, age: number) {
        const cursor = this._cursor!;

        if (cursor.lastEventAgeMillis() <= 500) {
            const cx: number = window.innerWidth / 2;
            const cy: number = window.innerHeight / 2;
            let ang: number = Math.atan2(cy - cursor.getY(), cursor.getX() - cx);
            if (ang <= 0) ang += Math.PI * 2;
            ang *= 180 / Math.PI;

            let a: ConvolutionKernel;
            let b: ConvolutionKernel;
            let d: number;
            if (ang <= 90) {
                a = ConvolutionKernels.SOBEL_RIGHT;
                b = ConvolutionKernels.SOBEL_TOP;
                d = ang / 90;
            } else if (ang <= 180) {
                a = ConvolutionKernels.SOBEL_TOP;
                b = ConvolutionKernels.SOBEL_LEFT;
                d = (ang - 90) / 90;
            } else if (ang <= 270) {
                a = ConvolutionKernels.SOBEL_LEFT;
                b = ConvolutionKernels.SOBEL_BOTTOM;
                d = (ang - 180) / 90;
            } else {
                a = ConvolutionKernels.SOBEL_BOTTOM;
                b = ConvolutionKernels.SOBEL_RIGHT;
                d = (ang - 270) / 90;
            }

            this._kernel = lerpKernel(d, a, b);
        } else {
            const state = this._animState;
            switch (state.type) {
                case "idling":
                    let remaining: number = state.remaining - delta;
                    if (remaining <= 0) {
                        const a: ConvolutionKernel = [...this._kernel];
                        if (this._animStack.length < 1) this._animStack = [...KERNELS];
                        const b: ConvolutionKernel = [...this._animStack.splice(Math.floor(Math.random() * this._animStack.length), 1)[0]];
                        this._animState = {type: "transitioning", start: age, duration: 0.5, a, b};
                        break;
                    }
                    state.remaining = remaining;
                    break;
                case "transitioning":
                    let d: number = (age - state.start) / state.duration;
                    if (d >= 1) {
                        this._kernel = [...state.b];
                        this._animState = {type: "idling", remaining: 0.25};
                        break;
                    }
                    this._kernel = lerpKernel(d, state.a, state.b);
                    break;
            }
        }
    }

    destroy(): void {
        this._cursor!.stop();
        if (this._solverInit) this._solver!.destroy();
        this._image.destroy();
        this._solverInit = false;
        this._solver = null;
    }

}

function lerpKernel(d: number, a: ConvolutionKernel, b: ConvolutionKernel): ConvolutionKernel {
    d = Math.min(Math.max(d, 0), 1);
    let v: number = 1 - d;
    let ret: number[] = [];
    for (let i=0; i < 9; i++) ret[i] = (b[i] * d) + (a[i] * v);
    return ret as ConvolutionKernel;
}
