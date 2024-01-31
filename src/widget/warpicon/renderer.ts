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

import {LazyImage} from "../../struct/asset";
import {Vector, Vector2, Vector3} from "../../math/vector";
import {CursorTracker} from "../../util/input";

const FOV: number = Math.PI / 2;
const HALF_FOV: number = FOV / 2;
const CAM_INSET: number = 1 / Math.tan(HALF_FOV);

export default abstract class WarpIconRenderer<T extends RenderingContext> {

    readonly canvas: HTMLCanvasElement;
    private readonly _centerContainer: null | HTMLElement = null;
    readonly ctx: T;
    readonly icon: LazyImage;
    private _iconFirstAvailable: boolean = true;
    protected influence: Vector2 = new Vector2(0, 0);
    protected cursor: CursorTracker;

    protected constructor(canvas: HTMLCanvasElement, ctx: T, icon: LazyImage, cursor: CursorTracker) {
        this.canvas = canvas;
        this._centerContainer = canvas.hasAttribute("data-center") ? canvas.parentElement : null;
        this.ctx = ctx;
        this.icon = icon;
        this.cursor = cursor;
    }

    render(delta: number): void {
        if (!!this._centerContainer) {
            const containerRect: DOMRect = this._centerContainer.getBoundingClientRect();

            const {width, height} = this.canvas;
            const aspect: number = width / height;
            const containerAspect: number = containerRect.width / containerRect.height;

            let fw: number;
            let fh: number;
            if (aspect >= containerAspect) {
                fw = containerRect.width;
                fh = containerRect.width / aspect;
            } else {
                fh = containerRect.height;
                fw = containerRect.height * aspect;
            }

            const {style} = this.canvas;
            style.width = `${fw}px`;
            style.height = `${fh}px`;
            style.left = `${(containerRect.width - fw) / 2}px`;
            style.top = `${(containerRect.height - fh) / 2}px`;
        }

        const targetInfluence: Vector2 = this.computeInfluence();
        this.influence = Vector.lerp(this.influence, targetInfluence, Math.min(delta * 6, 1));

        if (this.icon.isAvailable()) {
            if (this._iconFirstAvailable) {
                this.onImageReady();
                this._iconFirstAvailable = false;
            }
            this.renderAfterReady(delta);
        } else {
            this.renderBeforeReady(delta);
        }
    }

    private computeInfluence(): Vector2 {
        if (this.cursor.lastEventAgeMillis() > 2500) return new Vector2(0, 0);
        const x = this.cursor.getX();
        const y = this.cursor.getY();

        const rect: DOMRect = this.canvas.getBoundingClientRect();
        const r2: number = Math.max(rect.width, rect.height) * 0.5;
        const r2Sqr: number = r2 * r2;
        const r1: number = r2 * 0.1;
        const r1Sqr: number = r1 * r1;

        const cx: number = rect.left + (rect.width / 2);
        const cy: number = rect.top + (rect.height / 2);
        let dx: number = x - cx;
        let dy: number = y - cy;

        const normSqr: number = (dx * dx) + (dy * dy);
        if (normSqr <= r1Sqr) return new Vector2(0, 0);

        const norm: number = Math.sqrt(normSqr);
        dx /= norm;
        dy /= norm;

        if (normSqr >= r2Sqr) return new Vector2(dx, dy);

        const factor: number = (norm - r1) / (r2 - r1);
        dx *= factor;
        dy *= factor;
        return new Vector2(dx, dy);
    }

    protected projectPoint(point: Vector3): Vector2 {
        let x: number = this._projectSingle(point.x, point.z);
        let y: number = this._projectSingle(point.y, point.z);
        x = (1 - x) / 2;
        y = (y + 1) / 2;
        return new Vector2(x, y);
    }

    private _projectSingle(d: number, z: number): number {
        if (Math.abs(d) < 1e-9) return d;
        const m: number = (z + CAM_INSET) / d;
        const b: number = z - (m * d);
        return -b / m;
    }

    protected abstract onImageReady(): void;

    protected abstract renderBeforeReady(delta: number): void;

    protected abstract renderAfterReady(delta: number): void;

    abstract destroy(): void;

}
