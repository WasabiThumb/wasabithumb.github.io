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
