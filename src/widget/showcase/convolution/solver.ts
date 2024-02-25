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

import {
    ConvolutionKernel,
    ConvolutionWorkerInitMessage,
    ConvolutionWorkerMessage, ConvolutionWorkerStartMessage,
    messageDeserialize,
    messageSerialize
} from "./types";


// a cell size of 128 would create 16 threads for a 512x512 image; x=128 satisfies 512^2/x^2 = 16
export function createSolver(cellSize: number = 128): ConvolutionSolver {
    if (typeof ImageData === "function" && typeof OffscreenCanvas === "function") {
        if (typeof Worker === "function") {
            return new ParallelConvolutionSolver(cellSize);
        } else {
            return new BasicConvolutionSolver();
        }
    } else {
        return new UnsupportedConvolutionSolver();
    }
}

export interface ConvolutionSolver {

    init(image: CanvasImageSource): void;

    update(kernel: ConvolutionKernel, kernelG?: ConvolutionKernel, kernelB?: ConvolutionKernel): void;

    readyToDraw(): boolean;

    draw(canvas: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, offscreen?: OffscreenCanvasRenderingContext2D): void;

    destroy(): void;

}

// If browser does not support ImageData + OffscreenCanvas
export class UnsupportedConvolutionSolver implements ConvolutionSolver {

    init(image: CanvasImageSource): void { }

    update(kernel: ConvolutionKernel, kernelG?: ConvolutionKernel, kernelB?: ConvolutionKernel): void { }

    readyToDraw(): boolean {
        return true;
    }

    draw(canvas: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, offscreen?: OffscreenCanvasRenderingContext2D): void {
        canvas.fillStyle = "black";
        canvas.fillRect(x, y, w, h);

        canvas.fillStyle = "white";
        canvas.textBaseline = "top";
        canvas.textAlign = "center";

        let yOff: number = y + (h * 0.05);
        const write = ((line: string) => {
            if (line.length < 1) return;
            let em = (w * 0.95) / line.length;
            canvas.font = `${em}px 'Ubuntu Mono', monospace`;
            canvas.fillText(line, x + (w * 0.5), yOff, w);
            yOff += em
        });

        write("Sorry");
        yOff *= 1.25;
        write("Your browser cannot");
        write("run this demo");
    }

    destroy(): void {
    }

}

export class BasicConvolutionSolver implements ConvolutionSolver {

