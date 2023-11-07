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

import {Mesh, MeshBuilder, MeshGenerator} from "../mesh";
import {Vector, Vector2, Vector3} from "../vector";
import {ICO_VERTEX_DATA, ICO_VERTEX_INDICES} from "./icosahedron";

type Tris = [Vector3, Vector3, Vector3][];
export default class IcoSphereMeshGenerator implements MeshGenerator {

    halfUV: boolean;
    private _subdivisions: number;
    constructor(subdivisions: number = 4, halfUV: boolean = false) {
        this._subdivisions = Math.max(subdivisions, 0);
        this.halfUV = halfUV;
    }

    get subdivisions(): number {
        return this._subdivisions;
    }

    set subdivisions(count: number) {
        this._subdivisions = Math.max(count, 0);
    }

    generate(scale: Vector3 | number): Mesh {
        const mb = new MeshBuilder();

        let tris: Tris = [];
        for (let triple of ICO_VERTEX_INDICES) {
            tris.push(triple.map<Vector3>((idx) => ICO_VERTEX_DATA[idx]));
        }
        for (let i = 0; i < this._subdivisions; i++) tris = IcoSphereMeshGenerator._subdivide(tris);
        for (let i = 0; i < tris.length; i++) {
            mb.addFace(tris[i], tris[i].map<Vector2>((v) => this._computeUV(v)));
        }

        return mb.scale(scale).build();
    }

    private _computeUV(vector: Vector3): Vector2 {
        let lng: number = Math.atan2(vector.z, vector.x);
        if (this.halfUV) {
            lng = ((lng + Math.PI) / Math.PI) % 1;
        } else {
            lng = (lng + Math.PI) / (Math.PI * 2);
        }

        let lat: number;
        if (Math.abs(vector.y) <= 1e-9) {
            lat = 0;
        } else if (Math.abs(vector.y - 1) <= 1e-9) {
            lat = 1;
        } else {
            let radius: number = Math.sqrt(1 - (vector.y * vector.y));
            let ang = Math.atan(vector.y / radius);
            lat = 0.5 - (ang / Math.PI);
        }

        return new Vector2(lng, lat);
    }

    private static _subdivide(tris: Tris): Tris {
        const ret: Tris = [];
        for (let tri of tris) {
            const [ a, b, c ] = tri;
            const ab = Vector.sum(a, b).divide(2).normalize();
            const bc = Vector.sum(b, c).divide(2).normalize();
            const ac = Vector.sum(a, c).divide(2).normalize();
            ret.push([ ab, bc, ac ]);
            ret.push([ a, ab, ac ]);
            ret.push([ b, ab, bc ]);
            ret.push([ c, bc, ac ]);
        }
        return ret;
    }

}
