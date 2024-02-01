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

// These shaders are compressed with LZMA. The vertex shader is very simple, simply passing through the
// screen-space texture coordinates to the fragment shader. The fragment shader is inspired by my Warp3D & Blot
// projects, implementing a fun & fast quad rasterizer. The concept was originally proven on shadertoy:
// https://www.shadertoy.com/view/lfjSWD

export const SHADER_VERTEX: string = `ズᴜ䴬❗〈Ǚ䫆㈠カᥜ二垅ͻ䶥棒潮ᶅ㐈ઌ垇⎫䦕۞潲㈝䊂仌ᜧ䭋㦟఺盐ື婙Ѝ嘖䭱₤䃶ਠတ࠙涋粅夁眐橨⣏㤖ࠌք̒䧞ᒿ᪢‽栿ὀ耀`;
export const SHADER_FRAGMENT: string = `㠹ᥘ洮㚖筱Ƶ䫈極㚸࠙䶍瘗⇘⧙䋤祩㜳䠝䲬㌢β冕烨畲㊡寛湌䎰厫㦥䳞牭္塛⸍䙗ᆒႁ檧䘋攎ㅑ搎ഁ୾䁅殠ᅴ栈嬴ȭ㴁ୖ䁅冔ᅩ㜺ࠝ䲮ⴥ㍋ᶡ桶૆۳2⪥๐ݫ嗛䨁朩ွ䊈Є౲箱÷ဲ⹸ᷢ䙚Ⳅʌ⋑ô穀ㄩ္ᥝຮ⛢Ń墀婀瀩ဗ䠊ຘ催ㅮᤙ䖖䙹昌嶍䐇刂䍁´䃔⤠ᔐᯈֹョؠ㦬䁚⁬戇ᴈչョ⽘Ȱ淈᠗఺‑䋓ॱ䌵繤‽ေࠊ䐌ⳁ㍖ၙ呀⫤£犅䴘䅦䄁⮐ʙ䨖㙢֛Ѕ⹀ಮ⡙垈ᙫပ㤀㍙Ⅷㆎᆸ摀ⴠᤗఱ຺ӗㆩΐǭ伣㔐ૈെ⹀ۡ↿䠂଩撏ㆊ墨繀࢓ࢀ婀棄ᑳ䁌敄܌⫩Ⲁ僬ㄠᖐᨱ䢮ు䥎ၛỒ氠ᖐᬱ䒎乀૆傑噀⬠㗣झ㲀ᛢ乃ণᑑ搁ዳ-㤢㺠෦ᤄ䁗䴙ဖ䠚碃庰Г墀呀盆⽤兺䀞ృᜨσ઩攁糲䂈汘䖮䀈䞰ʇ䥄撚嫺⺐াᔝ懐ɓ携㥀❸摜㥮᣿Ყ䩁㟢嘹䀑佀೯ᐃ及˂撐焓ᢤ᱑昪᧓ࠊ痫C璒㲀ൖ冖▻堂懅ݣບᲀᢞ砉᜜⿊Ƴᐱ㄂夊ౠ癉矴ɓ䩋瞀攳ޙᎏ』ᷓᒹ卉疁ോ㳀⍜嬇ဃהİ㫢ŝ嵠㿃⤁珴߶盤Ǒ窀⛜瀑侈Ϸ丁曨ȵ獐䙸搢彘࠳堉χጚ㩁᤼䀌⼠ϫ嘁⯇ማ䠏㲀ऒ帢催䃬㓆ົൈޤܷஓ傡汫洅ᬹᥝМ䁍䦯ᐌ剮‭ျ൹¬ᝣ㝐Їࡈ㻄ኘࠉ䓘匣懩Ç嘂ᅲ㋳䀳娉抽㩷᠕ᡟ瘁⫦ᕟ㶠摕㝨ᤔ姎Ã㦺翁䧿灢ᎡǑ灀㴠㡲ᲀᯎ⠝巏娂穢成礀桼偧䜨ࢇ᱂摩㌳ᘹ²㞂ũǓ嘍䕡ㄹ䨱⎥Ṡሩ䞠ř䭾㳲䅾ᶀ枬䋮⢕䖈◥ț穀奙䉞䀹ސҾ瑹犃䢘伸惌ㄫ瞰ʷ攇␺ḱӼ倉朠֡泞楤ံ塚ⷅ໠ੳ垐ѳ标懶Ȫ磫Ṁܫ垬о痩Ď簀ᴜ䀙䘲⥛ᲔⰠ㫣卲ਮ沵ஶ䵇ࠂ杬⾣Ი⳨㛶捻䢀穀瓆⢙ᄊᴁጂ木▀僪ⱶᓲ䃷᳁ड़戟᠄ᾔᓦ熁姫睦⬙傠恘⃇Ɣ仂侠耀`;
