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

import {PageWidget, PageWidgetType} from "../struct/widget";
import {Page} from "../struct/page";
import {ConstantData, ConstantDataMap} from "../util/constdata";

export default class ConstantsPageWidget implements PageWidget {

    readonly type: PageWidgetType = "constants";
    readonly renders: boolean = false;

    init(page: Page) {
        const selected = page.root.querySelectorAll(`[data-const]`);

        let any = false;
        for (let i=0; i < selected.length; i++) {
            const element: HTMLElement = selected.item(i) as HTMLElement;

            const key: string = element.getAttribute("data-const")!;
            let constant: string;
            if (key in ConstantData) {
                constant = ConstantData[key as keyof ConstantDataMap];
            } else {
                continue;
            }

            if (element instanceof HTMLImageElement
                || element instanceof HTMLMediaElement
                || element instanceof HTMLSourceElement
            ) {
                element.src = constant;
            } else {
                element.innerText = constant;
            }
            any = true;
        }

        if (!any) console.warn(`Constants widget found no targets (Page: ${page.id}). Consider removing it`);
    }

    destroy(page: Page): void {
    }

    refresh(page: Page): void {
    }

    render(page: Page, delta: number): void {
    }

}
