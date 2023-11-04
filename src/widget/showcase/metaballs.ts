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

import {Vector, Vector2} from "../../math/vector";
import {ShowcaseSlide, ShowcaseSlideParameters} from "../showcase";
import {CursorTracker} from "../../util/input";
import {HSV, RGB} from "../../util/color";

// tl tr bl br
// 0b(tl)(tr)(bl)(br)
type CornerIndex = 0 | 1 | 2 | 3;
type ContourPoint = [ CornerIndex, CornerIndex ] | CornerIndex;

const CONTOURS: ContourPoint[][] = [
    [],
    [ [ 2, 3 ], [ 1, 3 ], 3 ], // br
    [ [ 0, 2 ], [ 2, 3 ], 2 ], // bl
    [ [ 0, 2 ], [ 1, 3 ], 3, 2 ], // bl br
    [ [ 0, 1 ], [ 1, 3 ], 1 ], // tr
    [ [ 0, 1 ], [ 2, 3 ], 3, 1 ], // tr br
    [ [ 0, 2 ], [ 0, 1 ], 1, [ 1, 3 ], [ 2, 3 ], 2 ], // tr bl
    [ [ 0, 2 ], [ 0, 1 ], 1, 3, 2 ], // tr bl br
    [ 0, [ 0, 1 ], [ 0, 2 ] ], // tl
    [ 0, [ 0, 1 ], [ 1, 3 ], 3, [ 2, 3 ], [ 0, 2 ] ], // tl br
    [ 0, [ 0, 1 ], [ 2, 3 ], 2 ], // tl bl
    [ 0, [ 0, 1 ], [ 1, 3 ], 3, 2 ], // tl bl br
    [ 0, 1, [ 1, 3 ], [ 0, 2 ] ], // tl tr
    [ [ 0, 2 ], 0, 1, 3, [ 2, 3 ] ], // tl tr br
    [ 0, 1, [ 1, 3 ], [ 2, 3 ], 2 ], // tl tr bl
    [ 0, 1, 3, 2 ] // tl tr bl br
];
const OFFSETS: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(1, 0),
    new Vector2(0, 1),
    new Vector2(1, 1)
];
const CELL_SIZE: number = 18;
const THRESHOLD: number = 0.02025;


export default class MetaBallsShowcaseSlide implements ShowcaseSlide {

    private _balls: MetaBall[] = [];
    private _centerPos: Vector2 = new Vector2(50, 50);
    private _cursor: CursorTracker | null = null;
    private _ballColor: RGB = RGB.black();
    private _bgColor: RGB = RGB.black();
    private _transitionProgress: number = -6;

    init(param: ShowcaseSlideParameters): void {
        const hue = Math.random();
        const hue2 = (hue + 0.5) % 1;
        this._ballColor = HSV.toRGB([ hue, 1, 1 ]);
        this._bgColor = HSV.toRGB([ hue2, 1, 1 ]);

        this._centerPos = new Vector2(50, 50);
        for (let i=0; i < 8; i++) {
            const ang = Math.random() * Math.PI * 2;
            const mag = Math.pow(Math.random(), 2) * 40;
            const [ cos, sin ] = [ Math.cos(ang), Math.sin(ang) ];
            const pos = new Vector2(50 + (cos * mag), 50 + (sin * mag));
            const velMag = Math.random();
            this._balls.push({ id: i, pos, velocity: new Vector2(-cos * 2.5 * velMag, -sin * 2.5 * velMag), radius: 0.15 + (0.4 * Math.random()) });
        }
        this._cursor = new CursorTracker();
        this._transitionProgress = -6;
        this._stroking = false;
    }

