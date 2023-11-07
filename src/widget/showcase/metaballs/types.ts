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

export type NPair = [ number, number ];

export type TransmitMetaBall = {
    id: number,
    pos: NPair,
    velocity: NPair,
    radius: number
};

export type CornerIndex = 0 | 1 | 2 | 3;
export type ContourPoint = [ CornerIndex, CornerIndex ] | CornerIndex;
export const CORNER_OFFSETS_N: NPair[] = [
    [ 0, 0 ],
    [ 1, 0 ],
    [ 0, 1 ],
    [ 1, 1 ]
];

export type MetaBallsWorkerInitMessage = {
    type: "init",
    cellSize: number,
    threshold: number,
    contours: ArrayBuffer | SharedArrayBuffer
};
export type MetaBallsWorkerFrameMessage = {
    type: "frame",
    balls: TransmitMetaBall[],
    invert: boolean
};
export type MetaBallsWorkerLineMessage = {
    type: "line",
    job: number,
    y: number,
    cellCount: number,
    pad: NPair,
    canvasSize: NPair
};
export type MetaBallsWorkerPolygonsMessage = {
    type: "polygons",
    job: number,
    points: NPair[][]
};
export type MetaBallsWorkerMessage = MetaBallsWorkerInitMessage |
    MetaBallsWorkerFrameMessage |
    MetaBallsWorkerLineMessage |
    MetaBallsWorkerPolygonsMessage;
