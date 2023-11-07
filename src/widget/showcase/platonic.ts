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
import {Vector, Vector2, Vector3} from "../../math/vector";
import {Mesh, MeshFace2D, MeshGenerator} from "../../math/mesh";
import Quaternion from "../../math/quaternion";
import {HSV, RGB} from "../../util/color";
import {CursorTracker} from "../../util/input";

function rotationFromPercentage(percent: number): Quaternion {
    return Quaternion.yAxis(percent * Math.PI * 2);
}

type Solid = {
    mesh: Mesh,
    rotationRadians: number,
    rotation: Quaternion,
    orbitCenter: Vector3,
    orbitRadius: number,
    orbitRadians: number,
    color: RGB,
    yOscillateOffset: number
};

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

    private _solids: Solid[] = [];
    private _lightDirection: Vector3 = new Vector3(0, 0, -1);
    private _cursor: CursorTracker | null = null;
    private _orbitRotation: number = -1;
    private _targetOrbitRotation: number = -1;
    init(param: ShowcaseSlideParameters): void {
        const orbitCenter = new Vector3(0, 0, 12);
        this._solids = [];
        this._lightDirection = new Vector3(0, 0, -1);
        this._orbitRotation = -1;
        this._targetOrbitRotation = -1;
        for (let i=0; i < MeshGenerator.PLATONICS.length; i++) {
            const generator = MeshGenerator.PLATONICS[i];
            const orbitRadians: number = (i * Math.PI * 2) / MeshGenerator.PLATONICS.length;
            this._solids.push({
                mesh: generator.generate(),
                rotationRadians: 0,
                rotation: Quaternion.identity(),
                orbitCenter,
                orbitRadius: 8,
                orbitRadians,
                color: HSV.toRGB([ (i / MeshGenerator.PLATONICS.length), 1, 1 ]),
                yOscillateOffset: Math.random() * 10
            });
        }
        this._cursor = new CursorTracker();
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

        if (this._cursor!.lastEventAgeMillis() < 500) {
            this._targetOrbitRotation = ((this._cursor!.getX() / window.innerWidth) - 0.5) * 8;
        }
        const d = Math.min(delta * 8, 0.5);
        this._orbitRotation = (this._orbitRotation * (1 - d)) + (this._targetOrbitRotation * d);
        const orbitRotation = this._orbitRotation * delta;

        const meshRotation = delta * 2;
        type DrawParams = { mesh: Mesh, scale: number, distance: number, color: RGB };
        const draws: DrawParams[] = [];
        for (let solid of this._solids) {
            solid.orbitRadians += orbitRotation;
            const translation = Vector.sum(solid.orbitCenter, new Vector3(
                Math.cos(solid.orbitRadians) * solid.orbitRadius,
                Math.cos((age + solid.yOscillateOffset) * 3.5) * 0.25,
                Math.sin(solid.orbitRadians) * solid.orbitRadius)
            );
            solid.rotationRadians += meshRotation;
            solid.rotation = Quaternion.yAxis(solid.rotationRadians);

            draws.push({ mesh: solid.mesh.transformed(translation, solid.rotation), scale, distance: translation.z, color: solid.color });
        }
        draws.sort((a, b) => b.distance - a.distance);


        const transform = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, -padLeft, -padTop);
        for (let draw of draws) this._renderMesh(ctx, draw.mesh, draw.scale, draw.distance, draw.color);
        ctx.setTransform(transform);
    }

    destroy(): void {
        this._solids.splice(0);
        this._cursor!.stop();
    }

    private _renderMesh(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, mesh: Mesh, scale: number, distance: number, color: RGB) {
        const projected: MeshFace2D[] = mesh.getProjectedFaces((point) => this._project(point), new Vector3());
        for (let i=0; i < projected.length; i++) {
            let face = projected[i];
            let light: number = Math.min(Math.max(face.normal.dot(this._lightDirection), 0) * 0.25, 0.25) + 0.75;
            light /= Math.max((distance - 2) * 0.35, 1);

            const { a, b, c } = face.vertices.update((v) => v.multiply(scale));

            const css = RGB.toCSS(RGB.lerp(RGB.black(), color, light));
            ctx.fillStyle = css;
            ctx.strokeStyle = css;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
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
