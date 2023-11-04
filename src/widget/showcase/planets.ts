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
import {HSV, RGB} from "../../util/color";
import {CursorTracker} from "../../util/input";

const CAM_DISTANCE: number = 300;

export default class PlanetsShowcaseSlide implements ShowcaseSlide {

    private _planets: Planet[] = [];
    private _offset: number = 0;
    private _offsetTarget: number = 0;
    private _perspectiveFactor: number = 0.2;
    private _perspectiveFactorTarget: number = 0.2;
    private _cursor: CursorTracker | null = null;

    init(param: ShowcaseSlideParameters): void {
        this._cursor = new CursorTracker(window.innerWidth / 2, window.innerHeight * 0.8);
        this._planets.push(new Planet(0, 6, 0, 0, [ 255, 255, 0 ]));
        let head: number = 10;
        for (let i=0; i < 5 + Math.floor(Math.random() * 6); i++) {
            let rand = Math.random();
            rand = (2 * rand) - (rand * rand);
            head += (rand * 12) + 3;
            if (head > 95) return;
            this._planets.push(new Planet(head, (Math.random() * 2) + 1));
        }
    }

    render(param: ShowcaseSlideParameters, delta: number, age: number): void {
        const { canvas, ctx } = param;
        const { width, height } = canvas;
        const maxDim: number = Math.max(width, height);
        const padLeft: number = (maxDim - width) / 2;
        const padTop: number = (maxDim - height) / 2;

        this._updateCursorVars(this._cursor!);
        const u = Math.min(Math.max(delta * 8, 0), 1);
        const v = 1 - u;
        if (Math.abs(this._perspectiveFactor - this._perspectiveFactorTarget) > 0.05) this._perspectiveFactor = (v * this._perspectiveFactor) + (u * this._perspectiveFactorTarget);
        if (Math.abs(this._offset - this._offsetTarget) > 0.05) this._offset = (v * this._offset) + (u * this._offsetTarget);

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        const factor: number = maxDim / 200;
        const projectPoint: ((point: Point) => Point) = ((point) => {
            return { x: (point.x + 100) * factor - padLeft, y: (point.y + 100) * factor - padTop, z: point.z };
        });

        const toDraw: PlanetDraw[] = [];
        let lpos: Point = { x: 0, y: 0, z: 0 };
        let pos: Point = { ...lpos };
        for (let planet of this._planets) {
            let seg: number = Math.max(Math.floor(planet.radius / 2) * 4, 36);
            for (let i = 0; i <= seg; i++) {
                let diff: number = 2 * ((i / seg) - 0.5);
                let b: Point = projectPoint(planet.getPosition(this._offset + (diff * Math.PI), this._perspectiveFactor));
                let a: Point = {...lpos};
                lpos = b;
                if (i === 0) {
                    continue;
                } else if (Math.abs(diff) <= 0.005) {
                    pos = b;
                }
                if (planet.radius > 1) toDraw.push({type: "line", z: (a.z + b.z) / 2, a, b, color: RGB.lerp(planet.color, RGB.white(), 0.95)});
            }

            const size = planet.getScaledSize(pos.z) * factor;
            toDraw.push({ ...pos, type: "circle", radius: size, color: planet.color });
            planet.rotate(delta);
        }

        toDraw.sort((a, b) => b.z - a.z);
        ctx.lineWidth = Math.max(Math.min(width, height) * 0.0025, 1);
        for (let draw of toDraw) {
            if (draw.type === "circle") {
                ctx.fillStyle = RGB.toCSS(draw.color);
                ctx.beginPath();
                ctx.arc(draw.x, draw.y, draw.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (draw.type === "line") {
                const al = ctx.globalAlpha;
                ctx.globalAlpha = al * 0.4;
                ctx.strokeStyle = RGB.toCSS(draw.color);
                ctx.beginPath();
                ctx.moveTo(draw.a.x, draw.a.y);
                ctx.lineTo(draw.b.x, draw.b.y);
                ctx.stroke();
                ctx.globalAlpha = al;
            }
        }
    }

    private _updateCursorVars(cursor: CursorTracker) {
        this._offsetTarget = (cursor.getX() / window.innerWidth) * Math.PI * 2;
        this._perspectiveFactor = ((cursor.getY() / window.innerHeight) * 2) - 1;
    }

    destroy(): void {
        this._planets = [];
        this._cursor!.stop();
    }

}


type Point = {
    x: number;
    y: number;
    z: number;
}

type PlanetDraw = CircleDraw | LineDraw;
type CircleDraw = Point & { type: "circle", radius: number, color: RGB };
type LineDraw = { type: "line", z: number, a: Point, b: Point, color: RGB };

class Planet {

    radius: number;
    size: number;
    theta: number;
    deltaTheta: number;
    color: RGB;
    constructor(radius: number, size: number, theta?: number, deltaTheta?: number, color?: RGB) {
        this.radius = Math.min(Math.max(radius, 0), 100);
        this.size = size;
        this.theta = typeof theta === "number" ? theta : (Math.random() * Math.PI * 2);
        this.deltaTheta = typeof deltaTheta === "number" ? deltaTheta : ((Math.pow(Math.random(), 2) * 1.2) + 0.3) * (Math.random() < 0.5 ? 1 : -1);
        this.color = typeof color === "object" ? color : HSV.toRGB(HSV.randomHue());
    }

    rotate(delta: number) {
        this.theta += (this.deltaTheta * delta);
    }

    getPosition(offset: number = 0, perspectiveFactor: number = 0.2): Point {
        let x: number = this.radius * Math.cos(this.theta + offset);
        let y: number = this.radius * Math.sin(this.theta + offset);
        let z: number = y;
        y *= -perspectiveFactor;
        if (y < 0 && perspectiveFactor < 0) z = -z;
        return { x, y, z };
    }

    getScaledSize(z: number): number {
        return this.size * (CAM_DISTANCE / Math.abs(CAM_DISTANCE + z));
    }

}
