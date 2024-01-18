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

export default class LoginPageWidget implements PageWidget {

    readonly renders: boolean = false;
    readonly type: PageWidgetType = "login";

    init(page: Page): void {
        console.log("i'm useless");
    }

    refresh(page: Page): void {
    }

    render(page: Page, delta: number): void {
    }

    destroy(page: Page): void {
    }

}