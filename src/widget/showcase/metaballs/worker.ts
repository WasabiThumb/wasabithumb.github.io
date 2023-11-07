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

import {MetaBallsContourSolverImpl} from "./solver";
import {MetaBallsWorkerMessage, MetaBallsWorkerPolygonsMessage, NPair} from "./types";

(!self.document) && (() => {

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
