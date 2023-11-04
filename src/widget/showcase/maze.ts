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
import KeyStore from "../../struct/keystore";
import {Vector, Vector2} from "../../math/vector";
import {LazyImage} from "../../struct/asset";
import Line from "../../math/line";


const TARGET_SIZE: number = 256;
const MAZE_SIZE: number = 9;
const Z_FAR: number = 13;
const Z_NEAR: number = 0.25;
const Z_NEAR_SQR: number = Z_NEAR * Z_NEAR;
const CAM_SIZE: number = 0.5;
const WALL_HEIGHT: number = 1.5;
const mod = (a: number, b: number) => ((a % b) + b) % b;

export default class MazeShowcaseSlide implements ShowcaseSlide {

    private _ceilingColor: RGB = RGB.black();
    private _wallColor: RGB = RGB.black();
    private _ceilingImage: LazyImage = new LazyImage("data:image/png;");
    private _wallImage: LazyImage = new LazyImage("data:image/png;");
    private _ceilingImageAlpha: number = 0;
    private _wallImageAlpha: number = 0;
    private _eyePos: Vector2 = new Vector2();
    private _eyeAngles: number = 0;
    private _movePosStart: Vector2 = new Vector2();
    private _moveAnglesStart: number = 0;
    private _movePosEnd: Vector2 = new Vector2();
    private _moveAnglesEnd: number = 0;
    private _moveProgress: number = 2;
    private _walls: Line[] = [];
    private _matrix: NBool[][] = [];
    private _boredom: number[][] = [];

    init(param: ShowcaseSlideParameters): void {
        const rootCell = new MazeCell(0, 0, MAZE_SIZE, MAZE_SIZE);
        this._walls = [...rootCell.getOutline()];
        const cells: MazeCell[] = [ rootCell ];
        while (cells.length > 0) {
            const cell: MazeCell = cells.shift()!;
            cells.push(...cell.split(this._walls));
        }

        this._matrix = [];
        this._boredom = [];
        const matrixSize = (2 * MAZE_SIZE) + 1;
        const line: NBool[] = [];
        for (let i=0; i < matrixSize; i++) line[i] = 1;
        for (let i=0; i < matrixSize; i++) {
            this._matrix[i] = [...line];
            this._boredom[i] = [...line];
        }
        for (let x=0; x < MAZE_SIZE; x++) {
            const mx: number = 2 * x + 1;
            for (let y=0; y < MAZE_SIZE; y++) {
                const my: number = 2 * y + 1;
                this._matrix[my][mx] = 0;

                for (let d of MoveDirections) {
                    const v = d.vector;
                    const line: Line = Line.of(
                        x + 0.5, y + 0.5,
                        x + 0.5 + v.x, y + 0.5 + v.y
                    );

                    let collides: boolean = false;
                    for (let wall of this._walls) {
                        if (wall.intersection(line) !== null) {
                            collides = true;
                            break;
                        }
                    }

                    if (!collides) this._matrix[my + v.y][mx + v.x] = 0;
                }
            }
        }

        const center = Math.floor(MAZE_SIZE / 2) + 0.5;
        this._eyePos = this._movePosEnd = new Vector2(center, center);
        this._eyeAngles = this._moveAnglesEnd = 0;
        this._moveProgress = 2;

        const hue: number = Math.random();
        this._ceilingColor = HSV.toRGB([ hue, 1, 1 ]);
        this._wallColor = HSV.toRGB([ (hue + 0.5) % 1, 1, 1 ]);
        this._ceilingImage = randomImage();
        this._wallImage = randomImage(true);
        this._ceilingImage.startLoading();
        this._wallImage.startLoading();
        this._ceilingImageAlpha = 0;
        this._wallImageAlpha = 0;
        this._ceilingScroll = 0;
    }

