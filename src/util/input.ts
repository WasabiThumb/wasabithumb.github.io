
type CursorTrackerCallback = ((event: MouseEvent) => void);
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
        const cb: CursorTrackerCallback = ((event) => me._onMouseMove(event));

        if (typeof AbortController === "function") {
            const con: AbortController = new AbortController();
            window.addEventListener("mousemove", cb, { signal: con.signal });
            this._mode = { id: "controller", controller: con };
        } else {
            window.addEventListener("mousemove", cb);
            this._mode = { id: "callback", callback: cb };
        }
    }

    private _onMouseMove(event: MouseEvent) {
        this._x = event.clientX;
        this._y = event.clientY;
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
                window.removeEventListener("mousemove", this._mode.callback);
                break;
            case "controller":
                this._mode.controller.abort();
                break;
        }
        this._mode = { id: "done" };
    }

}
