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


import {Vector, Vector3} from "./vector";


enum QuaternionFlags {
    UNIT = 1,
    IDENTITY = 2
}

export default class Quaternion extends Vector {

    static DOT_THRESHOLD: number = 0.9995;

    static identity(): Quaternion {
        return new Quaternion(1, 0, 0, 0, QuaternionFlags.UNIT | QuaternionFlags.IDENTITY);
    }

    static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
        let dot: number = a.dot(b);

        if (dot > this.DOT_THRESHOLD) {
            const result = new Quaternion(
                a.w + t * (b.w - a.w),
                a.x + t * (b.x - a.x),
                a.y + t * (b.y - a.y),
                a.z + t * (b.z - a.z),
                0
            );
            result.normalize();
            return result;
        }

        dot = Math.min(Math.max(dot, -1), 1);
        const theta: number = Math.acos(dot) * t;

        const c = new Quaternion(
            b.w - (a.w * dot),
            b.x - (a.x * dot),
            b.y - (a.y * dot),
            b.z - (a.z * dot),
            0
        );
        c.normalize();

        const [ ct, st ] = [ Math.cos(theta), Math.sin(theta) ];
        return new Quaternion(
            a.w * ct + c.w * st,
            a.x * ct + c.x * st,
            a.y * ct + c.y * st,
            a.z * ct + c.z * st,
            a._flags | b._flags
        );
    }

    static fromEuler(roll: number, pitch: number, yaw: number): Quaternion {
        roll *= 0.5;
        const [ cr, sr ] = [ Math.cos(roll), Math.sin(roll) ];
        pitch *= 0.5;
        const [ cp, sp ] = [ Math.cos(pitch), Math.sin(pitch) ];
        yaw *= 0.5;
        const [ cy, sy ] = [ Math.cos(yaw), Math.sin(yaw) ];

        const ret = new Quaternion(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
            QuaternionFlags.UNIT
        );
        ret._checkIdentity();
        return ret;
    }

    readonly dimensions: number = 4;
    private _flags: number = 0;
    constructor(w: number = 1, x: number = 0, y: number = 0, z: number = 0, flags?: number) {
        super();
        if (typeof flags === "number") {
            this.setComponentsUnsafe([ w, x, y, z ]);
            this._flags = flags & 3;
        } else {
            this.components = [ w, x, y, z ];
        }
    }

    get w(): number {
        return this.getComponent(0);
    }
    set w(w: number) {
        this.setComponent(0, w);
    }

    get x(): number {
        return this.getComponent(1);
    }
    set x(x: number) {
        this.setComponent(1, x);
    }

    get y(): number {
        return this.getComponent(2);
    }
    set y(y: number) {
        this.setComponent(2, y);
    }

    get z(): number {
        return this.getComponent(3);
    }
    set z(z: number) {
        this.setComponent(3, z);
    }

    get scalarPart(): number {
        return this.w;
    }
    set scalarPart(scalar: number) {
        this.w = scalar;
    }

    get vectorPart(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
    set vectorPart(vector: Vector3) {
        this.components = [ this.w, vector.x, vector.y, vector.z ];
    }

    copy(): Quaternion {
        return new Quaternion(this.w, this.x, this.y, this.z);
    }

    isUnit(): boolean {
        return (this._flags & QuaternionFlags.UNIT) !== 0;
    }

    isIdentity(): boolean {
        return (this._flags & QuaternionFlags.IDENTITY) !== 0;
    }

    normalize<T extends this>(): T {
        if (this.isUnit()) return this as T;
        return super.normalize();
    }

    protected _callOnModified() {
        this._flags = 0;
        if (Math.abs(this.normSqr() - 1) <= 1e-9) {
            this._flags |= QuaternionFlags.UNIT;
            this._checkIdentity();
        }
    }

    private _checkIdentity() {
        if (Math.abs(this.w - 1) <= 1e-9 &&
            Math.abs(this.x) <= 1e-9 &&
            Math.abs(this.y) <= 1e-9 &&
            Math.abs(this.z) <= 1e-9
        ) {
            this._flags |= QuaternionFlags.IDENTITY;
        }
    }

    rotate(v: Vector3): Vector3 {
        if (this.isIdentity()) return v.copy();
        let unit = (this.isUnit()) ? this : this.normalize();
        const u = unit.vectorPart;
        const s = unit.scalarPart;

        return Vector.product(u, u.dot(v) * 2)
            .add(Vector.product(v, s * s - u.normSqr()))
            .add(u.cross(v).multiply(s * 2));
    }

    multiply<T extends this>(b: Vector | number): T {
        if (typeof b === "object" && b instanceof Quaternion) {
            const { w, x, y, z } = this;
            return new Quaternion(
                w * b.w - x * b.x - y * b.y - z * b.z,
                w * b.x + x * b.w + y * b.z - z * b.y,
                w * b.y - x * b.z + y * b.w + z * b.x,
                w * b.z + x * b.y - y * b.x + z * b.w,
                this._flags | b._flags
            ) as T;
        }
        return super.multiply(b);
    }

    inverse(): Quaternion {
        let ret = new Quaternion(this.w, -this.x, -this.y, -this.z);
        if (!this.isUnit()) {
            const normSqr = this.normSqr();
            if (normSqr > 1e-9) ret.divide(Math.sqrt(normSqr));
        }
        return ret;
    }

}
