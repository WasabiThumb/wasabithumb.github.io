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
