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

import Loader from "./util/loader";
import Navigator from "./struct/navigation";
import {LIB_VERSION} from "./util/version";
import KeyStore from "./struct/keystore";

const navigator: Navigator = new Navigator();
window.addEventListener("hashchange", () => {
    navigator.checkHash();
});
navigator.checkHash();

type MasterNavigator = Navigator;
declare global {
    interface Window {
        pages: MasterNavigator;
    }
}
window.pages = navigator;

const loader: Loader = window.loader;
loader.removeToken("bundle-load");
loader.onLoad(() => {
    console.log(`Loaded Portfolio bundle v${LIB_VERSION}`);
    if (LIB_VERSION.indexOf("git") >= 0) loader.forceLoad();
});


