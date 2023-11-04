import {ShowcaseSlide, ShowcaseSlideParameters} from "../showcase";
import {HSV, RGB} from "../../util/color";
import {absoluteURL} from "../../util/url";


const TARGET_SIZE: number = 256;
const MAZE_SIZE: number = 9;
const Z_FAR: number = 13;
const Z_NEAR: number = 0.25;
const Z_NEAR_SQR: number = Z_NEAR * Z_NEAR;
const CAM_SIZE: number = 0.5;
const WALL_HEIGHT: number = 1.5;

export default class MazeShowcaseSlide implements ShowcaseSlide {

    private _ceilingColor: RGB = RGB.black();
    private _wallColor: RGB = RGB.black();
    private _ceilingImage: LazyImage = new LazyImage("data:image/png;");
    private _wallImage: LazyImage = new LazyImage("data:image/png;");
    private _ceilingImageAlpha: number = 0;
    private _wallImageAlpha: number = 0;
    private _eyePos: Point = [ 0, 0 ];
    private _eyeAngles: number = 0;
    private _movePosStart: Point = [ 0, 0 ];
    private _moveAnglesStart: number = 0;
    private _movePosEnd: Point = [ 0, 0 ];
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
                    const [ dx, dy ] = d.direction;
                    const line: Line = new Line(
                        [ x + 0.5, y + 0.5 ],
                        [ x + 0.5 + dx, y + 0.5 + dy ]
                    );

                    let collides: boolean = false;
                    for (let wall of this._walls) {
                        if (wall.intersection(line) !== null) {
                            collides = true;
                            break;
                        }
                    }

