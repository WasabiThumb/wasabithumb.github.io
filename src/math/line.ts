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

import {Vector2} from "./vector";

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

export default class Line {

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

    static of(x1: number, y1: number, x2: number, y2: number): Line {
        return new Line(new Vector2(x1, y1), new Vector2(x2, y2));
    }

    readonly mode: LineMode;

    constructor(a: Vector2, b: Vector2) {
        const [ ax, ay ] = [ a.x, a.y ];
        const [ bx, by ] = [ b.x, b.y ];

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

    intersection(other: Line): Vector2 | null {
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

    getProgressAlong(point: Vector2): number {
        let { min, max, reverse } = this.mode;
        let bound: number;
        switch (this.mode.type) {
            case LineModeType.DIAGONAL:
                bound = this.mode.bbx ? point.x : point.y;
                break;
            case LineModeType.VERTICAL:
                bound = point.y;
                break;
            case LineModeType.HORIZONTAL:
                bound = point.x;
                break;
            default:
                return 0;
        }

        let amt: number = (bound - min) / (max - min);
        amt = Math.min(Math.max(amt, 0), 1);
        if (reverse) amt = 1 - amt;
        return amt;
    }

    toPair(): [ Vector2, Vector2 ] {
        const { mode } = this;
        switch (mode.type) {
            case LineModeType.DIAGONAL:
                if (mode.bbx) {
                    return [ new Vector2(mode.min, mode.m * mode.min + mode.b), new Vector2(mode.max, mode.m * mode.min + mode.b) ];
                } else {
                    return [ new Vector2((mode.min - mode.b) / mode.m, mode.min), new Vector2((mode.max - mode.b) / mode.m, mode.max) ];
                }
            case LineModeType.HORIZONTAL:
                return [ new Vector2(mode.min, mode.n), new Vector2(mode.max, mode.n) ];
            case LineModeType.VERTICAL:
                return [ new Vector2(mode.n, mode.min), new Vector2(mode.n, mode.max) ];
        }
        return [new Vector2(), new Vector2()];
    }

    private static _intersectDX(a: DiagonalLineMode, b: LineMode): Vector2 | null {
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

    private static _intersectHX(a: HorizontalLineMode, b: LineMode): Vector2 | null {
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

    private static _intersectVX(a: VerticalLineMode, b: LineMode): Vector2 | null {
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

    private static _intersectHV(a: HorizontalLineMode, b: VerticalLineMode): Vector2 | null {
        if (b.n < a.min || b.n > a.max) return null;
        if (a.n < b.min || a.n > b.max) return null;
        return new Vector2(b.n, a.n);
    }

    private static _intersectHHVV<T extends HorizontalLineMode | VerticalLineMode>(a: T, b: T): Vector2 | null {
        let [ lo, hi ] = [ Math.max(a.min, b.min), Math.min(a.max, b.max) ];
        if (lo > hi) return null;
        if (Math.abs(a.n - b.n) > EPSILON) return null;

        let ret: Vector2;
        if (a.type == LineModeType.VERTICAL) {
            ret = new Vector2((a.n + b.n) / 2, (lo + hi) / 2);
        } else {
            ret = new Vector2((lo + hi) / 2, (a.n + b.n) / 2);
        }
        return ret;
    }

    private static _intersectDD(a: DiagonalLineMode, b: DiagonalLineMode): Vector2 | null {
        const x: number = (b.b - a.b) / (a.m - b.m);
        const y: number = a.m * x + a.b;
        if (!this._inBoundsD(a, x, y)) return null;
        if (!this._inBoundsD(b, x, y)) return null;
        return new Vector2(x, y);
    }

    private static _intersectDH(a: DiagonalLineMode, b: HorizontalLineMode): Vector2 | null {
        const y: number = b.n;
        const x: number = (y - a.b) / a.m;
        if (x < b.min || x > b.max) return null;
        if (!this._inBoundsD(a, x, y)) return null;
        return new Vector2(x, y);
    }

    private static _intersectDV(a: DiagonalLineMode, b: VerticalLineMode): Vector2 | null {
        const x: number = b.n;
        const y: number = (a.m * x) + a.b;
        if (y < b.min || y > b.max) return null;
        if (!this._inBoundsD(a, x, y)) return null;
        return new Vector2(x, y);
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
