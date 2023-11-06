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

// tl tr bl br
// 0b(tl)(tr)(bl)(br)
import {ContourPoint} from "./types";

const CONTOURS: ContourPoint[][] = [
    [],
    [ [ 2, 3 ], [ 1, 3 ], 3 ], // br
    [ [ 0, 2 ], [ 2, 3 ], 2 ], // bl
    [ [ 0, 2 ], [ 1, 3 ], 3, 2 ], // bl br
    [ [ 0, 1 ], [ 1, 3 ], 1 ], // tr
    [ [ 0, 1 ], [ 2, 3 ], 3, 1 ], // tr br
    [ [ 0, 2 ], [ 0, 1 ], 1, [ 1, 3 ], [ 2, 3 ], 2 ], // tr bl
    [ [ 0, 2 ], [ 0, 1 ], 1, 3, 2 ], // tr bl br
    [ 0, [ 0, 1 ], [ 0, 2 ] ], // tl
    [ 0, [ 0, 1 ], [ 1, 3 ], 3, [ 2, 3 ], [ 0, 2 ] ], // tl br
    [ 0, [ 0, 1 ], [ 2, 3 ], 2 ], // tl bl
    [ 0, [ 0, 1 ], [ 1, 3 ], 3, 2 ], // tl bl br
    [ 0, 1, [ 1, 3 ], [ 0, 2 ] ], // tl tr
    [ [ 0, 2 ], 0, 1, 3, [ 2, 3 ] ], // tl tr br
    [ 0, 1, [ 1, 3 ], [ 2, 3 ], 2 ], // tl tr bl
    [ 0, 1, 3, 2 ] // tl tr bl br
];
export const CONTOURS_BYTES: Uint8Array = (() => {
    const ret = new Uint8Array(72);
    for (let i=0; i < CONTOURS.length - 1; i += 2) {
        ret[i >> 1] = ((CONTOURS[i].length & 15) << 4) | (CONTOURS[i + 1].length & 15);
    }
    for (let i=0; i < CONTOURS.length; i++) {
        const contour = CONTOURS[i];
        let n: number = -2147483648;
        let j: number = 0;

        for (let z=0; z < contour.length; z++) {
            let data = contour[z];
            if (typeof data === "number") {
                j++;
                n |= (data & 3) << j;
                j += 4;
            } else {
                n |= 1 << (j++);
                n |= (data[0] & 3) << j;
                j += 2;
                n |= (data[1] & 3) << j;
                j += 2;
            }
        }

        let s: number = (i << 2) + 8;
        ret[s] = (n >> 24) & 0xFF;
        ret[s | 1] = (n >> 16) & 0xFF;
        ret[s | 2] = (n >> 8) & 0xFF;
        ret[s | 3] = n & 0xFF;
    }
    return ret;
})();
