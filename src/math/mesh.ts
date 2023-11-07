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

import {Tri, Tri2D, Triangle} from "./triangle";
import {Vector, Vector2, Vector3} from "./vector";
import Quaternion from "./quaternion";

export type MeshFace = { vertices: Tri, uvs: Tri2D, normal: Vector3 };
export type MeshFace2D = { vertices: Tri2D, uvs: Tri2D, normal: Vector3 };
export class Mesh {

    static builder(): MeshBuilder {
        return new MeshBuilder();
    }

    readonly faces: MeshFace[];
    constructor(faces: MeshFace[]) {
        this.faces = faces;
    }

    getProjectedFaces(project: (point: Vector3) => Vector2, cameraPos?: Vector3): MeshFace2D[] {
        return (!!cameraPos ? this.faces.sort((a, b) => {
            return b.vertices.sqrDistFrom(cameraPos) - a.vertices.sqrDistFrom(cameraPos);
        }) : this.faces).map<MeshFace2D>((face) => {
            return {
                ...face,
                vertices: face.vertices.map(project)
            };
        });
    }

    transformed(translation: Vector3, rotation: Quaternion): Mesh {
        return new Mesh(this.faces.map<MeshFace>((face) => {
            return {
                vertices: face.vertices.transformed(translation, rotation),
                uvs: face.uvs.copy(),
                normal: rotation.rotate(face.normal)
            };
        }));
    }

    copy(): Mesh {
        return new Mesh([...this.faces]);
    }

}

export class MeshBuilder {

    private _faces: MeshFace[] = [];
    constructor() { }

    addFace(vertices: Tri | Vector3[], uvs?: Tri2D | Vector2[], normal?: Vector3): MeshBuilder {
        if (Array.isArray(vertices)) vertices = new Triangle(vertices[0], vertices[1], vertices[2]);
        if (!uvs) {
            uvs = Tri2D.defaultUV();
        } else if (Array.isArray(uvs)) {
            uvs = new Triangle(uvs[0], uvs[1], uvs[2]);
        }
        if (!normal) normal = vertices.computeCenter().normalize();
        this._faces.push({ vertices, uvs, normal });
        return this;
    }

    // general contract: tl tr br bl
    addQuad(vertices: Vector3[], uvs?: Vector2[], normal?: Vector3): MeshBuilder {
        if (!uvs) uvs = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)];
        if (!normal) normal = vertices.reduce((a, b) => Vector.sum(a, b)).divide(4).normalize();
        this._faces.push({
            vertices: new Triangle<Vector3>(vertices[0], vertices[1], vertices[3]),
            uvs: new Triangle<Vector2>(uvs[0], uvs[1], uvs[3]),
            normal
        });
        this._faces.push({
            vertices: new Triangle<Vector3>(vertices[3], vertices[1], vertices[2]),
            uvs: new Triangle<Vector2>(uvs[3], uvs[1], uvs[2]),
            normal
        });
        return this;
    }

    clear(): MeshBuilder {
        this._faces.splice(0);
        return this;
    }

    scale(scale: Vector3 | number): MeshBuilder {
        for (let i=0; i < this._faces.length; i++) this._faces[i].vertices.update((p) => p.multiply(scale));
        return this;
    }

    build(): Mesh {
        return new Mesh(this._faces);
    }

}

export interface MeshGenerator {

    generate(scale?: Vector3 | number): Mesh;

}

import TetrahedronMeshGenerator from "./mesh/tetrahedron";
import CubeMeshGenerator from "./mesh/cube";
import OctahedronMeshGenerator from "./mesh/octahedron";
import DodecahedronMeshGenerator from "./mesh/dodecahedron";
import IcosahedronMeshGenerator from "./mesh/icosahedron";
import IcoSphereMeshGenerator from "./mesh/icosphere";
export namespace MeshGenerator {
    export const TETRAHEDRON = new TetrahedronMeshGenerator();
    export const CUBE = new CubeMeshGenerator();
    export const OCTAHEDRON = new OctahedronMeshGenerator();
    export const DODECAHEDRON = new DodecahedronMeshGenerator();
    export const ICOSAHEDRON = new IcosahedronMeshGenerator();

    export const PLATONICS: [
        TetrahedronMeshGenerator,
        CubeMeshGenerator,
        OctahedronMeshGenerator,
        DodecahedronMeshGenerator,
        IcosahedronMeshGenerator
    ] = [
        TETRAHEDRON,
        CUBE,
        OCTAHEDRON,
        DODECAHEDRON,
        ICOSAHEDRON
    ];

    export function icoSphere(subdivisions: number = 4, halfUV: boolean = false): IcoSphereMeshGenerator {
        return new IcoSphereMeshGenerator(subdivisions, halfUV);
    }
}
