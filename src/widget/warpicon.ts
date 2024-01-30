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

import {PageWidget, PageWidgetType} from "../struct/widget";
import {Page} from "../struct/page";
import {LazyImage} from "../struct/asset";
import WarpIconRenderer from "./warpicon/renderer";
import GLWarpIconRenderer from "./warpicon/gl";
import FlatWarpIconRenderer from "./warpicon/flat";
import {CursorTracker} from "../util/input";

const CTXS: ("2d" | "webgl" | "experimental-webgl")[] = ["2d", "webgl", "experimental-webgl"];

export default class WarpIconPageWidget implements PageWidget {

    readonly type: PageWidgetType = "warp-icon";
    readonly renders: boolean = true;
    private readonly _iconCache: { [id: string]: LazyImage } = {};
    private readonly _iconsInUse: string[] = [];
    private readonly _renderers: WarpIconRenderer<any>[] = [];
    private _cursor: CursorTracker | null = null;

    init(page: Page): void {
        this._iconsInUse.splice(0);
        const query: NodeListOf<HTMLCanvasElement> = page.root.querySelectorAll(`canvas[data-role="${this.type}"]`);

        const cursor: CursorTracker = new CursorTracker();
        this._cursor = cursor;
        let canvas: HTMLCanvasElement;
        let renderer: WarpIconRenderer<any>;
        let gl: -1 | 0 | 1 | 2 = -1;
        for (let i=0; i < query.length; i++) {
            canvas = query.item(i);

            const iconID = canvas.getAttribute("data-icon");
            if (!iconID) continue;
            let icon: LazyImage | undefined = this._iconCache[iconID];
            if (!icon) {
                icon = new LazyImage(`assets/images/warpicon/${iconID}`);
                this._iconCache[iconID] = icon;
                this._iconsInUse.push(iconID);
                icon.startLoading();
            }

            let ctx: RenderingContext | null;
            if (gl === -1) {
                ctx = canvas.getContext(CTXS[gl = 1]);
                if (!ctx) canvas.getContext(CTXS[gl = 2]);
                if (!ctx || !(ctx instanceof WebGLRenderingContext)) canvas.getContext(CTXS[gl = 0]);
            } else {
                ctx = canvas.getContext(CTXS[gl]);
            }

            renderer = gl ?
                new GLWarpIconRenderer(canvas, ctx as WebGLRenderingContext, icon, cursor) :
                new FlatWarpIconRenderer(canvas, ctx as CanvasRenderingContext2D, icon, cursor);

            this._renderers.push(renderer);
        }
    }

    refresh(page: Page): void {
        this.destroyRenderers();
        this.init(page);
        this.cleanCache(false);
    }

    render(page: Page, delta: number): void {
        for (let r of this._renderers) {
            r.render(delta);
        }
    }

    destroy(page: Page): void {
        this.destroyRenderers();
        this.cleanCache(true);
        this._iconsInUse.splice(0);
        this._cursor!.stop();
    }

    private destroyRenderers(): void {
        for (let r of this._renderers) r.destroy();
    }

    private cleanCache(noCheckUsed: boolean): void {
        for (let k of Object.keys(this._iconCache)) {
            if (noCheckUsed || this._iconsInUse.indexOf(k) < 0) {
                this._iconCache[k].destroy();
                delete this._iconCache[k];
            }
        }
    }

}
