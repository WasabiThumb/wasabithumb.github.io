import {ShowcaseSlide, ShowcaseSlideParameters} from "../showcase";


export default class TestShowcaseSlide implements ShowcaseSlide {

    private _col: string = "#ff0000";

    init(param: ShowcaseSlideParameters) {
        const hex = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' ];
        let col: string = "#";
        for (let i=0; i < 6; i++) {
            col += hex[Math.floor(Math.random() * hex.length)];
        }
        this._col = col;
    }

    render(param: ShowcaseSlideParameters, delta: number, age: number) {
        param.ctx.fillStyle = this._col;
        param.ctx.fillRect(0, 0, param.canvas.width, param.canvas.height);

        param.ctx.fillStyle = "black";
        param.ctx.textBaseline = "top";
        param.ctx.font = `${Math.min(param.canvas.width, param.canvas.height) * 0.05}px Ubuntu Mono`;
        param.ctx.fillText(age.toFixed(2), 50, 50);
    }

    destroy() {
    }

}
