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
import {Vector2, Vector3} from "../../math/vector";
import {Mesh, MeshFace2D, MeshGenerator} from "../../math/mesh";
import Quaternion from "../../math/quaternion";
import {RGB} from "../../util/color";


export default class PlatonicShowcaseSlide implements ShowcaseSlide {

    private readonly _fov: number;
    private readonly _halfFov: number;
    private readonly _tanHalfFov: number;
    private readonly _zNear: number;
    private readonly _zFar: number;
    private readonly _zFarSqr: number;
    private readonly _nearPlaneHW: number;
    constructor() {
        this._fov = Math.PI / 2;
        this._halfFov = this._fov / 2;
        this._tanHalfFov = Math.tan(this._halfFov);
        this._zNear = 0.1;
        this._zFar = 400;
        this._zFarSqr = this._zFar * this._zFar;
        this._nearPlaneHW = this._zNear * this._tanHalfFov;
    }

    private _meshes: Mesh[] = [];
    init(param: ShowcaseSlideParameters): void {
        this._meshes = [
            MeshGenerator.TETRAHEDRON.generate().transformed(new Vector3(0, 0, 4), Quaternion.identity())
        ];
    }

    render(param: ShowcaseSlideParameters, delta: number, age: number): void {
        const { ctx, canvas } = param;
        const { width, height } = canvas;

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        const dim: number = Math.max(width, height);
        const padLeft: number = (dim - width) / 2;
        const padTop: number = (dim - height) / 2;
        const scale: number = dim / 100;

        const transform = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, -padLeft, -padTop);
        for (let mesh of this._meshes) {
            this._renderMesh(ctx, mesh, scale, [255, 0, 0]);
        }
        ctx.setTransform(transform);
    }

    destroy(): void {

    }

    private _renderMesh(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, mesh: Mesh, scale: number, color: RGB) {
        const projected: MeshFace2D[] = mesh.getProjectedFaces((point) => this._project(point), new Vector3());
        for (let i=0; i < projected.length; i++) {
            let face = projected[i];
            let light: number = 1 - Math.min(face.normal.cross(new Vector3(0, 0, -1)).normSqr(), 1);
            light /= mesh.faces[i].vertices.computeCenter().z;

            const { a, b, c } = face.vertices.update((v) => v.multiply(scale));

            ctx.fillStyle = RGB.toCSS(RGB.lerp(RGB.black(), color, light));
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.closePath();
            ctx.fill();
        }
    }

    private _project(point: Vector3): Vector2 {
        return new Vector2(
            this._projectAxis(point.x, point.z),
            this._projectAxis(-point.y, point.z)
        );
    }

    private _projectAxis(n: number, d: number): number {
        if (Math.abs(n) <= 1e-9) return 50;
        if (d < this._zNear) return -1;

        let v: number = (n / d) * this._zNear;
        v /= this._nearPlaneHW;
        return (v + 1) * 50;
    }

}
