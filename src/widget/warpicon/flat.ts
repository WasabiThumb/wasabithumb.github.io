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

import WarpIconRenderer from "./renderer";
import {LazyImage} from "../../struct/asset";
import {CursorTracker} from "../../util/input";
import Quaternion from "../../math/quaternion";
import {Vector, Vector2, Vector3} from "../../math/vector";
import {LIB_VERSION} from "../../util/version";

export default class FlatWarpIconRenderer extends WarpIconRenderer<CanvasRenderingContext2D> {

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, icon: LazyImage, cursor: CursorTracker) {
        super(canvas, ctx, icon, cursor);
    }

    protected onImageReady(): void { }

    protected renderBeforeReady(delta: number): void {
    }

    protected renderAfterReady(delta: number): void {
        const { canvas, ctx, icon, influence } = this;
        const { width, height } = canvas;

        let ang: number = Math.atan2(1.8, influence.x) + (Math.PI / 2);

        const rotation = Quaternion.yAxis(ang).inverse();
        const quadPoint = ((x: number, y: number) => {
            let ret: Vector3 = new Vector3(x, y, 0);
            ret = rotation.rotate(ret);
            ret = ret.add(new Vector3(0, 0, 0.8));
            return this.projectPoint(ret);
        });

        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = "red";
        const points: Vector2[] = [ quadPoint(-1, -1), quadPoint(1, -1), quadPoint(1, 1), quadPoint(-1, 1) ];

        const lx = Math.round(points[0].x * width);
        const rx = Math.round(points[1].x * width);
        const texWidth = icon.get().naturalWidth / (rx - lx + 1);

        ctx.fillStyle = "white";
        for (let x=lx; x <= rx; x++) {
            const d: number = (x - lx) / (rx - lx);
            const t: Vector2 = Vector.lerp(points[0], points[1], d);
            const b: Vector2 = Vector.lerp(points[3], points[2], d);
            const yh: number = Math.abs(t.y - b.y) * height;

            ctx.drawImage(icon.get(), (x - lx) * texWidth, 0, texWidth, icon.get().naturalHeight, x, t.y * height, 1, yh);
        }

        if (LIB_VERSION.indexOf("-git") < 0) return;

        ctx.beginPath();
        for (let i=0; i < points.length; i++) {
            let a: Vector2 = points[i ? i - 1 : points.length - 1];
            let b: Vector2 = points[i];
            ctx.moveTo(a.x * width, a.y * height);
            ctx.lineTo(b.x * width, b.y * height);
        }
        ctx.stroke();
    }

    destroy(): void { }

}
