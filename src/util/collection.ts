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


export default class CollectionUtil {

    private static _nativeObjectValues = typeof Object === "function" && !!Object["values"];
    static mapValues<V>(map: { [k: string | number | symbol]: V }): V[] {
        if (this._nativeObjectValues) {
            return (Object as unknown as { values: ((v: any) => V[]) }).values(map);
        } else {
            let keys: string[] = Object.keys(map);
            let kl: number = keys.length;
            let values: V[] = new Array(kl) as V[];
            for (let i=0; i < kl; i++) values[i] = (map as { [k: string]: V })[keys[i]];
            return values;
        }
    }

}
