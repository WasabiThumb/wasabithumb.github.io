import { Page } from "./page";
import ShowcasePageWidget from "../widget/showcase";

export type PageWidgetType = "main-showcase";

export interface PageWidget {

    readonly type: PageWidgetType;

    readonly renders: boolean;

    init(page: Page): void;

    refresh(page: Page): void;

    render(page: Page, delta: number): void;

    destroy(page: Page): void;

}

export abstract class PageWidgetAdapter implements PageWidget {

    abstract readonly type: PageWidgetType;
    readonly renders: boolean = false;

    init(page: Page) { }

    refresh(page: Page) { }

    render(page: Page, delta: number) { }

    destroy(page: Page) { }

}

export type PageWidgetRef = PageWidget | PageWidgetType;

type PageWidgetImplClass = { new(): PageWidget };

export class PageWidgets {

    private static REGISTRY: { [type: string]: PageWidgetImplClass } = {};
    private static INIT_DEFAULTS: boolean = false;

    static registerDefaults() {
        this.register(
            ShowcasePageWidget
        );
        this.INIT_DEFAULTS = true;
    }

    static register(...classes: PageWidgetImplClass[]) {
        for (let clazz of classes) {
            this.REGISTRY[(new clazz()).type] = clazz;
        }
    }

    static create(type: PageWidgetType): PageWidget {
        if (!this.INIT_DEFAULTS) this.registerDefaults();
        const impl: PageWidgetImplClass = this.REGISTRY[type]!!;
        return new impl();
    }

    static createOrNull(type: string): PageWidget | null {
        if (!this.INIT_DEFAULTS) this.registerDefaults();
        const impl: PageWidgetImplClass | undefined = this.REGISTRY[type];
        if (typeof impl === "undefined") return null;
        return new impl();
    }

    static solveRef(ref: PageWidgetRef): PageWidget {
        if (typeof ref === "string") {
            return this.create(ref as PageWidgetType);
        } else {
            return ref as PageWidget;
        }
    }

}
