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

export const LoaderDOMContentToken = "dom-content";
declare type LoaderProtectedToken = "dom-content";
declare type LoaderToken = Exclude<string, LoaderProtectedToken>;

/**
 * Juggles multiple load events into a single event
 * using tokenized locks. May also manage a visual
 * representation of the page load.
 */
declare interface Loader {
    /**
     * Adds a token to the loader, the page will not be considered "loaded" until this token is removed.
     */
    addToken(token: LoaderToken): void;

    /**
     * Removes a token from the loader. If after "expireDelay" there are no tokens remaining on the loader,
     * the page is then considered loaded.
     */
    removeToken(token: LoaderToken): boolean;

    /**
     * Checks if the loader is currently retaining the given token.
     */
    hasToken(token: string): boolean;

    /**
     * Returns true if the loader has deemed the page loaded. In this case, onLoad callbacks fire immediately.
     */
    isLoaded(): boolean;

    /**
     * Force the loader to consider the page loaded if it has not already. This method will also quickly close any
     * visual effects that the loader manages.
     */
    forceLoad(): void;

    /**
     * Adds a callback to fire then whe loader considers the page loaded.
     */
    onLoad(callback: () => void): void;

    /**
     * Adds a callback to fire when a single given token is removed.
     */
    onRemoveToken(token: string, callback: () => void): void;

    /**
     * Gets the "expireDelay". This is the delay between the last token being removed from the loader, and the loader
     * setting the page as loaded.
     */
    getExpireDelay(): number;

    /**
     * Sets the "expireDelay". This is the delay between the last token being removed from the loader, and the loader
     * setting the page as loaded.
     */
    setExpireDelay(delay: number): void;
}

declare global {
    interface Window {
        /**
         * Loader supplied by the loader script
         */
        loader: Loader;
    }
}

export default Loader;
