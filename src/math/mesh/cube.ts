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

import {Mesh, MeshBuilder, MeshGenerator} from "../mesh";
import {Vector3} from "../vector";

const R3_3: number = Math.sqrt(3) / 3;
export default class CubeMeshGenerator implements MeshGenerator {

    generate(scale: Vector3 | number = 1): Mesh {
        const mb = new MeshBuilder();

        mb.addQuad([ // -Z
            new Vector3(-R3_3, R3_3, -R3_3),
            new Vector3(R3_3, R3_3, -R3_3),
            new Vector3(R3_3, -R3_3, -R3_3),
            new Vector3(-R3_3, -R3_3, -R3_3)
        ], undefined, new Vector3(0, 0, -1));
        mb.addQuad([ // +Z
            new Vector3(R3_3, R3_3, R3_3),
            new Vector3(-R3_3, R3_3, R3_3),
            new Vector3(-R3_3, -R3_3, R3_3),
            new Vector3(R3_3, -R3_3, R3_3)
        ], undefined, new Vector3(0, 0, 1));
        mb.addQuad([ // +Y
            new Vector3(-R3_3, R3_3, R3_3),
            new Vector3(R3_3, R3_3, R3_3),
            new Vector3(R3_3, R3_3, -R3_3),
            new Vector3(-R3_3, R3_3, -R3_3)
        ], undefined, new Vector3(0, 1, 0));
        mb.addQuad([ // -Y
            new Vector3(-R3_3, -R3_3, -R3_3),
            new Vector3(R3_3, -R3_3, -R3_3),
            new Vector3(R3_3, -R3_3, R3_3),
            new Vector3(-R3_3, -R3_3, R3_3)
        ], undefined, new Vector3(0, -1, 0));
        mb.addQuad([ // -X
            new Vector3(-R3_3, R3_3, R3_3),
            new Vector3(-R3_3, R3_3, -R3_3),
            new Vector3(-R3_3, -R3_3, -R3_3),
            new Vector3(-R3_3, -R3_3, R3_3)
        ], undefined, new Vector3(-1, 0, 0));
        mb.addQuad([ // +X
            new Vector3(R3_3, R3_3, -R3_3),
            new Vector3(R3_3, R3_3, R3_3),
            new Vector3(R3_3, -R3_3, R3_3),
            new Vector3(R3_3, -R3_3, -R3_3)
        ], undefined, new Vector3(1, 0, 0));

        return mb.scale(scale).build();
    }

}
