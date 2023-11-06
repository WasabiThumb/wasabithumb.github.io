
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
