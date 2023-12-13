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

import { Page } from "./page";
import ShowcasePageWidget from "../widget/showcase";
import ConstantsPageWidget from "../widget/constants";
import LoginPageWidget from "../widget/login";

export type PageWidgetType = "main-showcase" | "constants" | "login";

export interface PageWidget {

    readonly type: PageWidgetType;

    readonly renders: boolean;

    init(page: Page): void;

    refresh(page: Page): void;

    render(page: Page, delta: number): void;

    destroy(page: Page): void;

}

export type PageWidgetRef = PageWidget | PageWidgetType;

type PageWidgetImplClass = { new(): PageWidget };

export class PageWidgets {

    private static REGISTRY: { [type: string]: PageWidgetImplClass } = {};
    private static INIT_DEFAULTS: boolean = false;

    static registerDefaults() {
        this.register(
            ShowcasePageWidget,
            ConstantsPageWidget,
            LoginPageWidget,
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
