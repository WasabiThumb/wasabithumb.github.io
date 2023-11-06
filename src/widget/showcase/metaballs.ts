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
import {NPair, TransmitMetaBall} from "./metaballs/types";
import {MetaBallsContourSolverImpl, MetaBallsContourSolver} from "./metaballs/solver";
import {MetaBallsThreadPool} from "./metaballs/threadpool";
import {CONTOURS_BYTES} from "./metaballs/contourdata";

type MetaBall = {
    id: number,
    pos: Vector2,
    velocity: Vector2,
    radius: number
};
const metaBallTransmit: ((mb: MetaBall) => TransmitMetaBall) = ((mb) => {
    const tf: ((vec: Vector2) => NPair) = (vec => [ vec.x, vec.y ]);
    return { ...mb, pos: tf(mb.pos), velocity: tf(mb.velocity) };
});

const noWorker: boolean = (() => {
    if (typeof Worker !== "function") return true;
    try {
        return /firefox/i.test(window.navigator.userAgent);
    } catch (e) { }
    return false;
})();
const CELL_SIZE: number = noWorker ? 18 : 4;
const THRESHOLD: number = 0.02025;

export default class MetaBallsShowcaseSlide implements ShowcaseSlide {

    private _balls: MetaBall[] = [];
    private _centerPos: Vector2 = new Vector2(50, 50);
    private _cursor: CursorTracker | null = null;
    private _ballColor: RGB = RGB.black();
    private _bgColor: RGB = RGB.black();
    private _transitionProgress: number = -6;
    private _solver: MetaBallsContourSolver | null = null;
    private _solvedPolys: NPair[][] = [];

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
        if (noWorker) {
            this._solver = new MetaBallsContourSolverImpl(CELL_SIZE, THRESHOLD, CONTOURS_BYTES);
        } else {
            this._solver = new MetaBallsThreadPool(CELL_SIZE, THRESHOLD, 16);
        }
    }

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

        let stroking: boolean = false;
        if (this._transitionProgress >= 0 && this._transitionProgress <= 1) {
            ctx.globalAlpha = 4 * Math.pow(this._transitionProgress - 0.5, 2);
        } else if (this._transitionProgress >= 6) {
            stroking = true;
            ctx.strokeStyle = `rgba(0,0,0,${Math.min(this._transitionProgress - 6, 1)})`;
        }

        const me = this;
        const solver = this._solver!;
        solver.startFrame(this._balls.map(metaBallTransmit), this._transitionProgress >= 0.5);
        solver.solve(cellCount, [ padLeft, padTop ], [ width, height ]).then((polys) => {
            me._solvedPolys = polys;
        });

        for (let poly of this._solvedPolys) {
            let point: NPair;

            point = poly[0];
            ctx.beginPath();
            ctx.moveTo(point[0], point[1]);
            for (let i=1; i < poly.length; i++) {
                point = poly[i];
                ctx.lineTo(point[0], point[1]);
            }
            ctx.closePath();
            ctx.fill();
            if (stroking) ctx.stroke();
        }

        ctx.globalAlpha = 1;
        this._transitionProgress += delta * 2;
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
        this._solver!.dispose();
    }

}