                    if (!collides) this._matrix[my + dy][mx + dx] = 0;
                }
            }
        }

        const center = Math.floor(MAZE_SIZE / 2) + 0.5;
        this._eyePos = this._movePosEnd = [ center, center ];
        this._eyeAngles = this._moveAnglesEnd = 0;
        this._moveProgress = 2;

        const hue: number = Math.random();
        this._ceilingColor = HSV.toRGB([ hue, 1, 1 ]);
        this._wallColor = HSV.toRGB([ (hue + 0.5) % 1, 1, 1 ]);
        this._ceilingImage = LazyImage.random();
        this._wallImage = LazyImage.random();
        this._ceilingImage.startLoading();
        this._wallImage.startLoading();
        this._ceilingImageAlpha = 0;
        this._wallImageAlpha = 0;
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
            this._eyePos = [...this._movePosEnd];
            this._eyeAngles = this._moveAnglesEnd % (Math.PI * 2);

            this._movePosStart = [...this._eyePos];
            this._moveAnglesStart = this._eyeAngles;

            // Compute move end pos
            this._onJunction();

            this._moveProgress = 0;
        } else {
            let u: number = d;
            let v: number = 1 - u;
            this._eyePos = [
                this._movePosStart[0] * v + this._movePosEnd[0] * u,
                this._movePosStart[1] * v + this._movePosEnd[1] * u,
            ];
            u = Math.min(u * 1.5, 1);
            u = (3 * u * u) - (2 * u * u * u);
            v = 1 - u;
            this._eyeAngles = this._moveAnglesStart * v + this._moveAnglesEnd * u;
        }
    }

    private _onJunction() {
        const dirs = getSortedMoveDirections(this._eyeAngles);
        let [ matrixX, matrixY ] = this._getEyeMatrixPos();
        this._boredom[matrixY][matrixX]++;

        let valid: MoveDirection[] = [];
        let allowBackward: boolean = true;
        for (let i=0; i < 4; i++) {
            const dir: MoveDirection = dirs[i];
            let value = this._matrix[matrixY + dir.direction[1]][matrixX + dir.direction[0]];
            if (value) continue;
            if (i < 3) {
                allowBackward = false;
            } else if (!allowBackward) {
                continue;
            }

            const weight = 26 - Math.pow(Math.min(this._boredom[matrixY + dir.direction[1]][matrixX + dir.direction[0]], 4), 2);
            for (let z=0; z < weight; z++) valid.push(dir);
        }

        if (valid.length < 1) {
            this._movePosEnd = [...this._eyePos];
            this._moveAnglesEnd = this._eyeAngles + Math.PI;
            return;
        }

        const choice: MoveDirection = valid[Math.floor(Math.random() * (valid.length - 1))];
        this._movePosEnd = [ this._eyePos[0] + choice.direction[0], this._eyePos[1] + choice.direction[1] ];

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

    private _getEyeMatrixPos(): Point {
        let matrixX = 2 * Math.floor(this._eyePos[0]) + 1;
        let matrixY = 2 * Math.floor(this._eyePos[1]) + 1;
        matrixX = Math.min(Math.max(matrixX, 1), this._matrix.length - 2);
        matrixY = Math.min(Math.max(matrixY, 1), this._matrix.length - 2);
        return [ matrixX, matrixY ];
    }

    private _renderCamera(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, size: number, delta: number) {
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, RGB.toCSS(this._ceilingColor));
        grad.addColorStop(0.5, "black");
        grad.addColorStop(1, RGB.toCSS(this._ceilingColor));

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        if (this._ceilingImage.isAvailable()) {
            const img = this._ceilingImage.get();
            ctx.globalCompositeOperation = "multiply";
            this._ceilingImageAlpha = Math.min(this._ceilingImageAlpha + delta, 1);
            ctx.globalAlpha = this._ceilingImageAlpha;
            for (let y=0; y < size; y++) {
                let imgY = ((y / (size - 1)) % 1) * (img.naturalHeight - 1);
                let distance = 1 - (Math.abs(y - (size * 0.5)) / (size * 0.5));
                let width = (-1 / (distance - 2)) * img.naturalWidth;
                let imgX = (img.naturalWidth - width) / 2;
                ctx.drawImage(img, imgX, imgY, width, 1, 0, y, size, 1);
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

    private _traceParams: { forward: Point, right: Point, camOrigin: Point } = { forward: [1,0], right: [0,-1], camOrigin: [0,0] };
    private _generateTraceParams() {
        const forward: Point = [
            Math.cos(this._eyeAngles),
            Math.sin(this._eyeAngles)
        ];

        const right: Point = [
            forward[1],
            -forward[0]
        ];

        const camOrigin: Point = [
            this._eyePos[0] - (forward[0] * Z_NEAR),
            this._eyePos[1] - (forward[1] * Z_NEAR)
        ];

        this._traceParams = { forward, right, camOrigin };
    }

    private _trace(x: number, resolution: number): ColumnData {
        const { right, camOrigin } = this._traceParams;

        const d: number = (x / (resolution - 1)) - 0.5;
        const rayOrigin: Point = [
            this._eyePos[0] + (right[0] * CAM_SIZE * d),
            this._eyePos[1] + (right[1] * CAM_SIZE * d)
        ];

        const rayNormal: Point = [
            rayOrigin[0] - camOrigin[0],
            rayOrigin[1] - camOrigin[1]
        ];
        const distInCam: number = Math.sqrt(Math.pow(rayNormal[0], 2) + Math.pow(rayNormal[1], 2));
        rayNormal[0] /= distInCam;
        rayNormal[1] /= distInCam;

        const ray: Line = new Line(
            rayOrigin,
            [ rayOrigin[0] + rayNormal[0] * Z_FAR, rayOrigin[1] + rayNormal[1] * Z_FAR ]
        );

        const max: number = Z_FAR * Z_FAR;
        let dist: number = max;
        let u: number = 0;
        let candidate: Point | null;
        for (let wall of this._walls) {
            candidate = ray.intersection(wall);
            if (candidate === null) continue;
            let cu: number = wall.getProgressAlong(candidate);
            let d = Math.pow(candidate[0] - rayOrigin[0], 2) + Math.pow(candidate[1] - rayOrigin[1], 2);
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
            ctx.moveTo(scale * a[0], scale * a[1]);
            ctx.lineTo(scale * b[0], scale * b[1]);
        }
        ctx.stroke();

        const mx: number = scale * this._eyePos[0];
        const my: number = scale * this._eyePos[1];

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
type Point = [ number, number ];
enum LineModeType {
    DIAGONAL,
    HORIZONTAL,
    VERTICAL
}
type LineMode = Readonly<HorizontalLineMode | VerticalLineMode | DiagonalLineMode>;
type HorizontalLineMode = { type: LineModeType.HORIZONTAL, min: number, max: number, n: number, reverse: boolean };
type VerticalLineMode = { type: LineModeType.VERTICAL, min: number, max: number, n: number, reverse: boolean };
type DiagonalLineMode = { type: LineModeType.DIAGONAL, min: number, max: number, m: number, b: number, bbx: boolean, reverse: boolean };
const EPSILON: number = 1e-8;

class Line {

    static equals(a: Line, b: Line): boolean {
        const modeType = a.mode.type;
        if (modeType !== b.mode.type) return false;
        switch (modeType) {
            case LineModeType.DIAGONAL:
                const ad: DiagonalLineMode = a.mode as DiagonalLineMode;
                const bd: DiagonalLineMode = b.mode as DiagonalLineMode;
                return ad.m === bd.m && ad.b === bd.b && ad.min === bd.min && ad.bbx === bd.bbx;
            case LineModeType.VERTICAL:
                const av: VerticalLineMode = a.mode as VerticalLineMode;
                const bv: VerticalLineMode = b.mode as VerticalLineMode;
                return av.min === bv.min && av.max === bv.max && av.n === bv.n;
            case LineModeType.HORIZONTAL:
                const ah: HorizontalLineMode = a.mode as HorizontalLineMode;
                const bh: HorizontalLineMode = b.mode as HorizontalLineMode;
                return ah.min === bh.min && ah.max === bh.max && ah.n === bh.n;
        }
        return a === b;
    }

    readonly mode: LineMode;

    constructor(a: Point, b: Point) {
        const [ ax, ay ] = a;
        const [ bx, by ] = b;
        const dx: number = bx - ax;
        if (Math.abs(dx) <= EPSILON) {
            this.mode = { type: LineModeType.VERTICAL, min: Math.min(ay, by), max: Math.max(ay, by), n: (ax + bx) / 2, reverse: by < ay };
            return;
        }
        const dy: number = by - ay;
        if (Math.abs(dy) <= EPSILON) {
            this.mode = { type: LineModeType.HORIZONTAL, min: Math.min(ax, bx), max: Math.max(ax, bx), n: (ay + by) / 2, reverse: bx < ax };
            return;
        }

        const lm: number = dy / dx;
        const lb: number = ay - (lm * ax);

        if (dx >= dy) {
            this.mode = { type: LineModeType.DIAGONAL, min: Math.min(ax, bx), max: Math.max(ax, bx), m: lm, b: lb, bbx: true, reverse: bx < ax };
        } else {
            this.mode = { type: LineModeType.DIAGONAL, min: Math.min(ay, by), max: Math.max(ay, by), m: lm, b: lb, bbx: false, reverse: by < ay };
        }
    }

    intersection(other: Line): Point | null {
        const { mode } = this;
        switch (mode.type) {
            case LineModeType.DIAGONAL:
                return Line._intersectDX(mode, other.mode);
            case LineModeType.VERTICAL:
                return Line._intersectVX(mode, other.mode);
            case LineModeType.HORIZONTAL:
                return Line._intersectHX(mode, other.mode);
        }
        return null;
    }

    getProgressAlong(point: Point): number {
        let { min, max, reverse } = this.mode;
        let bound: number;
        switch (this.mode.type) {
            case LineModeType.DIAGONAL:
                bound = this.mode.bbx ? point[0] : point[1];
                break;
            case LineModeType.VERTICAL:
                bound = point[1];
                break;
            case LineModeType.HORIZONTAL:
                bound = point[0];
                break;
            default:
                return 0;
        }

        let amt: number = (bound - min) / (max - min);
        amt = Math.min(Math.max(amt, 0), 1);
        if (reverse) amt = 1 - amt;
        return amt;
    }

    toPair(): [ Point, Point ] {
        const { mode } = this;
        switch (mode.type) {
            case LineModeType.DIAGONAL:
                if (mode.bbx) {
                    return [ [ mode.min, mode.m * mode.min + mode.b ], [ mode.max, mode.m * mode.min + mode.b ] ];
                } else {
                    return [ [ (mode.min - mode.b) / mode.m, mode.min ], [ (mode.max - mode.b) / mode.m, mode.max ] ];
                }
            case LineModeType.HORIZONTAL:
                return [ [ mode.min, mode.n ], [ mode.max, mode.n ] ];
            case LineModeType.VERTICAL:
                return [ [ mode.n, mode.min ], [ mode.n, mode.max ] ];
        }
        return [[0,0],[0,0]];
    }

    private static _intersectDX(a: DiagonalLineMode, b: LineMode): Point | null {
        switch (b.type) {
            case LineModeType.DIAGONAL:
                return this._intersectDD(a, b);
            case LineModeType.VERTICAL:
                return this._intersectDV(a, b);
            case LineModeType.HORIZONTAL:
                return this._intersectDH(a, b);
        }
        return null;
    }

    private static _intersectHX(a: HorizontalLineMode, b: LineMode): Point | null {
        switch (b.type) {
            case LineModeType.DIAGONAL:
                return this._intersectDH(b, a);
            case LineModeType.VERTICAL:
                return this._intersectHV(a, b);
            case LineModeType.HORIZONTAL:
                return this._intersectHHVV(a, b);
        }
        return null;
    }

    private static _intersectVX(a: VerticalLineMode, b: LineMode): Point | null {
        switch (b.type) {
            case LineModeType.DIAGONAL:
                return this._intersectDV(b, a);
            case LineModeType.VERTICAL:
                return this._intersectHHVV(a, b);
            case LineModeType.HORIZONTAL:
                return this._intersectHV(b, a);
        }
        return null;
    }

    private static _intersectHV(a: HorizontalLineMode, b: VerticalLineMode): Point | null {
        if (b.n < a.min || b.n > a.max) return null;
        if (a.n < b.min || a.n > b.max) return null;
        return [ b.n, a.n ];
    }

    private static _intersectHHVV<T extends HorizontalLineMode | VerticalLineMode>(a: T, b: T): Point | null {
        let [ lo, hi ] = [ Math.max(a.min, b.min), Math.min(a.max, b.max) ];
        if (lo > hi) return null;
        if (Math.abs(a.n - b.n) > EPSILON) return null;

        let ret: Point = [ (lo + hi) / 2, (a.n + b.n) / 2 ];
        if (a.type == LineModeType.VERTICAL) ret = [ ret[1], ret[0] ];
        return ret;
    }

    private static _intersectDD(a: DiagonalLineMode, b: DiagonalLineMode): Point | null {
        const x: number = (b.b - a.b) / (a.m - b.m);
        const y: number = a.m * x + a.b;
        if (!this._inBoundsD(a, x, y)) return null;
        if (!this._inBoundsD(b, x, y)) return null;
        return [ x, y ];
    }

    private static _intersectDH(a: DiagonalLineMode, b: HorizontalLineMode): Point | null {
        const y: number = b.n;
        const x: number = (y - a.b) / a.m;
        if (x < b.min || x > b.max) return null;
        if (!this._inBoundsD(a, x, y)) return null;
        return [ x, y ];
    }

    private static _intersectDV(a: DiagonalLineMode, b: VerticalLineMode): Point | null {
        const x: number = b.n;
        const y: number = (a.m * x) + a.b;
        if (y < b.min || y > b.max) return null;
        if (!this._inBoundsD(a, x, y)) return null;
        return [ x, y ];
    }

    private static _inBoundsD(a: DiagonalLineMode, x: number, y: number): boolean {
        if (a.bbx) {
            if (x < a.min || x > a.max) return false;
        } else {
            if (y < a.min || y > a.max) return false;
        }
        return true;
    }

}

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
                output.push(new Line([this.x + asize, this.y + space], [this.x + asize, this.y + space + 1]));
            } else {
                output.push(new Line([this.x + space, this.y + asize], [this.x + space + 1, this.y + asize]));
            }
        }

        return ret;
    }

    getOutline(): Line[] {
        const ret: Line[] = [];
        for (let xv=0; xv < this.w; xv++) {
            ret.push(new Line([this.x + xv, this.y], [this.x + xv + 1, this.y]));
            ret.push(new Line([this.x + xv, this.y + this.h], [this.x + xv + 1, this.y + this.h]));
        }
        for (let yv=0; yv < this.h; yv++) {
            ret.push(new Line([this.x, this.y + yv], [this.x, this.y + yv + 1]));
            ret.push(new Line([this.x + this.w, this.y + yv], [this.x + this.w, this.y + yv + 1]));
        }
        return ret;
    }

}

