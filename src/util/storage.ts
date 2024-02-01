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

let _ssp: SessionStorageProvider;
let _sspInit: boolean = false;
const getSSP = (() => {
    if (!_sspInit) {
        if (!!window["sessionStorage"]) {
            _ssp = new NativeSessionStorageProvider();
        } else {
            _ssp = new CookieSessionStorageProvider();
        }
    }
    _sspInit = true;
    return _ssp;
});

const SessionStorage = new class implements SessionStorageProvider {

    get(key: string): string | null {
        return getSSP().get(key);
    }

    has(key: string): boolean {
        return getSSP().has(key);
    }

    remove(key: string): void {
        getSSP().remove(key);
    }

    set(key: string, value: string): void {
        getSSP().set(key, value);
    }

};
export default SessionStorage;

//

interface SessionStorageProvider {

    get(key: string): string | null;

    set(key: string, value: string): void;

    has(key: string): boolean;

    remove(key: string): void;

}

class NativeSessionStorageProvider implements SessionStorageProvider {

    get(key: string): string | null {
        return window.sessionStorage.getItem(key);
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    set(key: string, value: string): void {
        window.sessionStorage.setItem(key, value);
    }

    remove(key: string): void {
        window.sessionStorage.removeItem(key);
    }

}

class CookieSessionStorageProvider implements SessionStorageProvider {

    get(key: string): string | null {
        const keyEq = `${key}=`;
        const keyStart = keyEq.charAt(0);
        const components: string[] = document.cookie.split(";");

        outer:
            for (let i=0; i < components.length; i++) {
                const component: string = components[i];
                let z: number = 0;
                while (z < component.length) {
                    const char = component.charAt(z);
                    if (char === keyStart) break;
                    if (char !== " ") continue outer;
                    z++;
                }
                if (component.indexOf(keyEq) === z) return component.substring(z + keyEq.length, component.length);
            }
        return null;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    set(key: string, value: string): void {
        const date = new Date();
        date.setTime(date.getTime() + 900000);
        document.cookie = `${key}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
    }

    remove(key: string): void {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }

}