    private ref: ImageData | null = null;
    private target: ImageData | null = null;
    private isInit: boolean = false;
    init(image: CanvasImageSource): void {
        const { w, h, isCanvas } = parseImageSource(image);
        let ref: ImageData;
        if (isCanvas) {
            let canvas = image as HTMLCanvasElement | OffscreenCanvas;
            let ctx = canvas.getContext("2d")! as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
            ref = ctx.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: "srgb" });
        } else {
            let canvas: OffscreenCanvas = new OffscreenCanvas(w, h);
            let ctx = canvas.getContext("2d")!;
            ctx.drawImage(image, 0, 0);
            ref = ctx.getImageData(0, 0, w, h, { colorSpace: "srgb" });
        }
        this.ref = ref;
        this.target = new ImageData(new Uint8ClampedArray(ref.data), ref.width, ref.height, { colorSpace: "srgb" });
        this.isInit = true;
    }

    private _ready: boolean = false;
    update(kernel: ConvolutionKernel, kernelG?: ConvolutionKernel, kernelB?: ConvolutionKernel): void {
        const ref: ImageData = this.ref!;
        const target: ImageData = this.target!;
        const { width, height } = ref;
        const a = ref.data;
        const b = target.data;

        this.updateChannel(a, b, width, height, kernel, 0);
        this.updateChannel(a, b, width, height, (!!kernelG) ? kernelG : kernel, 1);
        this.updateChannel(a, b, width, height, (!!kernelB) ? kernelB : kernel, 2);
        this._ready = true;
    }

    private updateChannel(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number, kernel: ConvolutionKernel, channel: number) {
        const getIndex: ((x: number, y: number) => number) = ((x, y) => {
            return (y * width * 4) + (x * 4) + channel;
        });

        const sample: ((x: number, y: number) => number) = ((x, y) => {
            if (x < 0 || x >= width) return 0;
            if (y < 0 || y >= height) return 0;
            return a[getIndex(x, y)];
        });

        for (let y=0; y < height; y++) {
            for (let x=0; x < width; x++) {
                let sum: number = 0;
                let kernelIndex: number = 0;
                for (let kmy=-1; kmy < 2; kmy++) {
                    for (let kmx=-1; kmx < 2; kmx++) {
                        sum += sample(x + kmx, y + kmy) * kernel[kernelIndex++];
                    }
                }
                b[getIndex(x, y)] = Math.floor(Math.min(Math.max(sum, 0), 255));
            }
        }
    }

    readyToDraw(): boolean {
        return this._ready;
    }

    draw(canvas: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, offscreen?: OffscreenCanvasRenderingContext2D): void {
        const data: ImageData = this.target!;
        if (data.width === w && data.height === h) {
            canvas.putImageData(data, x, y);
            return;
        }
        if (!offscreen) {
            canvas.putImageData(data, x, y, 0, 0, Math.min(w, data.width), Math.min(h, data.height));
            return;
        }

        if (data.width <= offscreen.canvas.width && data.height <= offscreen.canvas.height) {
            offscreen.putImageData(data, 0, 0);
            canvas.drawImage(offscreen.canvas, 0, 0, data.width, data.height, x, y, w, h);
        } else {
            let dim: number = Math.min(offscreen.canvas.width, offscreen.canvas.height);
            let seg: number = Math.ceil(Math.max(data.width, data.height) / dim);
            let xScale: number = w / data.width;
            let yScale: number = h / data.height;
            for (let cy=0; cy < seg; cy++) {
                for (let cx=0; cx < seg; cx++) {
                    let left: number = cx * dim;
                    let top: number = cy * dim;
                    let right: number = Math.min(left + dim, data.width);
                    let bottom: number = Math.min(top + dim, data.height);
                    let cw: number = right - left;
                    let ch: number = bottom - top;
                    if (cw < 1 || ch < 1) continue;
                    offscreen!.putImageData(data, 0, 0, left, top, cw, ch);
                    canvas.drawImage(offscreen!.canvas, 0, 0, cw, ch, x + (left * xScale), y + (top * yScale), cw * xScale, ch * yScale);
                }
            }
        }
    }

    destroy() {
        this.ref = null;
        this.target = null;
        this.isInit = false;
        this._ready = false;
    }

}

export class ParallelConvolutionSolver implements ConvolutionSolver {

    readonly cellSize: number;
    readonly workers: ParallelConvolutionSolverWorker[];
    constructor(cellSize: number = 128) {
        this.cellSize = cellSize;
        this.workers = [];
    }

