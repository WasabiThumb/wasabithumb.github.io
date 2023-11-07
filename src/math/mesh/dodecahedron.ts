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

import {Vector, Vector3} from "../vector";
import {Mesh, MeshBuilder, MeshGenerator} from "../mesh";

const ROOT_3: number = Math.sqrt(3);
const ROOT_5: number = Math.sqrt(5);
const A: number = 1 / ROOT_3;
const B: number = (ROOT_5 - 1) / (2 * ROOT_3);
const C: number = (ROOT_3 * (1 + ROOT_5)) / 6;


type DDHFaceIndices = [ number, number, number, number, number ];
type DDHFaceVertices = [ Vector3, Vector3, Vector3, Vector3, Vector3 ];
const DDH_VERTEX_INDICES: DDHFaceIndices[] = [
    [0, 16, 2, 10, 8],
    [0, 8, 4, 14, 12],
    [16, 17, 1, 12, 0],
    [1, 9, 11, 3, 17],
    [1, 12, 14, 5, 9],
    [2, 13, 15, 6, 10],
    [13, 3, 17, 16, 2],
    [3, 11, 7, 15, 13],
    [4, 8, 10, 6, 18],
    [14, 5, 19, 18, 4],
    [5, 19, 7, 11, 9],
    [15, 7, 19, 18, 6]
];

const DDH_VERTEX_DATA: Vector3[] = [
    new Vector3(A, A, A), new Vector3(A, A, -A), new Vector3(A, -A, A), new Vector3(A, -A, -A), new Vector3(-A, A, A),
    new Vector3(-A, A, -A), new Vector3(-A, -A, A), new Vector3(-A, -A, -A), new Vector3(0, B, C),
    new Vector3(0, B, -C), new Vector3(0, -B, C), new Vector3(0, -B, -C), new Vector3(B, C, 0),
    new Vector3(B, -C, 0), new Vector3(-B, C, 0), new Vector3(-B, -C, 0), new Vector3(C, 0, B),
    new Vector3(C, 0, -B), new Vector3(-C, 0, B), new Vector3(-C, 0, -B)
];


export default class DodecahedronMeshGenerator implements MeshGenerator {

    generate(scale: Vector3 | number = 1): Mesh {
        const mb = new MeshBuilder();

        for (let i=0; i < 12; i++) {
            const vertices: DDHFaceVertices = DDH_VERTEX_INDICES[i].map<Vector3>((n) => {
                return DDH_VERTEX_DATA[n];
            });
            const center = vertices.reduce((a, b) => Vector.sum(a, b)).divide(5);
            const normal = center.normalize();

            // triangle fan
            for (let z=0; z < 5; z++) {
                mb.addFace([
                    vertices[z], center, vertices[z === 4 ? 0 : z + 1]
                ], undefined, normal);
            }
        }

        return mb.scale(scale).build();
    }

}
