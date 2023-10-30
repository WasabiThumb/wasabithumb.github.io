import {PageWidget, PageWidgetRef, PageWidgets, PageWidgetType} from "./widget";
import RenderDispatch from "../util/render";

export interface IPage {

    readonly id: string;

    isOpen(): boolean;

    open(): void;

    refresh(): void;

    close(): void;

    getWidget(type: PageWidgetType): PageWidget | null;

    getWidgetAssert(type: PageWidgetType): PageWidget

    addWidget(ref: PageWidgetRef, refresh?: boolean): void;

    removeWidget(ref: PageWidgetType, refresh?: boolean): boolean;

    getWidgets(): PageWidget[];

}

export class Page implements IPage {

    readonly id: string;
    readonly root: HTMLElement;
    private readonly _widgets: PageWidget[];
    private readonly _widgetTypeMap: { [type: string]: number } = {};
    private _open: boolean = false;
    private _renderDispatch: RenderDispatch = RenderDispatch.null();

    constructor(id: string, root: HTMLElement, widgets: PageWidgetRef[] = []) {
        this.id = id;
        this.root = root;

        const processedWidgets: PageWidget[] = [];
        const processedWidgetTypes: { [t: string]: boolean } = {};
        for (let ref of widgets) {
            const solved: PageWidget = PageWidgets.solveRef(ref);
            if (processedWidgetTypes[solved.type]) continue;
            processedWidgetTypes[solved.type] = true;
            this._widgetTypeMap[solved.type] = processedWidgets.push(solved) - 1;
        }
        this._widgets = processedWidgets;
    }

    isOpen() {
        return this._open;
    }

    open() {
        if (!this._open) {
            for (let widget of this._widgets) widget.init(this);
            this._updateRenderTask();
        }
        this._open = true;
    }

    refresh() {
        if (!this._open) return;
        for (let widget of this._widgets) widget.refresh(this);
        this._updateRenderTask();
    }

    close() {
        if (this._open) {
            this._renderDispatch.interrupt();
            for (let widget of this._widgets) widget.destroy(this);
        }
        this._open = false;
    }

    getWidget(type: PageWidgetType): PageWidget | null {
        let index: number | undefined = this._widgetTypeMap[type as string];
        if (typeof index === "undefined") return null;
        return this._widgets[index];
    }

    getWidgetAssert(type: PageWidgetType): PageWidget {
        let ret: PageWidget | null = this.getWidget(type);
        if (ret === null) throw new Error("Page missing widget \"" + type + "\"");
        return ret;
    }

    addWidget(ref: PageWidgetRef, refresh?: boolean) {
        const widget: PageWidget = PageWidgets.solveRef(ref);
        this.removeWidget(widget.type, false);

        if (this._open) widget.init(this);
        this._widgetTypeMap[widget.type] = this._widgets.push(widget) - 1;
        if (this._open && refresh === true) {
            for (let w of this._widgets) {
                if (w.type === widget.type) continue;
                w.refresh(this);
            }
        }
    }

    removeWidget(ref: PageWidgetType, refresh?: boolean): boolean {
        let idx: number | undefined = this._widgetTypeMap[ref];
        if (typeof idx !== "undefined") {
            const remove: PageWidget = this._widgets.splice(idx, 1)[0];
            delete this._widgetTypeMap[ref];
            if (this._open) remove.destroy(this);
            if (refresh === true) this.refresh();
            return true;
        }
        return false;
    }

    getWidgets(): PageWidget[] {
        return [...this._widgets];
    }

    private _updateRenderTask() {
        this._renderDispatch.interrupt();

        if (!this._widgets.some((v: PageWidget) => v.renders)) return;

        this._renderDispatch = RenderDispatch.create();

        const me = this;
        this._renderDispatch.onRender((delta: number) => {
            for (let widget of me._widgets) {
                if (widget.renders) widget.render(me, delta);
            }
        });
    }

    static null(id: string): NullPageType {
        let ret: NullPageType;
        ret = {
            _open: true,
            id,
            isOpen: function () { return ret._open; },
            open() { },
            refresh() { },
            close() { },
            getWidget(type: PageWidgetType): PageWidget | null { return null; },
            getWidgetAssert(type: PageWidgetType): PageWidget { throw new Error("NullPage has no widgets!"); },
            addWidget(ref: PageWidgetRef, refresh?: boolean) {  },
            removeWidget(ref: PageWidgetType, refresh?: boolean): boolean { return false; },
            getWidgets(): PageWidget[] { return []; }
        };
        return ret;
    }

}

export type NullPageType = IPage & { _open: boolean };
