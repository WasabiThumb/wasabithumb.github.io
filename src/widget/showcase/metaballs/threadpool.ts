import {
    MetaBallsWorkerFrameMessage,
    MetaBallsWorkerInitMessage, MetaBallsWorkerLineMessage,
    MetaBallsWorkerMessage,
    MetaBallsWorkerPolygonsMessage, NPair,
    TransmitMetaBall
} from "./types";
import {MetaBallsContourSolver} from "./solver";

type Poly = NPair[];

export class MetaBallsThreadPool extends MetaBallsContourSolver {

    readonly poolSize: number;
    readonly pool: Worker[] = [];
    private readonly _sharedBuffer: SharedArrayBuffer | null;
    private readonly _hasSharedBuffer: boolean;
    private _active: boolean = true;
    private readonly _jobs: { id: number, callback: ((message: MetaBallsWorkerPolygonsMessage) => void) }[][] = [];
    constructor(cellSize: number, threshold: number, contours: Uint8Array, poolSize: number) {
        super(cellSize, threshold, contours);
        if (window.crossOriginIsolated) {
            const buf = new SharedArrayBuffer(72);
            (new Uint8Array(buf)).set(contours);
            this._sharedBuffer = buf;
            this._hasSharedBuffer = true;
        } else {
            this._sharedBuffer = null;
            this._hasSharedBuffer = false;
        }

        poolSize = Math.max(poolSize, 1);
        this.poolSize = poolSize;
        for (let i=0; i < poolSize; i++) {
            const worker: Worker = new Worker(new URL('./worker.ts', import.meta.url));
            const msg: MetaBallsWorkerInitMessage = {
                type: "init",
                cellSize: this.cellSize,
                threshold: this.threshold,
                contours: this._hasSharedBuffer ? this._sharedBuffer! : new Uint8Array(this.contours).buffer
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
