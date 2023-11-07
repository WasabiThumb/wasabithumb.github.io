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

import {Vector, Vector2, Vector3} from "./vector";
import Line from "./line";
import Quaternion from "./quaternion";

export class Triangle<T extends Vector2 | Vector3> {

    a: T;
    b: T;
    c: T;
    constructor(a: T, b: T, c: T) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    copy(): Triangle<T> {
        return new Triangle<T>(this.a.copy() as T, this.b.copy() as T, this.c.copy() as T);
    }

    set(...points: T[]): Triangle<T> {
        if (points.length < 1) return this;
        this.a = points[0];
        if (points.length < 2) return this;
        this.b = points[1];
        if (points.length < 3) return this;
        this.c = points[2];
        return this;
    }

    update(operator: (point: T) => T): Triangle<T> {
        this.a = operator(this.a);
        this.b = operator(this.b);
        this.c = operator(this.c);
        return this;
    }

    map<V extends Vector2 | Vector3>(operator: (point: T) => V): Triangle<V> {
        const points: V[] = this.toArray().map(operator);
        if (points[0].dimensions === 3) {
            return new Triangle<Vector3>(...(points as Vector3[])) as Triangle<V>;
        } else {
            return new Triangle<Vector2>(...(points as Vector2[])) as Triangle<V>;
        }
    }

    transformed(translation: Vector3, rotation: Quaternion): Tri {
        const tri: Tri = this.to3D();
        tri.update((point) => {
            return rotation.rotate(point).add(translation);
        });
        return tri;
    }

    toArray(): T[] {
        return [ this.a, this.b, this.c ];
    }

    toLineArray(): Line[] {
        const tri: Tri2D = this.to2D();
        return [
            new Line(tri.a, tri.b),
            new Line(tri.b, tri.c),
            new Line(tri.c, tri.a)
        ];
    }

    to3D(z: number = 0): Tri {
        const conv: ((v: Vector2 | Vector3) => Vector3) = ((v) => {
            if (v.dimensions === 3) return (v as Vector3).copy();
            return new Vector3(v.x, v.y, z);
        });
        return new Triangle<Vector3>(conv(this.a), conv(this.b), conv(this.c));
    }

    to2D(): Tri2D {
        const conv: ((v: Vector2 | Vector3) => Vector2) = ((v) => {
            if (v.dimensions === 2) return (v as Vector2).copy();
            return new Vector2(v.x, v.y);
        });
        return new Triangle<Vector2>(conv(this.a), conv(this.b), conv(this.c));
    }

    computeCenter(): T {
        return this.toArray().reduce((a, b) => Vector.sum(a, b) as T).divide(3);
    }

    sqrDistFrom(point: T): number {
        const ray = this.computeCenter().subtract(point);
        return ray.normSqr();
    }

}

export type Tri = Triangle<Vector3>;
export namespace Tri {
    export function zero(): Tri {
        return new Triangle<Vector3>(new Vector3(), new Vector3(), new Vector3());
    }
}

export type Tri2D = Triangle<Vector2>;
export namespace Tri2D {
    export function zero(): Tri2D {
        return new Triangle<Vector2>(new Vector2(), new Vector2(), new Vector2());
    }

    export function defaultUV(): Tri2D {
        return new Triangle<Vector2>(new Vector2(0, 1), new Vector2(0.5, 0), new Vector2(1, 1));
    }
}