    render(param: ShowcaseSlideParameters, delta: number, age: number): void {
        const { ctx, canvas, widget } = param;
        const rtSize: number = Math.min(TARGET_SIZE, canvas.width, canvas.height);

        const dim = Math.max(canvas.width, canvas.height);
        let padLeft = (dim - canvas.width) / 2;
        let padTop = (dim - canvas.height) / 2;

        let activeCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D = ctx;
        let postRender: (() => void);
        if (widget.offscreenRt.isValid()) {
            const offscreen: OffscreenCanvas = widget.offscreenRt.params!.canvas as OffscreenCanvas;
            activeCtx = widget.offscreenRt.params!.ctx;

            postRender = (() => {
                // const smooth = ctx.imageSmoothingEnabled;
                // ctx.imageSmoothingEnabled = false;
                ctx.drawImage(offscreen, 0, 0, rtSize, rtSize, -padLeft, -padTop, dim, dim);
                // ctx.imageSmoothingEnabled = smooth;
            });
        } else {
            const oldTransform = ctx.getTransform();
            ctx.setTransform(dim / rtSize, 0, 0, dim / rtSize, -padLeft, -padTop);
            postRender = (() => {
                ctx.setTransform(oldTransform);
            });
        }

        this._updateCamera(delta);
        try {
            this._renderCamera(activeCtx, rtSize, delta);
        } finally {
            postRender();
        }

        const mapSize: number = Math.min(canvas.width, canvas.height) * 0.15;
        const trim: number = mapSize * 0.05;
        const mapX: number = (canvas.width - mapSize) / 2;
        const mapY: number = trim * 2;

        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.fillRect(mapX - trim, mapY - trim, mapSize + (trim * 2), mapSize + (trim * 2));
        const tform = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, mapX, mapY);
        this._renderMap(ctx, mapSize);
        ctx.setTransform(tform);
    }

    private _updateCamera(delta: number) {
        this._moveProgress += delta * 1.6;

        const d: number = this._moveProgress;
        if (d >= 1) {
            this._eyePos = this._movePosEnd.copy();
            this._eyeAngles = mod(this._moveAnglesEnd, Math.PI * 2);

            this._movePosStart = this._eyePos.copy();
            this._moveAnglesStart = this._eyeAngles;

            // Compute move end pos
            this._onJunction();

            this._moveProgress = 0;
        } else {
            this._eyePos = Vector.lerp(this._movePosStart, this._movePosEnd, d);
            let u: number = Math.min(d * 1.5, 1);
            u = (3 * u * u) - (2 * u * u * u);
            let v: number = 1 - u;
            this._eyeAngles = this._moveAnglesStart * v + this._moveAnglesEnd * u;
        }
    }

    private _onJunction() {
        const dirs = getSortedMoveDirections(this._eyeAngles);
        let mp = this._getEyeMatrixPos();
        this._boredom[mp.y][mp.x]++;

        let valid: MoveDirection[] = [];
        let allowBackward: boolean = true;
        for (let i=0; i < 4; i++) {
            const dir: MoveDirection = dirs[i];
            let value = this._matrix[mp.y + dir.vector.y][mp.x + dir.vector.x];
            if (value) continue;
            if (i < 3) {
                allowBackward = false;
            } else if (!allowBackward) {
                continue;
            }

            const weight = 26 - Math.pow(Math.min(this._boredom[mp.y + dir.vector.y][mp.x + dir.vector.x], 4), 2);
            for (let z=0; z < weight; z++) valid.push(dir);
        }

        if (valid.length < 1) {
            this._movePosEnd = this._eyePos.copy();
            this._moveAnglesEnd = this._eyeAngles + Math.PI;
            return;
        }

        const choice: MoveDirection = valid[Math.floor(Math.random() * (valid.length - 1))];
        this._movePosEnd = Vector.sum(this._eyePos, choice.vector);

        const twoPi: number = Math.PI * 2;
        const angleCandidates: number[] = [ choice.angle - twoPi, choice.angle, choice.angle + twoPi ];
        let min: number = angleCandidates[0];
        let minDiff: number = Number.POSITIVE_INFINITY;
        for (let i=0; i < angleCandidates.length; i++) {
            const diff: number = Math.abs(angleCandidates[i] - this._eyeAngles);
            if (diff < minDiff) {
                minDiff = diff;
                min = angleCandidates[i];
            }
        }
        this._moveAnglesEnd = min;
    }

    private _getEyeMatrixPos(): Vector2 {
        let matrixX = 2 * Math.floor(this._eyePos.x) + 1;
        let matrixY = 2 * Math.floor(this._eyePos.y) + 1;
        matrixX = Math.min(Math.max(matrixX, 1), this._matrix.length - 2);
        matrixY = Math.min(Math.max(matrixY, 1), this._matrix.length - 2);
        return new Vector2(matrixX, matrixY);
    }

    private _ceilingScroll: number = 0;
    private _renderCamera(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, size: number, delta: number) {
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, RGB.toCSS(this._ceilingColor));
        grad.addColorStop(0.5, "black");
        grad.addColorStop(1, RGB.toCSS(this._ceilingColor));

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        this._ceilingScroll = (this._ceilingScroll + delta * 0.135) % 1;
        let hScroll: number = mod(-this._eyeAngles, Math.PI) / Math.PI;
        if (this._ceilingImage.isAvailable()) {
            const img = this._ceilingImage.get();
            let tex: CanvasImageSource;
            let isGrid: boolean = false;

            const g = this._ceilingImage.getGrid(2, 1);
            if (!!g) {
                tex = g;
                isGrid = true;
            } else {
                tex = img;
            }

            ctx.globalCompositeOperation = "multiply";
            this._ceilingImageAlpha = Math.min(this._ceilingImageAlpha + delta, 1);
            ctx.globalAlpha = this._ceilingImageAlpha;
            for (let y=0; y < size; y++) {
                let scroll: number = (y < size / 2) ? this._ceilingScroll : (1 - this._ceilingScroll);
                let imgY = ((y / (size - 1) + scroll) % 1) * (img.naturalHeight - 1);
                let distance = 1 - (Math.abs(y - (size * 0.5)) / (size * 0.5));
                let width = (-1 / (distance - 2)) * img.naturalWidth;
                let imgX = (img.naturalWidth - width) / 2;
                ctx.drawImage(tex, imgX + (isGrid ? (img.naturalWidth * hScroll) : 0), imgY, width, 1, 0, y, size, 1);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
        }

        this._generateTraceParams();
        if (this._wallImage.isAvailable()) {
            this._wallImageAlpha = Math.min(this._wallImageAlpha + delta, 1);
        }
        for (let x=0; x < size; x++) {
            const dat = this._trace(x, size);
            if (!dat.valid) continue;

            let { height, light, textureLoc } = dat;
            ctx.fillStyle = RGB.toCSS(RGB.lerp(this._wallColor, RGB.black(), 1 - light));
            ctx.fillRect(x, Math.floor((size - height) / 2), 1, height);

            if (this._wallImage.isAvailable()) {
                const img = this._wallImage.get();
                const imgX: number = textureLoc * (img.naturalWidth - 1);

                ctx.globalCompositeOperation = "multiply";
                ctx.globalAlpha = this._wallImageAlpha;
                ctx.drawImage(img, imgX, 0, 1, img.naturalHeight, x, Math.floor((size - height) / 2), 1, height );
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = "source-over";
            }
        }
    }

    private _traceParams: { forward: Vector2, right: Vector2, camOrigin: Vector2 } = { forward: new Vector2(1, 0), right: new Vector2(0, -1), camOrigin: new Vector2() };
    private _generateTraceParams() {
        const forward: Vector2 = Vector2.fromAngle(this._eyeAngles);
        const right: Vector2 = forward.getRight();
        const camOrigin: Vector2 = Vector.difference(this._eyePos, Vector.product(forward, Z_NEAR));
        this._traceParams = { forward, right, camOrigin };
    }

    private _trace(x: number, resolution: number): ColumnData {
        const { right, camOrigin } = this._traceParams;

        const d: number = (x / (resolution - 1)) - 0.5;
        const rayOrigin: Vector2 = Vector.sum(this._eyePos, Vector.product(right, CAM_SIZE * d));

        const rayNormal: Vector2 = Vector.difference(rayOrigin, camOrigin);
        const distInCam: number = Math.sqrt(Math.pow(rayNormal.x, 2) + Math.pow(rayNormal.y, 2));
        rayNormal.divide(distInCam);

        const ray: Line = new Line(
            rayOrigin,
            Vector.sum(rayOrigin, Vector.product(rayNormal, Z_FAR))
        );

        const max: number = Z_FAR * Z_FAR;
        let dist: number = max;
        let u: number = 0;
        let candidate: Vector2 | null;
        for (let wall of this._walls) {
            candidate = ray.intersection(wall);
            if (candidate === null) continue;
            let cu: number = wall.getProgressAlong(candidate);
            let d = Math.pow(candidate.x - rayOrigin.x, 2) + Math.pow(candidate.y - rayOrigin.y, 2);
            if (d <= Z_NEAR_SQR) return { valid: true, textureLoc: cu, height: resolution, light: 1 };
            if (d < dist) {
                dist = d;
                u = cu;
            }
        }
        if (dist >= max) return { valid: false };
        dist = Math.sqrt(dist);

        const slope: number = WALL_HEIGHT / (dist + distInCam);
        const height: number = slope * distInCam * resolution;

        return { valid: true, textureLoc: u, height, light: Math.min(1 / (dist * 2), 1) };
    }

    private _renderMap(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, size: number) {
        const scale = size / MAZE_SIZE;

        ctx.beginPath();
        for (let wall of this._walls) {
            const [ a, b ] = wall.toPair();
            ctx.moveTo(scale * a.x, scale * a.y);
            ctx.lineTo(scale * b.x, scale * b.y);
        }
        ctx.stroke();

        const mx: number = scale * this._eyePos.x;
        const my: number = scale * this._eyePos.y;

        const FOV = Math.atan((0.5 * CAM_SIZE) / Z_NEAR);
        const [ lcx, lcy ] = [ scale * 2 * Math.cos(this._eyeAngles - FOV), scale * 2 * Math.sin(this._eyeAngles - FOV) ];
        const [ rcx, rcy ] = [ scale * 2 * Math.cos(this._eyeAngles + FOV), scale * 2 * Math.sin(this._eyeAngles + FOV) ];
        const grad = ctx.createLinearGradient(mx, my, mx + (lcx + rcx) / 2, my + (lcy + rcy) / 2);
        grad.addColorStop(0, "rgba(0, 255, 0, 0.8)");
        grad.addColorStop(1, "rgba(0, 255, 0, 0.2)");
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + lcx, my + lcy);
        ctx.lineTo(mx + rcx, my + rcy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(mx, my, scale * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }

    destroy(): void {
        this._walls.splice(0);
        this._matrix.splice(0);
        this._boredom.splice(0);
        this._ceilingImage.destroy();
        this._wallImage.destroy();
    }

}