type MoveDirection = {
    readonly angle: number,
    readonly direction: [number, number]
};
const MoveDirections: [MoveDirection, MoveDirection, MoveDirection, MoveDirection] = [ // +X +Y -X -Y
    {
        angle: 0,
        direction: [ 1, 0 ]
    },
    {
        angle: Math.PI / 2,
        direction: [ 0, 1 ]
    },
    {
        angle: Math.PI,
        direction: [ -1, 0 ]
    },
    {
        angle: Math.PI * 3 / 2,
        direction: [ 0, -1 ]
    }
];

function getSortedMoveDirections(angle: number): [ MoveDirection, MoveDirection, MoveDirection, MoveDirection ] {
    const twoPi: number = Math.PI * 2;
    while (angle < 0) angle += twoPi;
    const norm: number = (angle % twoPi) * (200 / twoPi);

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
class LazyImage {

    readonly url: string
    private _init: boolean = false;
    private _value: HTMLImageElement | null = null;
    private _available: boolean = false;

    constructor(url: string) {
        this.url = url;
    }

    startLoading() {
        this._init = true;

        const me = this;
        const img: HTMLImageElement = (typeof Image === "function") ? new Image() : document.createElement("img");
        img.onload = function () {
            if (!me._init) return;
            me._value = img;
            me._available = true;
        };
        img.src = absoluteURL(this.url);
    }

    isAvailable() {
        return this._available;
    }

    get(): HTMLImageElement {
        return this._value!;
    }

    destroy() {
        this._available = false;
        this._value = null;
        this._init = false;
    }

    static random(): LazyImage {
        const choice: string = MAZE_IMAGES[Math.floor(Math.random() * MAZE_IMAGES.length)];
        return new LazyImage(`assets/images/maze/${choice}.jpg`);
    }

}
