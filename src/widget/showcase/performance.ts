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

const SPEED: number = 300;
let STAT_MAX: number = 0.017;

export default class PerformanceShowcaseSlide implements ShowcaseSlide {

    private _data: DataPoint[] = [];

    init(param: ShowcaseSlideParameters): void {
        this._reset();
    }

    render(param: ShowcaseSlideParameters, delta: number, age: number): void {
        const ctx = param.ctx;
        const { width, height } = param.canvas;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        while (this._data.length > 1000) {
            this._data.splice(0, 1);
        }
        let max: number = delta;
        let maxAge: number = 0;
        let sum: number = 0;
        for (let p of this._data) {
            max = Math.max(max, p.value);
            sum += p.value;
            p.age += delta;
            maxAge = Math.max(maxAge, p.age);
        }
        STAT_MAX = (STAT_MAX * 0.99) + (max * 0.01);
        max = Math.max(max, STAT_MAX);
        sum /= this._data.length;
        max += 0.0005;
        this._data.push({ value: delta, age: 0 });

        const toXY: ((point: DataPoint) => [ number, number ]) = ((point) => {
            let d: number = 0.95 - (0.55 * (point.value / max));
            const y: number = height * d;
            const x: number = SPEED * point.age;
            return [x, y];
        });

        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i=(this._data.length - 2); i >= 0; i--) {
            const from = this._data[i];
            const to = this._data[i + 1];

            ctx.moveTo(...toXY(from));
            ctx.lineTo(...toXY(to));
        }
        ctx.stroke();

        ctx.strokeStyle = "green";
        ctx.beginPath();
        ctx.moveTo(...toXY({ value: sum, age: 0 }));
        ctx.lineTo(...toXY({ value: sum, age: maxAge }));
        ctx.stroke();
    }

    destroy(): void {
        this._reset();
    }

    private _reset() {
        this._data = [];
    }

}

type DataPoint = { value: number, age: number };