type NBool = 0 | 1;
type ColumnData = { valid: true, height: number, light: number, textureLoc: number } | { valid: false };

class MazeCell {

    x: number;
    y: number;
    w: number;
    h: number;
    hbias: boolean;
    constructor(x: number, y: number, w: number, h: number, hbias: boolean = true) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.hbias = hbias;
    }

    split(output: Line[]): MazeCell[] {
        let vertical: boolean;
        if (this.hbias) {
            vertical = this.w > 1;
        } else {
            vertical = this.h < 2;
        }

        let dimension: number = vertical ? this.w : this.h;
        let otherDimension: number = vertical ? this.h : this.w;
        let asize: number = Math.floor(Math.random() * (dimension - 1)) + 1;
        let bsize: number = dimension - asize;

        const ret: MazeCell[] = [];
        if (asize > 1 || otherDimension > 1) {
            if (vertical) {
                ret.push(new MazeCell(this.x, this.y, asize, this.h, !this.hbias));
            } else {
                ret.push(new MazeCell(this.x, this.y, this.w, asize, !this.hbias));
            }
        }
        if (bsize > 1 || otherDimension > 1) {
            if (vertical) {
                ret.push(new MazeCell(this.x + asize, this.y, bsize, this.h, !this.hbias));
            } else {
                ret.push(new MazeCell(this.x, this.y + asize, this.w, bsize, !this.hbias));
            }
        }

        let spaces: number[] = [];
        for (let i=0; i < otherDimension; i++) spaces.push(i);
        spaces.splice(Math.floor(Math.random() * spaces.length), 1);

        for (let space of spaces) {
            if (vertical) {
                output.push(Line.of(this.x + asize, this.y + space, this.x + asize, this.y + space + 1));
            } else {
                output.push(Line.of(this.x + space, this.y + asize, this.x + space + 1, this.y + asize));
            }
        }

        return ret;
    }

    getOutline(): Line[] {
        const ret: Line[] = [];
        for (let xv=0; xv < this.w; xv++) {
            ret.push(Line.of(this.x + xv, this.y, this.x + xv + 1, this.y));
            ret.push(Line.of(this.x + xv, this.y + this.h, this.x + xv + 1, this.y + this.h));
        }
        for (let yv=0; yv < this.h; yv++) {
            ret.push(Line.of(this.x, this.y + yv, this.x, this.y + yv + 1));
            ret.push(Line.of(this.x + this.w, this.y + yv, this.x + this.w, this.y + yv + 1));
        }
        return ret;
    }

}

