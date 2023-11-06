import {MetaBallsContourSolverImpl} from "./solver";
import {MetaBallsWorkerMessage, MetaBallsWorkerPolygonsMessage, NPair} from "./types";

typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope && (() => {

    let solver: MetaBallsContourSolverImpl | null = null;
    let init: boolean = false;

    self.onmessage = ((event: MessageEvent) => {
        const dat = event.data as MetaBallsWorkerMessage;
        switch (dat.type) {
            case "init":
                solver = new MetaBallsContourSolverImpl(dat.cellSize, dat.threshold, new Uint8Array(dat.contours));
                init = true;
                break;
            case "frame":
                if (!init) return;
                solver!.startFrame(dat.balls, dat.invert);
                break;
            case "line":
                if (!init) return;
                const { job } = dat;
                solver!.solveLine(dat.y, dat.cellCount, dat.pad, dat.canvasSize).then((points: NPair[][]) => {
                    const msg: MetaBallsWorkerPolygonsMessage = {
                        type: "polygons",
                        job, points
                    };
                    self.postMessage(msg);
                });
                break;
        }
    });

})();
