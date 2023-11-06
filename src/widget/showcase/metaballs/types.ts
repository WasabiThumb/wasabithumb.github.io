import {Vector2} from "../../../math/vector";

export type NPair = [ number, number ];

export type MetaBall = {
    id: number,
    pos: Vector2,
    velocity: Vector2,
    radius: number
};
export type TransmitMetaBall = { [P in keyof MetaBall]: MetaBall[P] extends Vector2 ? NPair : MetaBall[P] };
export const metaBallTransmit: ((mb: MetaBall) => TransmitMetaBall) = ((mb) => {
    const tf: ((vec: Vector2) => NPair) = (vec => [ vec.x, vec.y ]);
    return { ...mb, pos: tf(mb.pos), velocity: tf(mb.velocity) };
});


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