    private _stroking: boolean = false;
    render(param: ShowcaseSlideParameters, delta: number, age: number): void {
        const { canvas, ctx } = param;
        const { width, height } = canvas;

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        const dim = Math.max(width, height);
        const cellCount = Math.ceil(dim / CELL_SIZE);
        const gridSize = cellCount * CELL_SIZE;
        let padLeft = Math.floor((gridSize - width) / 2);
        let padTop = Math.floor((gridSize - height) / 2);

        if (this._cursor!.lastEventAgeMillis() < 2000) {
            const x: number = this._cursor!.getX();
            const y: number = this._cursor!.getY();
            const targetCenterPos = new Vector2((x + padLeft) * (100 / gridSize), (y + padTop) * (100 / gridSize));
            this._centerPos = Vector.lerp(this._centerPos, targetCenterPos, delta * 2.5);
        }
        this._simulationStep(delta);

        const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.SQRT2 / 2 * dim);
        bg.addColorStop(0, RGB.toCSS(RGB.lerp(this._bgColor, RGB.black(), 0.9)));
        bg.addColorStop(1, "black");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        const fg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.SQRT2 / 2 * dim);
        fg.addColorStop(0, RGB.toCSS(this._ballColor));
        fg.addColorStop(1, RGB.toCSS(RGB.lerp(this._ballColor, RGB.black(), 0.9)));
        ctx.fillStyle = fg;

        if (this._transitionProgress >= 0 && this._transitionProgress <= 1) {
            ctx.globalAlpha = 4 * Math.pow(this._transitionProgress - 0.5, 2);
        } else if (this._transitionProgress >= 6) {
            this._stroking = true;
            ctx.strokeStyle = `rgba(0,0,0,${Math.min(this._transitionProgress - 6, 1)})`;
        }

        this._evalCache = {};
        for (let y=0; y < cellCount; y++) {
            let top: number = (y * CELL_SIZE) - padTop;
            let bottom: number = top + CELL_SIZE;
            if (bottom < 0) continue;
            if (top > height) break;

            let stripeStart = -1;
            let stripeEnd = 0;
            const checkStripe = (() => {
                if (stripeStart >= 0) {
                    let ax = (stripeStart * CELL_SIZE) - padLeft;
                    let bx = (stripeEnd * CELL_SIZE) - padLeft + CELL_SIZE;

                    ctx.beginPath();
                    ctx.moveTo(ax, top);
                    ctx.lineTo(bx, top);
                    ctx.lineTo(bx, bottom);
                    ctx.lineTo(ax, bottom);
                    ctx.closePath();
                    ctx.fill();
                    if (this._stroking) ctx.stroke();
                }
                stripeStart = -1;
            });

            for (let x=0; x < cellCount; x++) {
                let left: number = (x * CELL_SIZE) - padLeft;
                let right: number = left + CELL_SIZE;
                if (right < 0) continue;
                if (left > width) break;

                if (this._renderCell(ctx, new Vector2(left, top), new Vector2(right, bottom), new Vector2(x, y), cellCount)) {
                    if (stripeStart < 0) stripeStart = x;
                    stripeEnd = x;
                } else {
                    checkStripe();
                }
            }
            checkStripe();
        }
        ctx.globalAlpha = 1;
        this._transitionProgress += delta * 2;
    }

    private _renderCell(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, canvasMins: Vector2, canvasMaxs: Vector2, gridPos: Vector2, gridSize: number): boolean {
        let cornerWeights: number[] = [];
        let flag: number = 0; // tl tr bl br
        for (let i=0; i < 4; i++) {
            let weight: number = this._evaluate(Vector.sum(gridPos, OFFSETS[i]), gridSize);
            cornerWeights[i] = weight;
            if (this._transitionProgress <= 0.5 ? weight >= THRESHOLD : weight <= THRESHOLD) flag |= (1 << (3 - i));
        }
        if (flag === 0) return false;
        if (flag === 15) return true;

        const contour: ContourPoint[] = CONTOURS[flag & 15];
        let vectors: Vector2[] = [];
        for (let point of contour) {
            if (typeof point === "number") {
                vectors.push(OFFSETS[point]);
            } else {
                let a: Vector2 = OFFSETS[point[0]];
                let aw: number = cornerWeights[point[0]];
                let b: Vector2 = OFFSETS[point[1]];
                let bw: number = cornerWeights[point[1]];
                let d: number = (THRESHOLD - aw) / (bw - aw);
                vectors.push(Vector.lerp(a, b, d));
            }
        }

        let point: Vector2 = Vector2.xyLerp(canvasMins, canvasMaxs, vectors[0]);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        for (let i=1; i < vectors.length; i++) {
            point = Vector2.xyLerp(canvasMins, canvasMaxs, vectors[i]);
            ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.fill();
        if (this._stroking) ctx.stroke();

        return false;
    }

    private _evalCache: { [hash: number]: number } = {};
    private _evaluate(gridPos: Vector2, gridSize: number): number {
        let hash: number = ((gridPos.x & 0xffff) << 16) | (gridPos.y & 0xffff);
        let value = this._evalCache[hash];
        if (!!value) return value;

        value = 0;
        const pos: Vector2 = MetaBallsShowcaseSlide._gridToWorld(gridPos, gridSize);
        for (let ball of this._balls) {
            const d = Math.pow(pos.x - ball.pos.x, 2) + Math.pow(pos.y - ball.pos.y, 2);
            if (d < 1e-9) {
                value = Number.POSITIVE_INFINITY;
                break;
            }
            value += ball.radius / d;
        }
        this._evalCache[hash] = value;
        return value;
    }

    private _simulationStep(delta: number) {
        for (let ball of this._balls) {
            ball.velocity.multiply(Math.max(1 - (delta * 0.55), 0.5));

            for (let other of this._balls) {
                if (other.id === ball.id) continue;
                let away: Vector2 = Vector2.difference(ball.pos, other.pos);
                let dist = away.normSqr();
                let sum = ball.radius + other.radius * 1.2;
                if (dist <= 1e-9 || dist >= Math.pow(sum, 2)) continue;
                dist = Math.sqrt(dist);
                away.divide(dist);

                let overlap = (sum - dist) / sum;
                ball.velocity.add(away.multiply(Math.pow(overlap - 0.5, 2) * 80 * delta));
            }

            let inward = this._centerPos.copy().subtract(ball.pos);
            let centerDist = inward.normSqr();
            if (centerDist >= 100) {
                centerDist = Math.sqrt(centerDist);
                inward.divide(centerDist);
                let power = Math.min((centerDist - 10) / 40, 1);

                ball.velocity.add(inward.multiply(180 * delta * Math.pow(power, 3)));
            }

            ball.pos.add(Vector2.product(ball.velocity, delta * 48));
        }
    }

    destroy(): void {
        this._balls.splice(0);
        this._cursor!.stop();
    }

    private static _gridToWorld(gridPos: Vector2, gridSize: number): Vector2 {
        return Vector.quotient(gridPos, gridSize).multiply(100);
    }

}

type MetaBall = {
    id: number,
    pos: Vector2,
    velocity: Vector2,
    radius: number
};
