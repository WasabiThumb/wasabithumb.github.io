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


const EVENTS: ("mousemove" | "touchstart" | "touchmove")[] = [ "mousemove", "touchstart", "touchmove" ];
type CursorTrackerCallback = ((event: MouseEvent | TouchEvent) => void);
type CursorTrackerMode = { id: "controller", controller: AbortController } | { id: "callback", callback: CursorTrackerCallback } | { id: "done" };

export class CursorTracker {

    private _mode: CursorTrackerMode;
    private _x: number;
    private _y: number;
    private _lastEvent: number = 0;
    constructor(initialX: number = 0, initialY: number = 0) {
        this._x = initialX;
        this._y = initialY;

        const me = this;
        const cb: CursorTrackerCallback = ((event) => me._on(event));

        if (typeof AbortController === "function") {
            const con: AbortController = new AbortController();
            for (let evt of EVENTS) {
                window.addEventListener(evt, cb, { signal: con.signal });
            }
            this._mode = { id: "controller", controller: con };
        } else {
            for (let evt of EVENTS) {
                window.addEventListener(evt, cb);
            }
            this._mode = { id: "callback", callback: cb };
        }
    }

    private _on(event: MouseEvent | TouchEvent) {
        if (event instanceof MouseEvent) {
            this._x = event.clientX;
            this._y = event.clientY;
        } else {
            const { touches } = event;
            const { length } = touches;
            if (length < 1) return;

            let x: number = 0;
            let y: number = 0;
            for (let i=0; i < length; i++) {
                const touch = touches.item(i)!;
                x += touch.clientX;
                y += touch.clientY;
            }
            this._x = x / length;
            this._y = y / length;
        }
        this._lastEvent = Date.now();
    }

    getX(): number {
        return this._x;
    }

    getY(): number {
        return this._y;
    }

    lastEventAgeMillis(): number {
        return Date.now() - this._lastEvent;
    }

    stop(): void {
        switch (this._mode.id) {
            case "callback":
                for (let evt of EVENTS) {
                    window.removeEventListener(evt, this._mode.callback);
                }
                break;
            case "controller":
                this._mode.controller.abort();
                break;
        }
        this._mode = { id: "done" };
    }

}
