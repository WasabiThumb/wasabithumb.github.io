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
    MetaBallsWorkerFrameMessage,
    MetaBallsWorkerInitMessage, MetaBallsWorkerLineMessage,
    MetaBallsWorkerMessage,
    MetaBallsWorkerPolygonsMessage, NPair,
    TransmitMetaBall
} from "./types";
import {MetaBallsContourSolver} from "./solver";
import {CONTOURS_BYTES} from "./contourdata";

type Poly = NPair[];

export class MetaBallsThreadPool extends MetaBallsContourSolver {

    private static _sharedBufferState: number = 0;
    private static _sharedBuffer: SharedArrayBuffer | null = null;

    private static _initSharedBuffer(): void {
        if (this._sharedBufferState === 0) {
            if (window.crossOriginIsolated) {
                const sb = new SharedArrayBuffer(72);
                (new Uint8Array(sb)).set(CONTOURS_BYTES);
                this._sharedBuffer = sb;
                this._sharedBufferState = 2;
            } else {
                this._sharedBufferState = 1;
            }
        }
    }

    private static _getSharedBuffer(): SharedArrayBuffer {
        this._initSharedBuffer();
        return this._sharedBuffer!;
    }

    private static _hasSharedBuffer(): boolean {
        this._initSharedBuffer();
        return this._sharedBufferState === 2;
    }

    private static _getMovableContoursBuffer(): ArrayBuffer | SharedArrayBuffer {
        if (this._hasSharedBuffer()) return this._getSharedBuffer();
        return new Uint8Array(CONTOURS_BYTES).buffer;
    }

    readonly poolSize: number;
    readonly pool: Worker[] = [];
    private _active: boolean = true;
    private readonly _jobs: { id: number, callback: ((message: MetaBallsWorkerPolygonsMessage) => void) }[][] = [];
    constructor(cellSize: number, threshold: number, poolSize: number) {
        super(cellSize, threshold, CONTOURS_BYTES);

        poolSize = Math.max(poolSize, 1);
        this.poolSize = poolSize;
        for (let i=0; i < poolSize; i++) {
            const worker: Worker = new Worker(new URL('./worker.ts', import.meta.url));
            const msg: MetaBallsWorkerInitMessage = {
                type: "init",
                cellSize: this.cellSize,
                threshold: this.threshold,
                contours: MetaBallsThreadPool._getMovableContoursBuffer()
            };
            worker.postMessage(msg);
            this.pool[i] = worker;
            this._jobs[i] = [];

            const me = this;
            worker.onmessage = ((event) => {
                const msg = event.data as MetaBallsWorkerMessage;
                if (msg.type !== "polygons") return;
                const { job } = msg;

                const jobs = me._jobs[i];
                let index: number = -1;
                for (let i=0; i < jobs.length; i++) {
                    if (jobs[i].id === job) {
                        index = i;
                        break;
                    }
                }
                if (index < 0) return;
                jobs.splice(index, 1)[0].callback(msg);
            });
        }
    }

    protected onStartFrame(balls: TransmitMetaBall[], invert: boolean): void {
        const msg: MetaBallsWorkerFrameMessage = {
            type: "frame",
            balls, invert
        };
        for (let i=0; i < this.poolSize; i++) {
            const worker = this.pool[i];
            worker.postMessage(msg);
        }
    }

    protected preSolve() {
        this._head = (this._head + Math.floor(Math.random() * this.poolSize)) % this.poolSize;
    }

    private _head: number = 0;
    solveLine(y: number, cellCount: number, pad: NPair, canvasSize: NPair): Promise<Poly[]> {
        if (!this._active) return Promise.resolve([]);
        const workerId: number = this._head++;
        const worker: Worker = this.pool[workerId];
        if (this._head >= this.poolSize) this._head = 0;

        const jobId: number = Math.floor(Math.random() * 4294967295);
        const me = this;
        const ret: Promise<Poly[]> = new Promise((res) => {
            me._jobs[workerId].push({
                id: jobId,
                callback: ((msg) => {
                    res(msg.points)
                })
            });
        });
        const msg: MetaBallsWorkerLineMessage = {
            type: "line",
            job: jobId,
            y, cellCount, pad, canvasSize
        };
        worker.postMessage(msg);

        return ret;
    }

    dispose(): void {
        if (!this._active) return;
        this._active = false;
        for (let i=0; i < this.poolSize; i++) {
            this.pool[i].terminate();
        }
    }

}