type MoveDirection = {
    readonly angle: number,
    readonly vector: Vector2
};
const MoveDirections: [MoveDirection, MoveDirection, MoveDirection, MoveDirection] = [ // +X +Y -X -Y
    {
        angle: 0,
        vector: new Vector2(1, 0)
    },
    {
        angle: Math.PI / 2,
        vector: new Vector2(0, 1)
    },
    {
        angle: Math.PI,
        vector: new Vector2(-1, 0)
    },
    {
        angle: Math.PI * 3 / 2,
        vector: new Vector2(0, -1)
    }
];

function getSortedMoveDirections(angle: number): [ MoveDirection, MoveDirection, MoveDirection, MoveDirection ] {
    const twoPi: number = Math.PI * 2;
    const norm: number = mod(angle, twoPi) * (200 / twoPi);

    if (norm <= 25 || norm >= 175) {
        return [ MoveDirections[0], MoveDirections[3], MoveDirections[1], MoveDirections[2] ];
    }
    if (norm <= 75) {
        return [ MoveDirections[1], MoveDirections[0], MoveDirections[2], MoveDirections[3] ];
    }
    if (norm <= 125) {
        return [ MoveDirections[2], MoveDirections[1], MoveDirections[3], MoveDirections[0] ];
    }
    return [ MoveDirections[3], MoveDirections[2], MoveDirections[0], MoveDirections[1] ];
}

const MAZE_IMAGES: string[] = [ "bricks", "grating1", "grating2", "metal", "sky", "weave" ];
function randomImage(wall: boolean = false): LazyImage {
    let choice: string;
    if (wall && Math.random() <= 0.01 && KeyStore.hasKey()) {
        choice = "creature";
    } else {
        choice = MAZE_IMAGES[Math.floor(Math.random() * MAZE_IMAGES.length)];
    }
    return new LazyImage(`assets/images/maze/${choice}.jpg`);
}
