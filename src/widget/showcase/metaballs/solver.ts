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
    ContourPoint,
    CORNER_OFFSETS_N,
    CornerIndex,
    TransmitMetaBall,
    NPair
} from "./types";


type Poly = NPair[];

export abstract class MetaBallsContourSolver {

    readonly cellSize: number;
    readonly threshold: number;
    readonly contours: Uint8Array;

    balls: TransmitMetaBall[] = [];
    invert: boolean = false;

    constructor(cellSize: number, threshold: number, contours: Uint8Array) {
        this.cellSize = cellSize;
        this.threshold = threshold;
        this.contours = contours;
    }

    startFrame(balls: TransmitMetaBall[], invert: boolean = false) {
        this.balls = balls;
        this.invert = invert;
        this.onStartFrame(balls, invert);
    }

    protected abstract onStartFrame(balls: TransmitMetaBall[], invert: boolean): void;

    protected abstract preSolve(): void;

    solve(cellCount: number, pad: NPair, canvasSize: NPair): Promise<Poly[]> {
        this.preSolve();
        const promises: Promise<Poly[]>[] = [];
        for (let y=0; y < cellCount; y++) {
            promises.push(this.solveLine(y, cellCount, pad, canvasSize));
        }
        return Promise.all(promises).then((out) => {
            const ret: Poly[] = [];
            for (let i=0; i < out.length; i++) ret.push(...out[i]);
            return ret;
        });
    }

    abstract solveLine(y: number, cellCount: number, pad: NPair, canvasSize: NPair): Promise<Poly[]>;

    abstract dispose(): void;

}

export class MetaBallsContourSolverImpl extends MetaBallsContourSolver {

    protected onStartFrame(balls: TransmitMetaBall[], invert: boolean): void {
        this._evalCache = {};
    }

    protected preSolve(): void { }

    solveLine(y: number, cellCount: number, pad: NPair, canvasSize: NPair): Promise<Poly[]> {
        const [ canvasWidth, canvasHeight ] = canvasSize;
        const [ padLeft, padTop ] = pad;

        const ret: Poly[] = [];

        let top: number = (y * this.cellSize) - padTop;
        let bottom: number = top + this.cellSize;
        if (bottom < 0) return Promise.resolve(ret);
        if (top > canvasHeight) return Promise.resolve(ret);

        let stripeStart = -1;
        let stripeEnd = 0;
        const checkStripe = (() => {
            if (stripeStart >= 0) {
                let ax = (stripeStart * this.cellSize) - padLeft;
                let bx = (stripeEnd * this.cellSize) - padLeft + this.cellSize;
                ret.push([ [ax, top], [bx, top], [bx, bottom], [ax, bottom] ]);
            }
            stripeStart = -1;
        });

        for (let x=0; x < cellCount; x++) {
            let left: number = (x * this.cellSize) - padLeft;
            let right: number = left + this.cellSize;
            if (right < 0) continue;
            if (left > canvasWidth) break;

            if (this.solveSingle(x, y, cellCount, [ left, top ], [ right, bottom ], ret)) {
                if (stripeStart < 0) stripeStart = x;
                stripeEnd = x;
            } else {
                checkStripe();
            }
        }
        checkStripe();

        return Promise.resolve(ret);
    }

    solveSingle(x: number, y: number, cellCount: number, canvasMins: NPair, canvasMaxs: NPair, polyList: Poly[]): boolean {
        let cornerWeights: number[] = [];
        let flag: number = 0; // tl tr bl br
        for (let i=0; i < 4; i++) {
            let weight: number = this._evaluate(x + CORNER_OFFSETS_N[i][0], y + CORNER_OFFSETS_N[i][1], cellCount);
            cornerWeights[i] = weight;
            if (this.invert ? weight <= this.threshold : weight >= this.threshold) flag |= (1 << (3 - i));
        }
        if (flag === 0) return false;
        if (flag === 15) return true;

        const contour: ContourPoint[] = this._getContour(flag & 15);
        let points: Poly = [];
        for (let point of contour) {
            if (typeof point === "number") {
                points.push(CORNER_OFFSETS_N[point]);
            } else {
                let a = CORNER_OFFSETS_N[point[0]];
                let aw: number = cornerWeights[point[0]];
                let b = CORNER_OFFSETS_N[point[1]];
                let bw: number = cornerWeights[point[1]];
                let d: number = (this.threshold - aw) / (bw - aw);
                let v: number = 1 - d;
                points.push([
                    (b[0] * d) + (a[0] * v),
                    (b[1] * d) + (a[1] * v)
                ]);
            }
        }
        for (let i=0; i < points.length; i++) points[i] = MetaBallsContourSolverImpl._xyLerp(canvasMins, canvasMaxs, points[i]);

        polyList.push(points);
        return false;
    }

    private _evalCache: { [hash: number]: number } = {};
    private _evaluate(gridX: number, gridY: number, gridSize: number): number {
        let hash: number = ((gridX & 0xffff) << 16) | (gridY & 0xffff);
        let value = this._evalCache[hash];
        if (!!value) return value;

        value = 0;
        const factor = 100 / gridSize;
        const pos: NPair = [ gridX * factor, gridY * factor ];
        for (let ball of this.balls) {
            const d = Math.pow(pos[0] - ball.pos[0], 2) + Math.pow(pos[1] - ball.pos[1], 2);
            if (d < 1e-9) {
                value = Number.POSITIVE_INFINITY;
                break;
            }
            value += ball.radius / d;
        }
        this._evalCache[hash] = value;
        return value;
    }

    private _getContour(flag: number) {
        let len: number = this.contours[flag >> 1];
        if (!(flag & 1)) len >>= 4;
        len &= 15;
        let ret: ContourPoint[] = new Array(len);

        const s: number = (flag << 2) + 8;
        const n: number = (this.contours[s] << 24)
            | (this.contours[s | 1] << 16)
            | (this.contours[s | 2] << 8)
            | this.contours[s | 3];
        let z: number = 0;

        for (let i=0; i < len; i++) {
            if (n & (1 << (z++))) {
                let a: CornerIndex = ((n >> z) & 3) as CornerIndex;
                z += 2;
                let b: CornerIndex = ((n >> z) & 3) as CornerIndex;
                z += 2;
                ret[i] = [ a, b ];
            } else {
                ret[i] = ((n >> z) & 3) as CornerIndex;
                z += 4;
            }
        }

        return ret;
    }

    private static _xyLerp(a: NPair, b: NPair, xy: NPair): NPair {
        let [ x, y ] = xy;
        y = Math.min(Math.max(y, 0), 1);
        let ny: number = 1 - y;
        x = Math.min(Math.max(x, 0), 1);
        let nx: number = 1 - x;

        return [
            (x * b[0]) + (nx * a[0]),
            (y * b[1]) + (ny * a[1])
        ];
    }

    dispose(): void {
        this._evalCache = {};
    }

}
