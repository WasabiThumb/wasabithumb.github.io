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
import {RGB} from "../../util/color";


export default class TestShowcaseSlide implements ShowcaseSlide {

    private _col: RGB | null = null;

    init(param: ShowcaseSlideParameters) {
        this._col = RGB.random();
    }

    render(param: ShowcaseSlideParameters, delta: number, age: number) {
        param.ctx.fillStyle = RGB.toCSS(this._col!);
        param.ctx.fillRect(0, 0, param.canvas.width, param.canvas.height);
    }

    destroy() {
    }

}
