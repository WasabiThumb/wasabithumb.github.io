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

import * as ieee754 from "ieee754";


export type ConvolutionKernel = [ number, number, number, number, number, number, number, number, number ];

export type ConvolutionWorkerMessage = ConvolutionWorkerInitMessage | ConvolutionWorkerStartMessage | ConvolutionWorkerFinishMessage;
export type ConvolutionWorkerInitMessage = {
    type: "init",
    bitmap: Uint8ClampedArray,
    width: number,
    height: number,
    flags: number // 0bABCD; A = L free; B = R free; C = T free; D = B free
};
export type ConvolutionWorkerStartMessage = {
    type: "start",
    job: number,
    redKernel: ConvolutionKernel,
    greenKernel: ConvolutionKernel,
    blueKernel: ConvolutionKernel
};
export type ConvolutionWorkerFinishMessage = {
    type: "finish",
    job: number,
    width: number,
    height: number,
    bitmap: Uint8ClampedArray
};

export function messageSerialize(message: ConvolutionWorkerMessage, useShared: boolean = false): ArrayBuffer | SharedArrayBuffer {
    const newBuffer: ((size: number) => ArrayBuffer | SharedArrayBuffer) = ((size: number) => {
        if (useShared) {
            return new SharedArrayBuffer(size);
        } else {
            return new ArrayBuffer(size);
        }
    });

    let isInit: boolean = false;
    switch (message.type) {
        case "init":
            isInit = true;
        case "finish":
            const arrBuff = newBuffer(message.bitmap.length + 6);
            const arr = new Uint8Array(arrBuff);
            arr.set(message.bitmap, 6);
            arr[0] = isInit ? 0 : 2;
            arr[1] = (isInit ?
                (message as ConvolutionWorkerInitMessage).flags
                : (message as ConvolutionWorkerFinishMessage).job) & 0xff;
            arr[2] = (message.width >> 8) & 0xff;
            arr[3] = message.width & 0xff;
            arr[4] = (message.height >> 8) & 0xff;
            arr[5] = message.height & 0xff;
            return arrBuff;
        case "start":
            const retBuff = newBuffer(110);
            const ret = new Uint8Array(retBuff);
            ret[0] = 1;
            ret[1] = (message.job & 0xff);

            let head: number = 2;
            const writeKernel = ((kernel: ConvolutionKernel) => {
                for (let n of kernel) {
                    ieee754.write(ret, n, head, false, 23, 4);
                    head += 4;
                }
            });
            writeKernel(message.redKernel);
            writeKernel(message.greenKernel);
            writeKernel(message.blueKernel);

            return retBuff;
    }
}

export function messageDeserialize(data: ArrayBuffer | SharedArrayBuffer): ConvolutionWorkerMessage {
    const bytes = new Uint8ClampedArray(data);
    if (bytes.length < 1) throw new Error("Message buffer is empty");
    const code: number = bytes[0];

    let isInit: boolean = false;
    switch (code) {
        case 0:
            isInit = true;
        case 2:
            let n: number = bytes[1];
            const width: number = (bytes[2] << 8) | bytes[3];
            const height: number = (bytes[4] << 8) | bytes[5];
            const bitmap: Uint8ClampedArray = bytes.subarray(6, bytes.length);
            if (isInit) {
                return {
                    type: "init",
                    flags: n,
                    width, height, bitmap
                };
            } else {
                return {
                    type: "finish",
                    job: n,
                    width, height, bitmap
                }
            }
        case 1:
            const job: number = bytes[1];

            let head: number = 2;
            const readKernel: (() => ConvolutionKernel) = (() => {
                let ret: number[] = [];
                for (let i=0; i < 9; i++) {
                    ret.push(ieee754.read(bytes as unknown as Uint8Array, head, false, 23, 4));
                    head += 4;
                }
                return ret as ConvolutionKernel;
            });

            const redKernel: ConvolutionKernel = readKernel();
            const greenKernel: ConvolutionKernel = readKernel();
            const blueKernel: ConvolutionKernel = readKernel();

            return  {
                type: "start",
                job,
                redKernel, greenKernel, blueKernel
            };
        default:
            throw new Error("Unknown message code " + code);
    }
}
