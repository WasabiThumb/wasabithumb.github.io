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

import {Vector3} from "../vector";
import {Mesh, MeshBuilder, MeshGenerator} from "../mesh";

// Big thanks to this impl: https://github.com/anishagartia/Icosahedron_OpenGL/blob/master/icosahedron.cc#L30C40-L30C40

const X: number = 0.525731112119133606;
const Z: number = 0.850650808352039932;
export const ICO_VERTEX_DATA: Vector3[] = [
    new Vector3(-X, 0, Z), new Vector3(X, 0, Z), new Vector3(-X, 0, -Z), new Vector3(X, 0, -Z),
    new Vector3(0, Z, X), new Vector3(0, Z, -X), new Vector3(0, -Z, X), new Vector3(0, -Z, -X),
    new Vector3(Z, X, 0), new Vector3(-Z, X, 0), new Vector3(Z, -X, 0), new Vector3(-Z, -X, 0)
];

export const ICO_VERTEX_INDICES: [number, number, number][] = [
    [0, 4, 1], [0, 9, 4], [9, 5, 4], [4, 5, 8], [4, 8, 1],
    [8, 10, 1], [8, 3, 10], [5, 3, 8], [5, 2, 3], [2, 7, 3],
    [7, 10, 3], [7, 6, 10], [7, 11, 6], [11, 0, 6], [0, 1, 6],
    [6, 1, 10], [9, 0, 11], [9, 11, 2], [9, 2, 5], [7, 2, 11]
];

export default class IcosahedronMeshGenerator implements MeshGenerator {

    generate(scale: Vector3 | number = 1): Mesh {
        const mg = new MeshBuilder();
        for (let triple of ICO_VERTEX_INDICES) {
            mg.addFace(triple.map<Vector3>((idx) => ICO_VERTEX_DATA[idx]));
        }
        return mg.scale(scale).build();
    }

}
