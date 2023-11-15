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

import {ConvolutionKernel, ConvolutionWorkerMessage, messageDeserialize, messageSerialize} from "./types";

(!self.document) && (() => {

    type RGBA = [ number, number, number, number ];
    type Sampler = (x: number, y: number) => RGBA;

    type State = { init: false } | { init: true, width: number, height: number, sampler: Sampler, canvas: Uint8ClampedArray };
    let state: State = { init: false };

    const REL_LIST: [ number, number ][] = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0], [0, 0], [1, 0],
        [-1, 1], [0, 1], [1, 1]
    ];

    const handleJobChannel = ((job: number, width: number, height: number, sampler: Sampler, canvas: Uint8ClampedArray,
                               channel: number, kernel: ConvolutionKernel) => {
        for (let y=0; y < height; y++) {
            const start = (y * width * 4);
            for (let x=0; x < width; x++) {
                let sum: number = 0;
                for (let i=0; i < 9; i++) {
                    const rel = REL_LIST[i];
                    sum += kernel[i] * sampler(x + rel[0], y + rel[1])[channel];
                }
                canvas[start + (x * 4) + channel] = Math.floor(Math.min(Math.max(sum, 0), 255));
            }
        }
    });

    const handleJob = ((job: number, width: number, height: number, sampler: Sampler, canvas: Uint8ClampedArray,
         rk: ConvolutionKernel, gk: ConvolutionKernel, bk: ConvolutionKernel) => {
        handleJobChannel(job, width, height, sampler, canvas, 0, rk);
        handleJobChannel(job, width, height, sampler, canvas, 1, gk);
        handleJobChannel(job, width, height, sampler, canvas, 2, bk);
        self.postMessage(messageSerialize({
            type: "finish",
            job, width, height,
            bitmap: canvas
        }, false));
    });

    self.onmessage = ((event: MessageEvent) => {
        const buffer = event.data as ArrayBuffer | SharedArrayBuffer;
        const message: ConvolutionWorkerMessage = messageDeserialize(buffer);

        switch (message.type) {
            case "init":
                if (state.init) break;
                const { bitmap, width, height, flags } = message;
                let padLeft: number = 0;
                let padTop: number = 0;
                let maxW: number = width;
                let maxH: number = height;
                if (flags & 8) { padLeft++; maxW++; }
                if (flags & 4) { maxW++; }
                if (flags & 2) { padTop++; maxH++; }
                if (flags & 1) { maxH++; }

                const sampler: Sampler = ((x, y) => {
                    x = Math.max(Math.min(x + padLeft, maxW - 1), 0);
                    y = Math.max(Math.min(y + padTop, maxH - 1), 0);
                    const idx: number = (y * maxW * 4) + (x * 4);
                    return [ bitmap[idx], bitmap[idx + 1], bitmap[idx + 2], bitmap[idx + 3] ];
                });
                const canvas = new Uint8ClampedArray(width * height * 4);
                for (let i=0; i < canvas.length; i++) canvas[i] = 255;
                state = { init: true, width, height, sampler, canvas };
                break;
            case "start":
                if (!state.init) break;
                handleJob(message.job, state.width, state.height, state.sampler, state.canvas,
                    message.redKernel, message.greenKernel, message.blueKernel);
                break;
        }
    });

})();
