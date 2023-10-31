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

export default class ShowcasePageWidget implements PageWidget {

    readonly type: PageWidgetType = "main-showcase";
    readonly renders: true = true;

    init(page: Page) {
        console.log(page);
    }

    refresh(page: Page) {
    }

    render(page: Page, delta: number) {
    }

    destroy(page: Page) {
    }

}