    private _dest: OffscreenCanvasRenderingContext2D | null = null;
    private _activeJob: number = -1;
    private _jobCompletion: number = 0;
    private _ready: boolean = false;
    init(image: CanvasImageSource): void {
        const { w, h } = parseImageSource(image);

        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" })!;
        this._dest = ctx;
        ctx.drawImage(image, 0, 0);

        // draw image onto ctx to get cells to distribute to workers
        const cellW: number = Math.ceil(w / this.cellSize);
        const cellH: number = Math.ceil(h / this.cellSize);
        let yFlags: number = 1;
        for (let cy=0; cy < cellH; cy++) {
            const y: number = cy * this.cellSize;
            const height: number = Math.min(y + this.cellSize, h) - y;
            if (cy === (cellH - 1)) yFlags ^= 1;

            let xFlags: number = 4;
            for (let cx=0; cx < cellW; cx++) {
                if (cx === (cellW - 1)) xFlags ^= 4;
                const flags: number = xFlags | yFlags;
                const x: number = cx * this.cellSize;
                const width: number = Math.min(x + this.cellSize, w) - x;

                let clipX: number = x;
                let clipY: number = y;
                let clipW: number = width;
                let clipH: number = height;
                if (flags & 8) { clipX--; clipW++; }
                if (flags & 4) { clipW++; }
                if (flags & 2) { clipY--; clipH++; }
                if (flags & 1) { clipH++; }

                const worker: Worker = new Worker(new URL('./worker.ts', import.meta.url));
                const msg: ConvolutionWorkerInitMessage = {
                    type: "init",
                    bitmap: ctx.getImageData(clipX, clipY, clipW, clipH, { colorSpace: "srgb" }).data,
                    width, height, flags
                };
                const me = this;
                worker.onmessage = ((event: MessageEvent) => {
                    const message: ConvolutionWorkerMessage = messageDeserialize(event.data as ArrayBuffer);
                    if (message.type === "finish") {
                        if (message.job === me._activeJob) {
                            me._dest!.putImageData(new ImageData(message.bitmap, message.width, message.height, { colorSpace: "srgb" }), x, y);
                            me._jobCompletion++;
                            if (me._jobCompletion >= me.workers.length) me._ready = true;
                        }
                    }
                });
                worker.postMessage(messageSerialize(msg, false));
                this.workers.push({ process: worker, x, y });
                xFlags |= 8;
            }
            yFlags |= 2;
        }
    }

    update(kernel: ConvolutionKernel, kernelG?: ConvolutionKernel, kernelB?: ConvolutionKernel): void {
        if (this._activeJob >= 0 && this._jobCompletion < this.workers.length) return;
        let cur: number = Math.max(this._activeJob, 0);
        let job: number = Math.floor(Math.random() * 255);
        if (job >= cur) job++;
        this._activeJob = job;
        this._jobCompletion = 0;

        const msg: ConvolutionWorkerStartMessage = {
            type: "start",
            job,
            redKernel: kernel,
            greenKernel: (!!kernelG) ? kernelG : kernel,
            blueKernel: (!!kernelB) ? kernelB : kernel
        };
        const payload = messageSerialize(msg, window.crossOriginIsolated);

        for (let w of this.workers) {
            w.process.postMessage(payload);
        }
    }

    readyToDraw(): boolean {
        return this._ready;
    }

    draw(canvas: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, offscreen?: OffscreenCanvasRenderingContext2D): void {
        canvas.drawImage(this._dest!.canvas, x, y, w, h);
    }

    destroy(): void {
        try {
            for (let w of this.workers) {
                w.process.terminate();
            }
        } finally {
            this.workers.splice(0);
            this._dest = null;
            this._ready = false;
            this._jobCompletion = 0;
            this._activeJob = -1;
        }
    }

}
type ParallelConvolutionSolverWorker = { process: Worker, x: number, y: number };


type ImageSourceParseResults = { w: number, h: number, isCanvas: boolean };
function parseImageSource(image: CanvasImageSource): ImageSourceParseResults {
    let w: number = 0;
    let h: number = 0;
    let valid: boolean = true;
    let isCanvas: boolean = false;
    if (image instanceof HTMLElement) {
        if (image instanceof HTMLImageElement) {
            w = image.naturalWidth;
            h = image.naturalHeight;
        } else if (image instanceof HTMLVideoElement) {
            w = image.videoWidth;
            h = image.videoHeight;
        } else if (image instanceof HTMLCanvasElement) {
            w = image.width;
            h = image.height;
            isCanvas = true;
        } else {
            valid = false;
        }
    } else {
        let off: boolean = image instanceof OffscreenCanvas;
        if (off || image instanceof ImageBitmap) {
            w = (image as OffscreenCanvas | ImageBitmap).width;
            h = (image as OffscreenCanvas | ImageBitmap).height;
            isCanvas = off;
        } else if (image instanceof VideoFrame) {
            w = image.displayWidth;
            h = image.displayHeight;
        } else if (image instanceof SVGImageElement) {
            w = image.clientWidth;
            h = image.clientHeight;
        } else {
            valid = false;
        }
    }
    if (!valid) throw new Error(`Unsupported image source: ${image}`);
    return { w, h, isCanvas };
}
