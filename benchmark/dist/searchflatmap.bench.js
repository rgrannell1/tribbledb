// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function unwrap(val) {
    return typeof val === "function" ? val() : val;
}
function from(elem, size) {
    return ()=>{
        const sizeTgt = unwrap(size);
        const elems = [];
        for(let idx = 0; idx < sizeTgt; idx++){
            elems[idx] = unwrap(elem);
        }
        return elems;
    };
}
function concat(...elems) {
    return ()=>{
        return elems.map((elem)=>unwrap(elem));
    };
}
function choose(elems, density) {
    return ()=>{
        const concreteElems = unwrap(elems);
        const subsetCount = BigInt(2) ^ BigInt(concreteElems.length);
        const index = unwrap(density(BigInt(0), subsetCount));
        const bits = index.toString(2).padStart(concreteElems.length, "0").split("");
        const output = [];
        for(let idx = 0; idx < bits.length; idx++){
            if (bits[idx] === "1") {
                output.push(concreteElems[idx]);
            }
        }
        return output;
    };
}
const mod = {
    from: from,
    concat: concat,
    choose: choose
};
function oneOf(density, elems) {
    return ()=>{
        const data = unwrap(elems);
        const idx = unwrap(density(0, data.length));
        if (data.length === 0) {
            throw new Error("Cannot retrieve value from empty collection");
        }
        return unwrap(data[idx]);
    };
}
function allOf(elems) {
    return ()=>{
        const data = unwrap(elems);
        return data.map((elem)=>unwrap(elem));
    };
}
function oneOfKey(density, elems) {
    return ()=>{
        const data = Object.keys(unwrap(elems));
        const idx = unwrap(density(0, data.length));
        if (data.length === 0) {
            throw new Error("Cannot retrieve value from empty dictionary");
        }
        return data[idx];
    };
}
function oneOfValue(density, elems) {
    return ()=>{
        const data = Object.values(unwrap(elems));
        const idx = unwrap(density(0, data.length));
        if (data.length === 0) {
            throw new Error("Cannot retrieve value from empty dictionary");
        }
        return data[idx];
    };
}
function oneOfEntry(density, elems) {
    return ()=>{
        const data = Object.entries(unwrap(elems));
        const idx = unwrap(density(0, data.length));
        if (data.length === 0) {
            throw new Error("Cannot retrieve value from empty dictionary");
        }
        return data[idx];
    };
}
function mapped(fn, gen) {
    return ()=>{
        return fn(unwrap(gen));
    };
}
function filtered(pred, gen) {
    return ()=>{
        while(true){
            const val = unwrap(gen);
            if (pred(val)) {
                return val;
            }
        }
    };
}
const mod1 = {
    oneOf: oneOf,
    allOf: allOf,
    oneOfKey: oneOfKey,
    oneOfValue: oneOfValue,
    oneOfEntry: oneOfEntry,
    mapped: mapped,
    filtered: filtered
};
function uniform(from, to) {
    return ()=>{
        const lower = unwrap(from);
        const upper = unwrap(to);
        return Math.floor(Math.random() * (upper - lower) + lower);
    };
}
function uniformContinuous(from, to) {
    return ()=>{
        const lower = unwrap(from);
        const upper = unwrap(to);
        return Math.random() * (upper - lower) + lower;
    };
}
function enumerate(from, to) {
    const concreteFrom = unwrap(from);
    const concreteTo = unwrap(to);
    let idx = concreteFrom;
    return ()=>{
        const returned = idx;
        idx++;
        if (idx >= concreteTo) {
            idx = concreteFrom;
        }
        return returned;
    };
}
const mod2 = {
    uniform: uniform,
    uniformContinuous: uniformContinuous,
    enumerate: enumerate
};
function from1(elem, size) {
    return ()=>{
        const sizeTgt = unwrap(size);
        const elems = new Set();
        for(let idx = 0; idx < sizeTgt; idx++){
            elems.add(unwrap(elem));
        }
        return elems;
    };
}
function choose1(elems, density) {
    return ()=>{
        const concreteElems = Array.from(unwrap(elems));
        const subsetCount = BigInt(2) ^ BigInt(concreteElems.length);
        const index = unwrap(density(BigInt(0), subsetCount));
        const bits = index.toString(2).padStart(concreteElems.length, "0").split("");
        const output = [];
        for(let idx = 0; idx < bits.length; idx++){
            if (bits[idx] === "1") {
                output.push(concreteElems[idx]);
            }
        }
        return output;
    };
}
function concat1(...elems) {
    return ()=>{
        const output = new Set();
        for (const elem of elems){
            output.add(unwrap(elem));
        }
        return output;
    };
}
const mod3 = {
    from: from1,
    choose: choose1,
    concat: concat1
};
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const __default = JSON.parse("[\n  {\n    \"category\": \"Control Character\",\n    \"hexrange\": [\n      \"0000\",\n      \"001F\"\n    ],\n    \"range\": [\n      0,\n      31\n    ]\n  },\n  {\n    \"category\": \"Basic Latin\",\n    \"hexrange\": [\n      \"0020\",\n      \"007F\"\n    ],\n    \"range\": [\n      32,\n      127\n    ]\n  },\n  {\n    \"category\": \"Latin-1 Supplement\",\n    \"hexrange\": [\n      \"0080\",\n      \"00FF\"\n    ],\n    \"range\": [\n      128,\n      255\n    ]\n  },\n  {\n    \"category\": \"Latin Extended-A\",\n    \"hexrange\": [\n      \"0100\",\n      \"017F\"\n    ],\n    \"range\": [\n      256,\n      383\n    ]\n  },\n  {\n    \"category\": \"Latin Extended-B\",\n    \"hexrange\": [\n      \"0180\",\n      \"024F\"\n    ],\n    \"range\": [\n      384,\n      591\n    ]\n  },\n  {\n    \"category\": \"IPA Extensions\",\n    \"hexrange\": [\n      \"0250\",\n      \"02AF\"\n    ],\n    \"range\": [\n      592,\n      687\n    ]\n  },\n  {\n    \"category\": \"Spacing Modifier Letters\",\n    \"hexrange\": [\n      \"02B0\",\n      \"02FF\"\n    ],\n    \"range\": [\n      688,\n      767\n    ]\n  },\n  {\n    \"category\": \"Combining Diacritical Marks\",\n    \"hexrange\": [\n      \"0300\",\n      \"036F\"\n    ],\n    \"range\": [\n      768,\n      879\n    ]\n  },\n  {\n    \"category\": \"Greek and Coptic\",\n    \"hexrange\": [\n      \"0370\",\n      \"03FF\"\n    ],\n    \"range\": [\n      880,\n      1023\n    ]\n  },\n  {\n    \"category\": \"Cyrillic\",\n    \"hexrange\": [\n      \"0400\",\n      \"04FF\"\n    ],\n    \"range\": [\n      1024,\n      1279\n    ]\n  },\n  {\n    \"category\": \"Cyrillic Supplement\",\n    \"hexrange\": [\n      \"0500\",\n      \"052F\"\n    ],\n    \"range\": [\n      1280,\n      1327\n    ]\n  },\n  {\n    \"category\": \"Armenian\",\n    \"hexrange\": [\n      \"0530\",\n      \"058F\"\n    ],\n    \"range\": [\n      1328,\n      1423\n    ]\n  },\n  {\n    \"category\": \"Hebrew\",\n    \"hexrange\": [\n      \"0590\",\n      \"05FF\"\n    ],\n    \"range\": [\n      1424,\n      1535\n    ]\n  },\n  {\n    \"category\": \"Arabic\",\n    \"hexrange\": [\n      \"0600\",\n      \"06FF\"\n    ],\n    \"range\": [\n      1536,\n      1791\n    ]\n  },\n  {\n    \"category\": \"Syriac\",\n    \"hexrange\": [\n      \"0700\",\n      \"074F\"\n    ],\n    \"range\": [\n      1792,\n      1871\n    ]\n  },\n  {\n    \"category\": \"Arabic Supplement\",\n    \"hexrange\": [\n      \"0750\",\n      \"077F\"\n    ],\n    \"range\": [\n      1872,\n      1919\n    ]\n  },\n  {\n    \"category\": \"Thaana\",\n    \"hexrange\": [\n      \"0780\",\n      \"07BF\"\n    ],\n    \"range\": [\n      1920,\n      1983\n    ]\n  },\n  {\n    \"category\": \"NKo\",\n    \"hexrange\": [\n      \"07C0\",\n      \"07FF\"\n    ],\n    \"range\": [\n      1984,\n      2047\n    ]\n  },\n  {\n    \"category\": \"Samaritan\",\n    \"hexrange\": [\n      \"0800\",\n      \"083F\"\n    ],\n    \"range\": [\n      2048,\n      2111\n    ]\n  },\n  {\n    \"category\": \"Mandaic\",\n    \"hexrange\": [\n      \"0840\",\n      \"085F\"\n    ],\n    \"range\": [\n      2112,\n      2143\n    ]\n  },\n  {\n    \"category\": \"Arabic Extended-A\",\n    \"hexrange\": [\n      \"08A0\",\n      \"08FF\"\n    ],\n    \"range\": [\n      2208,\n      2303\n    ]\n  },\n  {\n    \"category\": \"Devanagari\",\n    \"hexrange\": [\n      \"0900\",\n      \"097F\"\n    ],\n    \"range\": [\n      2304,\n      2431\n    ]\n  },\n  {\n    \"category\": \"Bengali\",\n    \"hexrange\": [\n      \"0980\",\n      \"09FF\"\n    ],\n    \"range\": [\n      2432,\n      2559\n    ]\n  },\n  {\n    \"category\": \"Gurmukhi\",\n    \"hexrange\": [\n      \"0A00\",\n      \"0A7F\"\n    ],\n    \"range\": [\n      2560,\n      2687\n    ]\n  },\n  {\n    \"category\": \"Gujarati\",\n    \"hexrange\": [\n      \"0A80\",\n      \"0AFF\"\n    ],\n    \"range\": [\n      2688,\n      2815\n    ]\n  },\n  {\n    \"category\": \"Oriya\",\n    \"hexrange\": [\n      \"0B00\",\n      \"0B7F\"\n    ],\n    \"range\": [\n      2816,\n      2943\n    ]\n  },\n  {\n    \"category\": \"Tamil\",\n    \"hexrange\": [\n      \"0B80\",\n      \"0BFF\"\n    ],\n    \"range\": [\n      2944,\n      3071\n    ]\n  },\n  {\n    \"category\": \"Telugu\",\n    \"hexrange\": [\n      \"0C00\",\n      \"0C7F\"\n    ],\n    \"range\": [\n      3072,\n      3199\n    ]\n  },\n  {\n    \"category\": \"Kannada\",\n    \"hexrange\": [\n      \"0C80\",\n      \"0CFF\"\n    ],\n    \"range\": [\n      3200,\n      3327\n    ]\n  },\n  {\n    \"category\": \"Malayalam\",\n    \"hexrange\": [\n      \"0D00\",\n      \"0D7F\"\n    ],\n    \"range\": [\n      3328,\n      3455\n    ]\n  },\n  {\n    \"category\": \"Sinhala\",\n    \"hexrange\": [\n      \"0D80\",\n      \"0DFF\"\n    ],\n    \"range\": [\n      3456,\n      3583\n    ]\n  },\n  {\n    \"category\": \"Thai\",\n    \"hexrange\": [\n      \"0E00\",\n      \"0E7F\"\n    ],\n    \"range\": [\n      3584,\n      3711\n    ]\n  },\n  {\n    \"category\": \"Lao\",\n    \"hexrange\": [\n      \"0E80\",\n      \"0EFF\"\n    ],\n    \"range\": [\n      3712,\n      3839\n    ]\n  },\n  {\n    \"category\": \"Tibetan\",\n    \"hexrange\": [\n      \"0F00\",\n      \"0FFF\"\n    ],\n    \"range\": [\n      3840,\n      4095\n    ]\n  },\n  {\n    \"category\": \"Myanmar\",\n    \"hexrange\": [\n      \"1000\",\n      \"109F\"\n    ],\n    \"range\": [\n      4096,\n      4255\n    ]\n  },\n  {\n    \"category\": \"Georgian\",\n    \"hexrange\": [\n      \"10A0\",\n      \"10FF\"\n    ],\n    \"range\": [\n      4256,\n      4351\n    ]\n  },\n  {\n    \"category\": \"Hangul Jamo\",\n    \"hexrange\": [\n      \"1100\",\n      \"11FF\"\n    ],\n    \"range\": [\n      4352,\n      4607\n    ]\n  },\n  {\n    \"category\": \"Ethiopic\",\n    \"hexrange\": [\n      \"1200\",\n      \"137F\"\n    ],\n    \"range\": [\n      4608,\n      4991\n    ]\n  },\n  {\n    \"category\": \"Ethiopic Supplement\",\n    \"hexrange\": [\n      \"1380\",\n      \"139F\"\n    ],\n    \"range\": [\n      4992,\n      5023\n    ]\n  },\n  {\n    \"category\": \"Cherokee\",\n    \"hexrange\": [\n      \"13A0\",\n      \"13FF\"\n    ],\n    \"range\": [\n      5024,\n      5119\n    ]\n  },\n  {\n    \"category\": \"Unified Canadian Aboriginal Syllabics\",\n    \"hexrange\": [\n      \"1400\",\n      \"167F\"\n    ],\n    \"range\": [\n      5120,\n      5759\n    ]\n  },\n  {\n    \"category\": \"Ogham\",\n    \"hexrange\": [\n      \"1680\",\n      \"169F\"\n    ],\n    \"range\": [\n      5760,\n      5791\n    ]\n  },\n  {\n    \"category\": \"Runic\",\n    \"hexrange\": [\n      \"16A0\",\n      \"16FF\"\n    ],\n    \"range\": [\n      5792,\n      5887\n    ]\n  },\n  {\n    \"category\": \"Tagalog\",\n    \"hexrange\": [\n      \"1700\",\n      \"171F\"\n    ],\n    \"range\": [\n      5888,\n      5919\n    ]\n  },\n  {\n    \"category\": \"Hanunoo\",\n    \"hexrange\": [\n      \"1720\",\n      \"173F\"\n    ],\n    \"range\": [\n      5920,\n      5951\n    ]\n  },\n  {\n    \"category\": \"Buhid\",\n    \"hexrange\": [\n      \"1740\",\n      \"175F\"\n    ],\n    \"range\": [\n      5952,\n      5983\n    ]\n  },\n  {\n    \"category\": \"Tagbanwa\",\n    \"hexrange\": [\n      \"1760\",\n      \"177F\"\n    ],\n    \"range\": [\n      5984,\n      6015\n    ]\n  },\n  {\n    \"category\": \"Khmer\",\n    \"hexrange\": [\n      \"1780\",\n      \"17FF\"\n    ],\n    \"range\": [\n      6016,\n      6143\n    ]\n  },\n  {\n    \"category\": \"Mongolian\",\n    \"hexrange\": [\n      \"1800\",\n      \"18AF\"\n    ],\n    \"range\": [\n      6144,\n      6319\n    ]\n  },\n  {\n    \"category\": \"Unified Canadian Aboriginal Syllabics Extended\",\n    \"hexrange\": [\n      \"18B0\",\n      \"18FF\"\n    ],\n    \"range\": [\n      6320,\n      6399\n    ]\n  },\n  {\n    \"category\": \"Limbu\",\n    \"hexrange\": [\n      \"1900\",\n      \"194F\"\n    ],\n    \"range\": [\n      6400,\n      6479\n    ]\n  },\n  {\n    \"category\": \"Tai Le\",\n    \"hexrange\": [\n      \"1950\",\n      \"197F\"\n    ],\n    \"range\": [\n      6480,\n      6527\n    ]\n  },\n  {\n    \"category\": \"New Tai Lue\",\n    \"hexrange\": [\n      \"1980\",\n      \"19DF\"\n    ],\n    \"range\": [\n      6528,\n      6623\n    ]\n  },\n  {\n    \"category\": \"Khmer Symbols\",\n    \"hexrange\": [\n      \"19E0\",\n      \"19FF\"\n    ],\n    \"range\": [\n      6624,\n      6655\n    ]\n  },\n  {\n    \"category\": \"Buginese\",\n    \"hexrange\": [\n      \"1A00\",\n      \"1A1F\"\n    ],\n    \"range\": [\n      6656,\n      6687\n    ]\n  },\n  {\n    \"category\": \"Tai Tham\",\n    \"hexrange\": [\n      \"1A20\",\n      \"1AAF\"\n    ],\n    \"range\": [\n      6688,\n      6831\n    ]\n  },\n  {\n    \"category\": \"Combining Diacritical Marks Extended\",\n    \"hexrange\": [\n      \"1AB0\",\n      \"1AFF\"\n    ],\n    \"range\": [\n      6832,\n      6911\n    ]\n  },\n  {\n    \"category\": \"Balinese\",\n    \"hexrange\": [\n      \"1B00\",\n      \"1B7F\"\n    ],\n    \"range\": [\n      6912,\n      7039\n    ]\n  },\n  {\n    \"category\": \"Sundanese\",\n    \"hexrange\": [\n      \"1B80\",\n      \"1BBF\"\n    ],\n    \"range\": [\n      7040,\n      7103\n    ]\n  },\n  {\n    \"category\": \"Batak\",\n    \"hexrange\": [\n      \"1BC0\",\n      \"1BFF\"\n    ],\n    \"range\": [\n      7104,\n      7167\n    ]\n  },\n  {\n    \"category\": \"Lepcha\",\n    \"hexrange\": [\n      \"1C00\",\n      \"1C4F\"\n    ],\n    \"range\": [\n      7168,\n      7247\n    ]\n  },\n  {\n    \"category\": \"Ol Chiki\",\n    \"hexrange\": [\n      \"1C50\",\n      \"1C7F\"\n    ],\n    \"range\": [\n      7248,\n      7295\n    ]\n  },\n  {\n    \"category\": \"Sundanese Supplement\",\n    \"hexrange\": [\n      \"1CC0\",\n      \"1CCF\"\n    ],\n    \"range\": [\n      7360,\n      7375\n    ]\n  },\n  {\n    \"category\": \"Vedic Extensions\",\n    \"hexrange\": [\n      \"1CD0\",\n      \"1CFF\"\n    ],\n    \"range\": [\n      7376,\n      7423\n    ]\n  },\n  {\n    \"category\": \"Phonetic Extensions\",\n    \"hexrange\": [\n      \"1D00\",\n      \"1D7F\"\n    ],\n    \"range\": [\n      7424,\n      7551\n    ]\n  },\n  {\n    \"category\": \"Phonetic Extensions Supplement\",\n    \"hexrange\": [\n      \"1D80\",\n      \"1DBF\"\n    ],\n    \"range\": [\n      7552,\n      7615\n    ]\n  },\n  {\n    \"category\": \"Combining Diacritical Marks Supplement\",\n    \"hexrange\": [\n      \"1DC0\",\n      \"1DFF\"\n    ],\n    \"range\": [\n      7616,\n      7679\n    ]\n  },\n  {\n    \"category\": \"Latin Extended Additional\",\n    \"hexrange\": [\n      \"1E00\",\n      \"1EFF\"\n    ],\n    \"range\": [\n      7680,\n      7935\n    ]\n  },\n  {\n    \"category\": \"Greek Extended\",\n    \"hexrange\": [\n      \"1F00\",\n      \"1FFF\"\n    ],\n    \"range\": [\n      7936,\n      8191\n    ]\n  },\n  {\n    \"category\": \"General Punctuation\",\n    \"hexrange\": [\n      \"2000\",\n      \"206F\"\n    ],\n    \"range\": [\n      8192,\n      8303\n    ]\n  },\n  {\n    \"category\": \"Superscripts and Subscripts\",\n    \"hexrange\": [\n      \"2070\",\n      \"209F\"\n    ],\n    \"range\": [\n      8304,\n      8351\n    ]\n  },\n  {\n    \"category\": \"Currency Symbols\",\n    \"hexrange\": [\n      \"20A0\",\n      \"20CF\"\n    ],\n    \"range\": [\n      8352,\n      8399\n    ]\n  },\n  {\n    \"category\": \"Combining Diacritical Marks for Symbols\",\n    \"hexrange\": [\n      \"20D0\",\n      \"20FF\"\n    ],\n    \"range\": [\n      8400,\n      8447\n    ]\n  },\n  {\n    \"category\": \"Letterlike Symbols\",\n    \"hexrange\": [\n      \"2100\",\n      \"214F\"\n    ],\n    \"range\": [\n      8448,\n      8527\n    ]\n  },\n  {\n    \"category\": \"Number Forms\",\n    \"hexrange\": [\n      \"2150\",\n      \"218F\"\n    ],\n    \"range\": [\n      8528,\n      8591\n    ]\n  },\n  {\n    \"category\": \"Arrows\",\n    \"hexrange\": [\n      \"2190\",\n      \"21FF\"\n    ],\n    \"range\": [\n      8592,\n      8703\n    ]\n  },\n  {\n    \"category\": \"Mathematical Operators\",\n    \"hexrange\": [\n      \"2200\",\n      \"22FF\"\n    ],\n    \"range\": [\n      8704,\n      8959\n    ]\n  },\n  {\n    \"category\": \"Miscellaneous Technical\",\n    \"hexrange\": [\n      \"2300\",\n      \"23FF\"\n    ],\n    \"range\": [\n      8960,\n      9215\n    ]\n  },\n  {\n    \"category\": \"Control Pictures\",\n    \"hexrange\": [\n      \"2400\",\n      \"243F\"\n    ],\n    \"range\": [\n      9216,\n      9279\n    ]\n  },\n  {\n    \"category\": \"Optical Character Recognition\",\n    \"hexrange\": [\n      \"2440\",\n      \"245F\"\n    ],\n    \"range\": [\n      9280,\n      9311\n    ]\n  },\n  {\n    \"category\": \"Enclosed Alphanumerics\",\n    \"hexrange\": [\n      \"2460\",\n      \"24FF\"\n    ],\n    \"range\": [\n      9312,\n      9471\n    ]\n  },\n  {\n    \"category\": \"Box Drawing\",\n    \"hexrange\": [\n      \"2500\",\n      \"257F\"\n    ],\n    \"range\": [\n      9472,\n      9599\n    ]\n  },\n  {\n    \"category\": \"Block Elements\",\n    \"hexrange\": [\n      \"2580\",\n      \"259F\"\n    ],\n    \"range\": [\n      9600,\n      9631\n    ]\n  },\n  {\n    \"category\": \"Geometric Shapes\",\n    \"hexrange\": [\n      \"25A0\",\n      \"25FF\"\n    ],\n    \"range\": [\n      9632,\n      9727\n    ]\n  },\n  {\n    \"category\": \"Miscellaneous Symbols\",\n    \"hexrange\": [\n      \"2600\",\n      \"26FF\"\n    ],\n    \"range\": [\n      9728,\n      9983\n    ]\n  },\n  {\n    \"category\": \"Dingbats\",\n    \"hexrange\": [\n      \"2700\",\n      \"27BF\"\n    ],\n    \"range\": [\n      9984,\n      10175\n    ]\n  },\n  {\n    \"category\": \"Miscellaneous Mathematical Symbols-A\",\n    \"hexrange\": [\n      \"27C0\",\n      \"27EF\"\n    ],\n    \"range\": [\n      10176,\n      10223\n    ]\n  },\n  {\n    \"category\": \"Supplemental Arrows-A\",\n    \"hexrange\": [\n      \"27F0\",\n      \"27FF\"\n    ],\n    \"range\": [\n      10224,\n      10239\n    ]\n  },\n  {\n    \"category\": \"Braille Patterns\",\n    \"hexrange\": [\n      \"2800\",\n      \"28FF\"\n    ],\n    \"range\": [\n      10240,\n      10495\n    ]\n  },\n  {\n    \"category\": \"Supplemental Arrows-B\",\n    \"hexrange\": [\n      \"2900\",\n      \"297F\"\n    ],\n    \"range\": [\n      10496,\n      10623\n    ]\n  },\n  {\n    \"category\": \"Miscellaneous Mathematical Symbols-B\",\n    \"hexrange\": [\n      \"2980\",\n      \"29FF\"\n    ],\n    \"range\": [\n      10624,\n      10751\n    ]\n  },\n  {\n    \"category\": \"Supplemental Mathematical Operators\",\n    \"hexrange\": [\n      \"2A00\",\n      \"2AFF\"\n    ],\n    \"range\": [\n      10752,\n      11007\n    ]\n  },\n  {\n    \"category\": \"Miscellaneous Symbols and Arrows\",\n    \"hexrange\": [\n      \"2B00\",\n      \"2BFF\"\n    ],\n    \"range\": [\n      11008,\n      11263\n    ]\n  },\n  {\n    \"category\": \"Glagolitic\",\n    \"hexrange\": [\n      \"2C00\",\n      \"2C5F\"\n    ],\n    \"range\": [\n      11264,\n      11359\n    ]\n  },\n  {\n    \"category\": \"Latin Extended-C\",\n    \"hexrange\": [\n      \"2C60\",\n      \"2C7F\"\n    ],\n    \"range\": [\n      11360,\n      11391\n    ]\n  },\n  {\n    \"category\": \"Coptic\",\n    \"hexrange\": [\n      \"2C80\",\n      \"2CFF\"\n    ],\n    \"range\": [\n      11392,\n      11519\n    ]\n  },\n  {\n    \"category\": \"Georgian Supplement\",\n    \"hexrange\": [\n      \"2D00\",\n      \"2D2F\"\n    ],\n    \"range\": [\n      11520,\n      11567\n    ]\n  },\n  {\n    \"category\": \"Tifinagh\",\n    \"hexrange\": [\n      \"2D30\",\n      \"2D7F\"\n    ],\n    \"range\": [\n      11568,\n      11647\n    ]\n  },\n  {\n    \"category\": \"Ethiopic Extended\",\n    \"hexrange\": [\n      \"2D80\",\n      \"2DDF\"\n    ],\n    \"range\": [\n      11648,\n      11743\n    ]\n  },\n  {\n    \"category\": \"Cyrillic Extended-A\",\n    \"hexrange\": [\n      \"2DE0\",\n      \"2DFF\"\n    ],\n    \"range\": [\n      11744,\n      11775\n    ]\n  },\n  {\n    \"category\": \"Supplemental Punctuation\",\n    \"hexrange\": [\n      \"2E00\",\n      \"2E7F\"\n    ],\n    \"range\": [\n      11776,\n      11903\n    ]\n  },\n  {\n    \"category\": \"CJK Radicals Supplement\",\n    \"hexrange\": [\n      \"2E80\",\n      \"2EFF\"\n    ],\n    \"range\": [\n      11904,\n      12031\n    ]\n  },\n  {\n    \"category\": \"Kangxi Radicals\",\n    \"hexrange\": [\n      \"2F00\",\n      \"2FDF\"\n    ],\n    \"range\": [\n      12032,\n      12255\n    ]\n  },\n  {\n    \"category\": \"Ideographic Description Characters\",\n    \"hexrange\": [\n      \"2FF0\",\n      \"2FFF\"\n    ],\n    \"range\": [\n      12272,\n      12287\n    ]\n  },\n  {\n    \"category\": \"CJK Symbols and Punctuation\",\n    \"hexrange\": [\n      \"3000\",\n      \"303F\"\n    ],\n    \"range\": [\n      12288,\n      12351\n    ]\n  },\n  {\n    \"category\": \"Hiragana\",\n    \"hexrange\": [\n      \"3040\",\n      \"309F\"\n    ],\n    \"range\": [\n      12352,\n      12447\n    ]\n  },\n  {\n    \"category\": \"Katakana\",\n    \"hexrange\": [\n      \"30A0\",\n      \"30FF\"\n    ],\n    \"range\": [\n      12448,\n      12543\n    ]\n  },\n  {\n    \"category\": \"Bopomofo\",\n    \"hexrange\": [\n      \"3100\",\n      \"312F\"\n    ],\n    \"range\": [\n      12544,\n      12591\n    ]\n  },\n  {\n    \"category\": \"Hangul Compatibility Jamo\",\n    \"hexrange\": [\n      \"3130\",\n      \"318F\"\n    ],\n    \"range\": [\n      12592,\n      12687\n    ]\n  },\n  {\n    \"category\": \"Kanbun\",\n    \"hexrange\": [\n      \"3190\",\n      \"319F\"\n    ],\n    \"range\": [\n      12688,\n      12703\n    ]\n  },\n  {\n    \"category\": \"Bopomofo Extended\",\n    \"hexrange\": [\n      \"31A0\",\n      \"31BF\"\n    ],\n    \"range\": [\n      12704,\n      12735\n    ]\n  },\n  {\n    \"category\": \"CJK Strokes\",\n    \"hexrange\": [\n      \"31C0\",\n      \"31EF\"\n    ],\n    \"range\": [\n      12736,\n      12783\n    ]\n  },\n  {\n    \"category\": \"Katakana Phonetic Extensions\",\n    \"hexrange\": [\n      \"31F0\",\n      \"31FF\"\n    ],\n    \"range\": [\n      12784,\n      12799\n    ]\n  },\n  {\n    \"category\": \"Enclosed CJK Letters and Months\",\n    \"hexrange\": [\n      \"3200\",\n      \"32FF\"\n    ],\n    \"range\": [\n      12800,\n      13055\n    ]\n  },\n  {\n    \"category\": \"CJK Compatibility\",\n    \"hexrange\": [\n      \"3300\",\n      \"33FF\"\n    ],\n    \"range\": [\n      13056,\n      13311\n    ]\n  },\n  {\n    \"category\": \"CJK Unified Ideographs Extension A\",\n    \"hexrange\": [\n      \"3400\",\n      \"4DBF\"\n    ],\n    \"range\": [\n      13312,\n      19903\n    ]\n  },\n  {\n    \"category\": \"Yijing Hexagram Symbols\",\n    \"hexrange\": [\n      \"4DC0\",\n      \"4DFF\"\n    ],\n    \"range\": [\n      19904,\n      19967\n    ]\n  },\n  {\n    \"category\": \"CJK Unified Ideographs\",\n    \"hexrange\": [\n      \"4E00\",\n      \"9FFF\"\n    ],\n    \"range\": [\n      19968,\n      40959\n    ]\n  },\n  {\n    \"category\": \"Yi Syllables\",\n    \"hexrange\": [\n      \"A000\",\n      \"A48F\"\n    ],\n    \"range\": [\n      40960,\n      42127\n    ]\n  },\n  {\n    \"category\": \"Yi Radicals\",\n    \"hexrange\": [\n      \"A490\",\n      \"A4CF\"\n    ],\n    \"range\": [\n      42128,\n      42191\n    ]\n  },\n  {\n    \"category\": \"Lisu\",\n    \"hexrange\": [\n      \"A4D0\",\n      \"A4FF\"\n    ],\n    \"range\": [\n      42192,\n      42239\n    ]\n  },\n  {\n    \"category\": \"Vai\",\n    \"hexrange\": [\n      \"A500\",\n      \"A63F\"\n    ],\n    \"range\": [\n      42240,\n      42559\n    ]\n  },\n  {\n    \"category\": \"Cyrillic Extended-B\",\n    \"hexrange\": [\n      \"A640\",\n      \"A69F\"\n    ],\n    \"range\": [\n      42560,\n      42655\n    ]\n  },\n  {\n    \"category\": \"Bamum\",\n    \"hexrange\": [\n      \"A6A0\",\n      \"A6FF\"\n    ],\n    \"range\": [\n      42656,\n      42751\n    ]\n  },\n  {\n    \"category\": \"Modifier Tone Letters\",\n    \"hexrange\": [\n      \"A700\",\n      \"A71F\"\n    ],\n    \"range\": [\n      42752,\n      42783\n    ]\n  },\n  {\n    \"category\": \"Latin Extended-D\",\n    \"hexrange\": [\n      \"A720\",\n      \"A7FF\"\n    ],\n    \"range\": [\n      42784,\n      43007\n    ]\n  },\n  {\n    \"category\": \"Syloti Nagri\",\n    \"hexrange\": [\n      \"A800\",\n      \"A82F\"\n    ],\n    \"range\": [\n      43008,\n      43055\n    ]\n  },\n  {\n    \"category\": \"Common Indic Number Forms\",\n    \"hexrange\": [\n      \"A830\",\n      \"A83F\"\n    ],\n    \"range\": [\n      43056,\n      43071\n    ]\n  },\n  {\n    \"category\": \"Phags-pa\",\n    \"hexrange\": [\n      \"A840\",\n      \"A87F\"\n    ],\n    \"range\": [\n      43072,\n      43135\n    ]\n  },\n  {\n    \"category\": \"Saurashtra\",\n    \"hexrange\": [\n      \"A880\",\n      \"A8DF\"\n    ],\n    \"range\": [\n      43136,\n      43231\n    ]\n  },\n  {\n    \"category\": \"Devanagari Extended\",\n    \"hexrange\": [\n      \"A8E0\",\n      \"A8FF\"\n    ],\n    \"range\": [\n      43232,\n      43263\n    ]\n  },\n  {\n    \"category\": \"Kayah Li\",\n    \"hexrange\": [\n      \"A900\",\n      \"A92F\"\n    ],\n    \"range\": [\n      43264,\n      43311\n    ]\n  },\n  {\n    \"category\": \"Rejang\",\n    \"hexrange\": [\n      \"A930\",\n      \"A95F\"\n    ],\n    \"range\": [\n      43312,\n      43359\n    ]\n  },\n  {\n    \"category\": \"Hangul Jamo Extended-A\",\n    \"hexrange\": [\n      \"A960\",\n      \"A97F\"\n    ],\n    \"range\": [\n      43360,\n      43391\n    ]\n  },\n  {\n    \"category\": \"Javanese\",\n    \"hexrange\": [\n      \"A980\",\n      \"A9DF\"\n    ],\n    \"range\": [\n      43392,\n      43487\n    ]\n  },\n  {\n    \"category\": \"Myanmar Extended-B\",\n    \"hexrange\": [\n      \"A9E0\",\n      \"A9FF\"\n    ],\n    \"range\": [\n      43488,\n      43519\n    ]\n  },\n  {\n    \"category\": \"Cham\",\n    \"hexrange\": [\n      \"AA00\",\n      \"AA5F\"\n    ],\n    \"range\": [\n      43520,\n      43615\n    ]\n  },\n  {\n    \"category\": \"Myanmar Extended-A\",\n    \"hexrange\": [\n      \"AA60\",\n      \"AA7F\"\n    ],\n    \"range\": [\n      43616,\n      43647\n    ]\n  },\n  {\n    \"category\": \"Tai Viet\",\n    \"hexrange\": [\n      \"AA80\",\n      \"AADF\"\n    ],\n    \"range\": [\n      43648,\n      43743\n    ]\n  },\n  {\n    \"category\": \"Meetei Mayek Extensions\",\n    \"hexrange\": [\n      \"AAE0\",\n      \"AAFF\"\n    ],\n    \"range\": [\n      43744,\n      43775\n    ]\n  },\n  {\n    \"category\": \"Ethiopic Extended-A\",\n    \"hexrange\": [\n      \"AB00\",\n      \"AB2F\"\n    ],\n    \"range\": [\n      43776,\n      43823\n    ]\n  },\n  {\n    \"category\": \"Latin Extended-E\",\n    \"hexrange\": [\n      \"AB30\",\n      \"AB6F\"\n    ],\n    \"range\": [\n      43824,\n      43887\n    ]\n  },\n  {\n    \"category\": \"Cherokee Supplement\",\n    \"hexrange\": [\n      \"AB70\",\n      \"ABBF\"\n    ],\n    \"range\": [\n      43888,\n      43967\n    ]\n  },\n  {\n    \"category\": \"Meetei Mayek\",\n    \"hexrange\": [\n      \"ABC0\",\n      \"ABFF\"\n    ],\n    \"range\": [\n      43968,\n      44031\n    ]\n  },\n  {\n    \"category\": \"Hangul Syllables\",\n    \"hexrange\": [\n      \"AC00\",\n      \"D7AF\"\n    ],\n    \"range\": [\n      44032,\n      55215\n    ]\n  },\n  {\n    \"category\": \"Hangul Jamo Extended-B\",\n    \"hexrange\": [\n      \"D7B0\",\n      \"D7FF\"\n    ],\n    \"range\": [\n      55216,\n      55295\n    ]\n  },\n  {\n    \"category\": \"High Surrogates\",\n    \"hexrange\": [\n      \"D800\",\n      \"DB7F\"\n    ],\n    \"range\": [\n      55296,\n      56191\n    ]\n  },\n  {\n    \"category\": \"High Private Use Surrogates\",\n    \"hexrange\": [\n      \"DB80\",\n      \"DBFF\"\n    ],\n    \"range\": [\n      56192,\n      56319\n    ]\n  },\n  {\n    \"category\": \"Low Surrogates\",\n    \"hexrange\": [\n      \"DC00\",\n      \"DFFF\"\n    ],\n    \"range\": [\n      56320,\n      57343\n    ]\n  },\n  {\n    \"category\": \"Private Use Area\",\n    \"hexrange\": [\n      \"E000\",\n      \"F8FF\"\n    ],\n    \"range\": [\n      57344,\n      63743\n    ]\n  },\n  {\n    \"category\": \"CJK Compatibility Ideographs\",\n    \"hexrange\": [\n      \"F900\",\n      \"FAFF\"\n    ],\n    \"range\": [\n      63744,\n      64255\n    ]\n  },\n  {\n    \"category\": \"Alphabetic Presentation Forms\",\n    \"hexrange\": [\n      \"FB00\",\n      \"FB4F\"\n    ],\n    \"range\": [\n      64256,\n      64335\n    ]\n  },\n  {\n    \"category\": \"Arabic Presentation Forms-A\",\n    \"hexrange\": [\n      \"FB50\",\n      \"FDFF\"\n    ],\n    \"range\": [\n      64336,\n      65023\n    ]\n  },\n  {\n    \"category\": \"Variation Selectors\",\n    \"hexrange\": [\n      \"FE00\",\n      \"FE0F\"\n    ],\n    \"range\": [\n      65024,\n      65039\n    ]\n  },\n  {\n    \"category\": \"Vertical Forms\",\n    \"hexrange\": [\n      \"FE10\",\n      \"FE1F\"\n    ],\n    \"range\": [\n      65040,\n      65055\n    ]\n  },\n  {\n    \"category\": \"Combining Half Marks\",\n    \"hexrange\": [\n      \"FE20\",\n      \"FE2F\"\n    ],\n    \"range\": [\n      65056,\n      65071\n    ]\n  },\n  {\n    \"category\": \"CJK Compatibility Forms\",\n    \"hexrange\": [\n      \"FE30\",\n      \"FE4F\"\n    ],\n    \"range\": [\n      65072,\n      65103\n    ]\n  },\n  {\n    \"category\": \"Small Form Variants\",\n    \"hexrange\": [\n      \"FE50\",\n      \"FE6F\"\n    ],\n    \"range\": [\n      65104,\n      65135\n    ]\n  },\n  {\n    \"category\": \"Arabic Presentation Forms-B\",\n    \"hexrange\": [\n      \"FE70\",\n      \"FEFF\"\n    ],\n    \"range\": [\n      65136,\n      65279\n    ]\n  },\n  {\n    \"category\": \"Halfwidth and Fullwidth Forms\",\n    \"hexrange\": [\n      \"FF00\",\n      \"FFEF\"\n    ],\n    \"range\": [\n      65280,\n      65519\n    ]\n  },\n  {\n    \"category\": \"Specials\",\n    \"hexrange\": [\n      \"FFF0\",\n      \"FFFF\"\n    ],\n    \"range\": [\n      65520,\n      65535\n    ]\n  },\n  {\n    \"category\": \"Linear B Syllabary\",\n    \"hexrange\": [\n      \"10000\",\n      \"1007F\"\n    ],\n    \"range\": [\n      65536,\n      65663\n    ]\n  },\n  {\n    \"category\": \"Linear B Ideograms\",\n    \"hexrange\": [\n      \"10080\",\n      \"100FF\"\n    ],\n    \"range\": [\n      65664,\n      65791\n    ]\n  },\n  {\n    \"category\": \"Aegean Numbers\",\n    \"hexrange\": [\n      \"10100\",\n      \"1013F\"\n    ],\n    \"range\": [\n      65792,\n      65855\n    ]\n  },\n  {\n    \"category\": \"Ancient Greek Numbers\",\n    \"hexrange\": [\n      \"10140\",\n      \"1018F\"\n    ],\n    \"range\": [\n      65856,\n      65935\n    ]\n  },\n  {\n    \"category\": \"Ancient Symbols\",\n    \"hexrange\": [\n      \"10190\",\n      \"101CF\"\n    ],\n    \"range\": [\n      65936,\n      65999\n    ]\n  },\n  {\n    \"category\": \"Phaistos Disc\",\n    \"hexrange\": [\n      \"101D0\",\n      \"101FF\"\n    ],\n    \"range\": [\n      66000,\n      66047\n    ]\n  },\n  {\n    \"category\": \"Lycian\",\n    \"hexrange\": [\n      \"10280\",\n      \"1029F\"\n    ],\n    \"range\": [\n      66176,\n      66207\n    ]\n  },\n  {\n    \"category\": \"Carian\",\n    \"hexrange\": [\n      \"102A0\",\n      \"102DF\"\n    ],\n    \"range\": [\n      66208,\n      66271\n    ]\n  },\n  {\n    \"category\": \"Coptic Epact Numbers\",\n    \"hexrange\": [\n      \"102E0\",\n      \"102FF\"\n    ],\n    \"range\": [\n      66272,\n      66303\n    ]\n  },\n  {\n    \"category\": \"Old Italic\",\n    \"hexrange\": [\n      \"10300\",\n      \"1032F\"\n    ],\n    \"range\": [\n      66304,\n      66351\n    ]\n  },\n  {\n    \"category\": \"Gothic\",\n    \"hexrange\": [\n      \"10330\",\n      \"1034F\"\n    ],\n    \"range\": [\n      66352,\n      66383\n    ]\n  },\n  {\n    \"category\": \"Old Permic\",\n    \"hexrange\": [\n      \"10350\",\n      \"1037F\"\n    ],\n    \"range\": [\n      66384,\n      66431\n    ]\n  },\n  {\n    \"category\": \"Ugaritic\",\n    \"hexrange\": [\n      \"10380\",\n      \"1039F\"\n    ],\n    \"range\": [\n      66432,\n      66463\n    ]\n  },\n  {\n    \"category\": \"Old Persian\",\n    \"hexrange\": [\n      \"103A0\",\n      \"103DF\"\n    ],\n    \"range\": [\n      66464,\n      66527\n    ]\n  },\n  {\n    \"category\": \"Deseret\",\n    \"hexrange\": [\n      \"10400\",\n      \"1044F\"\n    ],\n    \"range\": [\n      66560,\n      66639\n    ]\n  },\n  {\n    \"category\": \"Shavian\",\n    \"hexrange\": [\n      \"10450\",\n      \"1047F\"\n    ],\n    \"range\": [\n      66640,\n      66687\n    ]\n  },\n  {\n    \"category\": \"Osmanya\",\n    \"hexrange\": [\n      \"10480\",\n      \"104AF\"\n    ],\n    \"range\": [\n      66688,\n      66735\n    ]\n  },\n  {\n    \"category\": \"Elbasan\",\n    \"hexrange\": [\n      \"10500\",\n      \"1052F\"\n    ],\n    \"range\": [\n      66816,\n      66863\n    ]\n  },\n  {\n    \"category\": \"Caucasian Albanian\",\n    \"hexrange\": [\n      \"10530\",\n      \"1056F\"\n    ],\n    \"range\": [\n      66864,\n      66927\n    ]\n  },\n  {\n    \"category\": \"Linear A\",\n    \"hexrange\": [\n      \"10600\",\n      \"1077F\"\n    ],\n    \"range\": [\n      67072,\n      67455\n    ]\n  },\n  {\n    \"category\": \"Cypriot Syllabary\",\n    \"hexrange\": [\n      \"10800\",\n      \"1083F\"\n    ],\n    \"range\": [\n      67584,\n      67647\n    ]\n  },\n  {\n    \"category\": \"Imperial Aramaic\",\n    \"hexrange\": [\n      \"10840\",\n      \"1085F\"\n    ],\n    \"range\": [\n      67648,\n      67679\n    ]\n  },\n  {\n    \"category\": \"Palmyrene\",\n    \"hexrange\": [\n      \"10860\",\n      \"1087F\"\n    ],\n    \"range\": [\n      67680,\n      67711\n    ]\n  },\n  {\n    \"category\": \"Nabataean\",\n    \"hexrange\": [\n      \"10880\",\n      \"108AF\"\n    ],\n    \"range\": [\n      67712,\n      67759\n    ]\n  },\n  {\n    \"category\": \"Hatran\",\n    \"hexrange\": [\n      \"108E0\",\n      \"108FF\"\n    ],\n    \"range\": [\n      67808,\n      67839\n    ]\n  },\n  {\n    \"category\": \"Phoenician\",\n    \"hexrange\": [\n      \"10900\",\n      \"1091F\"\n    ],\n    \"range\": [\n      67840,\n      67871\n    ]\n  },\n  {\n    \"category\": \"Lydian\",\n    \"hexrange\": [\n      \"10920\",\n      \"1093F\"\n    ],\n    \"range\": [\n      67872,\n      67903\n    ]\n  },\n  {\n    \"category\": \"Meroitic Hieroglyphs\",\n    \"hexrange\": [\n      \"10980\",\n      \"1099F\"\n    ],\n    \"range\": [\n      67968,\n      67999\n    ]\n  },\n  {\n    \"category\": \"Meroitic Cursive\",\n    \"hexrange\": [\n      \"109A0\",\n      \"109FF\"\n    ],\n    \"range\": [\n      68000,\n      68095\n    ]\n  },\n  {\n    \"category\": \"Kharoshthi\",\n    \"hexrange\": [\n      \"10A00\",\n      \"10A5F\"\n    ],\n    \"range\": [\n      68096,\n      68191\n    ]\n  },\n  {\n    \"category\": \"Old South Arabian\",\n    \"hexrange\": [\n      \"10A60\",\n      \"10A7F\"\n    ],\n    \"range\": [\n      68192,\n      68223\n    ]\n  },\n  {\n    \"category\": \"Old North Arabian\",\n    \"hexrange\": [\n      \"10A80\",\n      \"10A9F\"\n    ],\n    \"range\": [\n      68224,\n      68255\n    ]\n  },\n  {\n    \"category\": \"Manichaean\",\n    \"hexrange\": [\n      \"10AC0\",\n      \"10AFF\"\n    ],\n    \"range\": [\n      68288,\n      68351\n    ]\n  },\n  {\n    \"category\": \"Avestan\",\n    \"hexrange\": [\n      \"10B00\",\n      \"10B3F\"\n    ],\n    \"range\": [\n      68352,\n      68415\n    ]\n  },\n  {\n    \"category\": \"Inscriptional Parthian\",\n    \"hexrange\": [\n      \"10B40\",\n      \"10B5F\"\n    ],\n    \"range\": [\n      68416,\n      68447\n    ]\n  },\n  {\n    \"category\": \"Inscriptional Pahlavi\",\n    \"hexrange\": [\n      \"10B60\",\n      \"10B7F\"\n    ],\n    \"range\": [\n      68448,\n      68479\n    ]\n  },\n  {\n    \"category\": \"Psalter Pahlavi\",\n    \"hexrange\": [\n      \"10B80\",\n      \"10BAF\"\n    ],\n    \"range\": [\n      68480,\n      68527\n    ]\n  },\n  {\n    \"category\": \"Old Turkic\",\n    \"hexrange\": [\n      \"10C00\",\n      \"10C4F\"\n    ],\n    \"range\": [\n      68608,\n      68687\n    ]\n  },\n  {\n    \"category\": \"Old Hungarian\",\n    \"hexrange\": [\n      \"10C80\",\n      \"10CFF\"\n    ],\n    \"range\": [\n      68736,\n      68863\n    ]\n  },\n  {\n    \"category\": \"Rumi Numeral Symbols\",\n    \"hexrange\": [\n      \"10E60\",\n      \"10E7F\"\n    ],\n    \"range\": [\n      69216,\n      69247\n    ]\n  },\n  {\n    \"category\": \"Brahmi\",\n    \"hexrange\": [\n      \"11000\",\n      \"1107F\"\n    ],\n    \"range\": [\n      69632,\n      69759\n    ]\n  },\n  {\n    \"category\": \"Kaithi\",\n    \"hexrange\": [\n      \"11080\",\n      \"110CF\"\n    ],\n    \"range\": [\n      69760,\n      69839\n    ]\n  },\n  {\n    \"category\": \"Sora Sompeng\",\n    \"hexrange\": [\n      \"110D0\",\n      \"110FF\"\n    ],\n    \"range\": [\n      69840,\n      69887\n    ]\n  },\n  {\n    \"category\": \"Chakma\",\n    \"hexrange\": [\n      \"11100\",\n      \"1114F\"\n    ],\n    \"range\": [\n      69888,\n      69967\n    ]\n  },\n  {\n    \"category\": \"Mahajani\",\n    \"hexrange\": [\n      \"11150\",\n      \"1117F\"\n    ],\n    \"range\": [\n      69968,\n      70015\n    ]\n  },\n  {\n    \"category\": \"Sharada\",\n    \"hexrange\": [\n      \"11180\",\n      \"111DF\"\n    ],\n    \"range\": [\n      70016,\n      70111\n    ]\n  },\n  {\n    \"category\": \"Sinhala Archaic Numbers\",\n    \"hexrange\": [\n      \"111E0\",\n      \"111FF\"\n    ],\n    \"range\": [\n      70112,\n      70143\n    ]\n  },\n  {\n    \"category\": \"Khojki\",\n    \"hexrange\": [\n      \"11200\",\n      \"1124F\"\n    ],\n    \"range\": [\n      70144,\n      70223\n    ]\n  },\n  {\n    \"category\": \"Multani\",\n    \"hexrange\": [\n      \"11280\",\n      \"112AF\"\n    ],\n    \"range\": [\n      70272,\n      70319\n    ]\n  },\n  {\n    \"category\": \"Khudawadi\",\n    \"hexrange\": [\n      \"112B0\",\n      \"112FF\"\n    ],\n    \"range\": [\n      70320,\n      70399\n    ]\n  },\n  {\n    \"category\": \"Grantha\",\n    \"hexrange\": [\n      \"11300\",\n      \"1137F\"\n    ],\n    \"range\": [\n      70400,\n      70527\n    ]\n  },\n  {\n    \"category\": \"Tirhuta\",\n    \"hexrange\": [\n      \"11480\",\n      \"114DF\"\n    ],\n    \"range\": [\n      70784,\n      70879\n    ]\n  },\n  {\n    \"category\": \"Siddham\",\n    \"hexrange\": [\n      \"11580\",\n      \"115FF\"\n    ],\n    \"range\": [\n      71040,\n      71167\n    ]\n  },\n  {\n    \"category\": \"Modi\",\n    \"hexrange\": [\n      \"11600\",\n      \"1165F\"\n    ],\n    \"range\": [\n      71168,\n      71263\n    ]\n  },\n  {\n    \"category\": \"Takri\",\n    \"hexrange\": [\n      \"11680\",\n      \"116CF\"\n    ],\n    \"range\": [\n      71296,\n      71375\n    ]\n  },\n  {\n    \"category\": \"Ahom\",\n    \"hexrange\": [\n      \"11700\",\n      \"1173F\"\n    ],\n    \"range\": [\n      71424,\n      71487\n    ]\n  },\n  {\n    \"category\": \"Warang Citi\",\n    \"hexrange\": [\n      \"118A0\",\n      \"118FF\"\n    ],\n    \"range\": [\n      71840,\n      71935\n    ]\n  },\n  {\n    \"category\": \"Pau Cin Hau\",\n    \"hexrange\": [\n      \"11AC0\",\n      \"11AFF\"\n    ],\n    \"range\": [\n      72384,\n      72447\n    ]\n  },\n  {\n    \"category\": \"Cuneiform\",\n    \"hexrange\": [\n      \"12000\",\n      \"123FF\"\n    ],\n    \"range\": [\n      73728,\n      74751\n    ]\n  },\n  {\n    \"category\": \"Cuneiform Numbers and Punctuation\",\n    \"hexrange\": [\n      \"12400\",\n      \"1247F\"\n    ],\n    \"range\": [\n      74752,\n      74879\n    ]\n  },\n  {\n    \"category\": \"Early Dynastic Cuneiform\",\n    \"hexrange\": [\n      \"12480\",\n      \"1254F\"\n    ],\n    \"range\": [\n      74880,\n      75087\n    ]\n  },\n  {\n    \"category\": \"Egyptian Hieroglyphs\",\n    \"hexrange\": [\n      \"13000\",\n      \"1342F\"\n    ],\n    \"range\": [\n      77824,\n      78895\n    ]\n  },\n  {\n    \"category\": \"Anatolian Hieroglyphs\",\n    \"hexrange\": [\n      \"14400\",\n      \"1467F\"\n    ],\n    \"range\": [\n      82944,\n      83583\n    ]\n  },\n  {\n    \"category\": \"Bamum Supplement\",\n    \"hexrange\": [\n      \"16800\",\n      \"16A3F\"\n    ],\n    \"range\": [\n      92160,\n      92735\n    ]\n  },\n  {\n    \"category\": \"Mro\",\n    \"hexrange\": [\n      \"16A40\",\n      \"16A6F\"\n    ],\n    \"range\": [\n      92736,\n      92783\n    ]\n  },\n  {\n    \"category\": \"Bassa Vah\",\n    \"hexrange\": [\n      \"16AD0\",\n      \"16AFF\"\n    ],\n    \"range\": [\n      92880,\n      92927\n    ]\n  },\n  {\n    \"category\": \"Pahawh Hmong\",\n    \"hexrange\": [\n      \"16B00\",\n      \"16B8F\"\n    ],\n    \"range\": [\n      92928,\n      93071\n    ]\n  },\n  {\n    \"category\": \"Miao\",\n    \"hexrange\": [\n      \"16F00\",\n      \"16F9F\"\n    ],\n    \"range\": [\n      93952,\n      94111\n    ]\n  },\n  {\n    \"category\": \"Kana Supplement\",\n    \"hexrange\": [\n      \"1B000\",\n      \"1B0FF\"\n    ],\n    \"range\": [\n      110592,\n      110847\n    ]\n  },\n  {\n    \"category\": \"Duployan\",\n    \"hexrange\": [\n      \"1BC00\",\n      \"1BC9F\"\n    ],\n    \"range\": [\n      113664,\n      113823\n    ]\n  },\n  {\n    \"category\": \"Shorthand Format Controls\",\n    \"hexrange\": [\n      \"1BCA0\",\n      \"1BCAF\"\n    ],\n    \"range\": [\n      113824,\n      113839\n    ]\n  },\n  {\n    \"category\": \"Byzantine Musical Symbols\",\n    \"hexrange\": [\n      \"1D000\",\n      \"1D0FF\"\n    ],\n    \"range\": [\n      118784,\n      119039\n    ]\n  },\n  {\n    \"category\": \"Musical Symbols\",\n    \"hexrange\": [\n      \"1D100\",\n      \"1D1FF\"\n    ],\n    \"range\": [\n      119040,\n      119295\n    ]\n  },\n  {\n    \"category\": \"Ancient Greek Musical Notation\",\n    \"hexrange\": [\n      \"1D200\",\n      \"1D24F\"\n    ],\n    \"range\": [\n      119296,\n      119375\n    ]\n  },\n  {\n    \"category\": \"Tai Xuan Jing Symbols\",\n    \"hexrange\": [\n      \"1D300\",\n      \"1D35F\"\n    ],\n    \"range\": [\n      119552,\n      119647\n    ]\n  },\n  {\n    \"category\": \"Counting Rod Numerals\",\n    \"hexrange\": [\n      \"1D360\",\n      \"1D37F\"\n    ],\n    \"range\": [\n      119648,\n      119679\n    ]\n  },\n  {\n    \"category\": \"Mathematical Alphanumeric Symbols\",\n    \"hexrange\": [\n      \"1D400\",\n      \"1D7FF\"\n    ],\n    \"range\": [\n      119808,\n      120831\n    ]\n  },\n  {\n    \"category\": \"Sutton SignWriting\",\n    \"hexrange\": [\n      \"1D800\",\n      \"1DAAF\"\n    ],\n    \"range\": [\n      120832,\n      121519\n    ]\n  },\n  {\n    \"category\": \"Mende Kikakui\",\n    \"hexrange\": [\n      \"1E800\",\n      \"1E8DF\"\n    ],\n    \"range\": [\n      124928,\n      125151\n    ]\n  },\n  {\n    \"category\": \"Arabic Mathematical Alphabetic Symbols\",\n    \"hexrange\": [\n      \"1EE00\",\n      \"1EEFF\"\n    ],\n    \"range\": [\n      126464,\n      126719\n    ]\n  },\n  {\n    \"category\": \"Mahjong Tiles\",\n    \"hexrange\": [\n      \"1F000\",\n      \"1F02F\"\n    ],\n    \"range\": [\n      126976,\n      127023\n    ]\n  },\n  {\n    \"category\": \"Domino Tiles\",\n    \"hexrange\": [\n      \"1F030\",\n      \"1F09F\"\n    ],\n    \"range\": [\n      127024,\n      127135\n    ]\n  },\n  {\n    \"category\": \"Playing Cards\",\n    \"hexrange\": [\n      \"1F0A0\",\n      \"1F0FF\"\n    ],\n    \"range\": [\n      127136,\n      127231\n    ]\n  },\n  {\n    \"category\": \"Enclosed Alphanumeric Supplement\",\n    \"hexrange\": [\n      \"1F100\",\n      \"1F1FF\"\n    ],\n    \"range\": [\n      127232,\n      127487\n    ]\n  },\n  {\n    \"category\": \"Enclosed Ideographic Supplement\",\n    \"hexrange\": [\n      \"1F200\",\n      \"1F2FF\"\n    ],\n    \"range\": [\n      127488,\n      127743\n    ]\n  },\n  {\n    \"category\": \"Miscellaneous Symbols and Pictographs\",\n    \"hexrange\": [\n      \"1F300\",\n      \"1F5FF\"\n    ],\n    \"range\": [\n      127744,\n      128511\n    ]\n  },\n  {\n    \"category\": \"Emoticons (Emoji)\",\n    \"hexrange\": [\n      \"1F600\",\n      \"1F64F\"\n    ],\n    \"range\": [\n      128512,\n      128591\n    ]\n  },\n  {\n    \"category\": \"Ornamental Dingbats\",\n    \"hexrange\": [\n      \"1F650\",\n      \"1F67F\"\n    ],\n    \"range\": [\n      128592,\n      128639\n    ]\n  },\n  {\n    \"category\": \"Transport and Map Symbols\",\n    \"hexrange\": [\n      \"1F680\",\n      \"1F6FF\"\n    ],\n    \"range\": [\n      128640,\n      128767\n    ]\n  },\n  {\n    \"category\": \"Alchemical Symbols\",\n    \"hexrange\": [\n      \"1F700\",\n      \"1F77F\"\n    ],\n    \"range\": [\n      128768,\n      128895\n    ]\n  },\n  {\n    \"category\": \"Geometric Shapes Extended\",\n    \"hexrange\": [\n      \"1F780\",\n      \"1F7FF\"\n    ],\n    \"range\": [\n      128896,\n      129023\n    ]\n  },\n  {\n    \"category\": \"Supplemental Arrows-C\",\n    \"hexrange\": [\n      \"1F800\",\n      \"1F8FF\"\n    ],\n    \"range\": [\n      129024,\n      129279\n    ]\n  },\n  {\n    \"category\": \"Supplemental Symbols and Pictographs\",\n    \"hexrange\": [\n      \"1F900\",\n      \"1F9FF\"\n    ],\n    \"range\": [\n      129280,\n      129535\n    ]\n  },\n  {\n    \"category\": \"Supplemental Private Use Area-A\",\n    \"hexrange\": [\n      \"F0000\",\n      \"FFFFD\"\n    ],\n    \"range\": [\n      983040,\n      1048573\n    ]\n  },\n  {\n    \"category\": \"Supplemental Private Use Area-B\",\n    \"hexrange\": [\n      \"100000\",\n      \"10FFFD\"\n    ],\n    \"range\": [\n      1048576,\n      1114109\n    ]\n  }\n]");
function from2(val, size) {
    return ()=>{
        const parts = [];
        const tgt = unwrap(size);
        for(let idx = 0; idx < tgt; idx++){
            parts.push(unwrap(val));
        }
        return parts.join("");
    };
}
function digit(density) {
    return ()=>{
        return `${unwrap(density(0, 10))}`;
    };
}
function nonZeroDigit(density) {
    return ()=>{
        return `${unwrap(density(1, 10))}`;
    };
}
function unixNewline() {
    return ()=>`\n`;
}
function windowsNewline() {
    return ()=>`\r\n`;
}
function newline(density) {
    return ()=>{
        return oneOf(density, [
            "\n",
            "\r\n"
        ])();
    };
}
function space() {
    return ()=>" ";
}
function tab() {
    return ()=>"\t";
}
function hyphen() {
    return ()=>"-";
}
function underscore() {
    return ()=>"_";
}
function lowercaseLetters(density) {
    return oneOf(density, LOWERCASE_LETTERS);
}
function uppercaseLetters(density) {
    return oneOf(density, UPPERCASE_LETTERS);
}
function letters(density) {
    return oneOf(density, LETTERS);
}
function concat2(...strings) {
    return ()=>{
        return strings.map((str)=>unwrap(str)).join("");
    };
}
function fixedFromCharCode(codePt) {
    if (codePt > 0xFFFF) {
        codePt -= 0x10000;
        return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
    } else {
        return String.fromCharCode(codePt);
    }
}
function unicodeCategory(category) {
    const data = __default.find((range)=>range.category === category);
    if (typeof data == "undefined") {
        throw new Error(`attempted to use unknown unicode category ${category}`);
    }
    const range = data.range;
    return function(density) {
        return ()=>{
            const codePoint = unwrap(density(range[0], range[1]));
            return fixedFromCharCode(codePoint);
        };
    };
}
function unicode(density) {
    return ()=>{
        const codePoint = unwrap(density(0x0, 0x10FFFF));
        return fixedFromCharCode(codePoint);
    };
}
const blocks = {
    controlCharacter: unicodeCategory("Control Character"),
    basicLatin: unicodeCategory("Basic Latin"),
    latin1Supplement: unicodeCategory("Latin-1 Supplement"),
    latinExtendedA: unicodeCategory("Latin Extended-A"),
    latinExtendedB: unicodeCategory("Latin Extended-B"),
    ipaExtensions: unicodeCategory("IPA Extensions"),
    spacingModifierLetters: unicodeCategory("Spacing Modifier Letters"),
    combiningDiacriticalMarks: unicodeCategory("Combining Diacritical Marks"),
    greekAndCoptic: unicodeCategory("Greek and Coptic"),
    cyrillic: unicodeCategory("Cyrillic"),
    cyrillicSupplement: unicodeCategory("Cyrillic Supplement"),
    armenian: unicodeCategory("Armenian"),
    hebrew: unicodeCategory("Hebrew"),
    arabic: unicodeCategory("Arabic"),
    syriac: unicodeCategory("Syriac"),
    arabicSupplement: unicodeCategory("Arabic Supplement"),
    thaana: unicodeCategory("Thaana"),
    nko: unicodeCategory("NKo"),
    samaritan: unicodeCategory("Samaritan"),
    mandaic: unicodeCategory("Mandaic"),
    arabicExtendedA: unicodeCategory("Arabic Extended-A"),
    devanagari: unicodeCategory("Devanagari"),
    bengali: unicodeCategory("Bengali"),
    gurmukhi: unicodeCategory("Gurmukhi"),
    gujarati: unicodeCategory("Gujarati"),
    oriya: unicodeCategory("Oriya"),
    tamil: unicodeCategory("Tamil"),
    telugu: unicodeCategory("Telugu"),
    kannada: unicodeCategory("Kannada"),
    malayalam: unicodeCategory("Malayalam"),
    sinhala: unicodeCategory("Sinhala"),
    thai: unicodeCategory("Thai"),
    lao: unicodeCategory("Lao"),
    tibetan: unicodeCategory("Tibetan"),
    myanmar: unicodeCategory("Myanmar"),
    georgian: unicodeCategory("Georgian"),
    hangulJamo: unicodeCategory("Hangul Jamo"),
    ethiopic: unicodeCategory("Ethiopic"),
    ethiopicSupplement: unicodeCategory("Ethiopic Supplement"),
    cherokee: unicodeCategory("Cherokee"),
    unifiedCanadianAboriginalSyllabics: unicodeCategory("Unified Canadian Aboriginal Syllabics"),
    ogham: unicodeCategory("Ogham"),
    runic: unicodeCategory("Runic"),
    tagalog: unicodeCategory("Tagalog"),
    hanunoo: unicodeCategory("Hanunoo"),
    buhid: unicodeCategory("Buhid"),
    tagbanwa: unicodeCategory("Tagbanwa"),
    khmer: unicodeCategory("Khmer"),
    mongolian: unicodeCategory("Mongolian"),
    unifiedCanadianAboriginalSyllabicsExtended: unicodeCategory("Unified Canadian Aboriginal Syllabics Extended"),
    limbu: unicodeCategory("Limbu"),
    taiLe: unicodeCategory("Tai Le"),
    newTaiLue: unicodeCategory("New Tai Lue"),
    khmerSymbols: unicodeCategory("Khmer Symbols"),
    buginese: unicodeCategory("Buginese"),
    taiTham: unicodeCategory("Tai Tham"),
    combiningDiacriticalMarksExtended: unicodeCategory("Combining Diacritical Marks Extended"),
    balinese: unicodeCategory("Balinese"),
    sundanese: unicodeCategory("Sundanese"),
    batak: unicodeCategory("Batak"),
    lepcha: unicodeCategory("Lepcha"),
    olChiki: unicodeCategory("Ol Chiki"),
    sundaneseSupplement: unicodeCategory("Sundanese Supplement"),
    vedicExtensions: unicodeCategory("Vedic Extensions"),
    phoneticExtensions: unicodeCategory("Phonetic Extensions"),
    phoneticExtensionsSupplement: unicodeCategory("Phonetic Extensions Supplement"),
    combiningDiacriticalMarksSupplement: unicodeCategory("Combining Diacritical Marks Supplement"),
    latinExtendedAdditional: unicodeCategory("Latin Extended Additional"),
    greekExtended: unicodeCategory("Greek Extended"),
    generalPunctuation: unicodeCategory("General Punctuation"),
    superscriptsAndSubscripts: unicodeCategory("Superscripts and Subscripts"),
    currencySymbols: unicodeCategory("Currency Symbols"),
    combiningDiacriticalMarksForSymbols: unicodeCategory("Combining Diacritical Marks for Symbols"),
    letterlikeSymbols: unicodeCategory("Letterlike Symbols"),
    numberForms: unicodeCategory("Number Forms"),
    arrows: unicodeCategory("Arrows"),
    mathematicalOperators: unicodeCategory("Mathematical Operators"),
    miscellaneousTechnical: unicodeCategory("Miscellaneous Technical"),
    controlPictures: unicodeCategory("Control Pictures"),
    opticalCharacterRecognition: unicodeCategory("Optical Character Recognition"),
    enclosedAlphanumerics: unicodeCategory("Enclosed Alphanumerics"),
    boxDrawing: unicodeCategory("Box Drawing"),
    blockElements: unicodeCategory("Block Elements"),
    geometricShapes: unicodeCategory("Geometric Shapes"),
    miscellaneousSymbols: unicodeCategory("Miscellaneous Symbols"),
    dingbats: unicodeCategory("Dingbats"),
    miscellaneousMathematicalSymbolsA: unicodeCategory("Miscellaneous Mathematical Symbols-A"),
    supplementalArrowsA: unicodeCategory("Supplemental Arrows-A"),
    braillePatterns: unicodeCategory("Braille Patterns"),
    supplementalArrowsB: unicodeCategory("Supplemental Arrows-B"),
    miscellaneousMathematicalSymbolsB: unicodeCategory("Miscellaneous Mathematical Symbols-B"),
    supplementalMathematicalOperators: unicodeCategory("Supplemental Mathematical Operators"),
    miscellaneousSymbolsAndArrows: unicodeCategory("Miscellaneous Symbols and Arrows"),
    glagolitic: unicodeCategory("Glagolitic"),
    latinExtendedC: unicodeCategory("Latin Extended-C"),
    coptic: unicodeCategory("Coptic"),
    georgianSupplement: unicodeCategory("Georgian Supplement"),
    tifinagh: unicodeCategory("Tifinagh"),
    ethiopicExtended: unicodeCategory("Ethiopic Extended"),
    cyrillicExtendedA: unicodeCategory("Cyrillic Extended-A"),
    supplementalPunctuation: unicodeCategory("Supplemental Punctuation"),
    cJKRadicalsSupplement: unicodeCategory("CJK Radicals Supplement"),
    kangxiRadicals: unicodeCategory("Kangxi Radicals"),
    ideographicDescriptionCharacters: unicodeCategory("Ideographic Description Characters"),
    cJKSymbolsAndPunctuation: unicodeCategory("CJK Symbols and Punctuation"),
    hiragana: unicodeCategory("Hiragana"),
    katakana: unicodeCategory("Katakana"),
    bopomofo: unicodeCategory("Bopomofo"),
    hangulCompatibilityJamo: unicodeCategory("Hangul Compatibility Jamo"),
    kanbun: unicodeCategory("Kanbun"),
    bopomofoExtended: unicodeCategory("Bopomofo Extended"),
    cJKStrokes: unicodeCategory("CJK Strokes"),
    katakanaPhoneticExtensions: unicodeCategory("Katakana Phonetic Extensions"),
    enclosedCJKLettersAndMonths: unicodeCategory("Enclosed CJK Letters and Months"),
    cJKCompatibility: unicodeCategory("CJK Compatibility"),
    cJKUnifiedIdeographsExtensionA: unicodeCategory("CJK Unified Ideographs Extension A"),
    yijingHexagramSymbols: unicodeCategory("Yijing Hexagram Symbols"),
    cJKUnifiedIdeographs: unicodeCategory("CJK Unified Ideographs"),
    yiSyllables: unicodeCategory("Yi Syllables"),
    yiRadicals: unicodeCategory("Yi Radicals"),
    lisu: unicodeCategory("Lisu"),
    vai: unicodeCategory("Vai"),
    cyrillicExtendedB: unicodeCategory("Cyrillic Extended-B"),
    bamum: unicodeCategory("Bamum"),
    modifierToneLetters: unicodeCategory("Modifier Tone Letters"),
    latinExtendedD: unicodeCategory("Latin Extended-D"),
    sylotiNagri: unicodeCategory("Syloti Nagri"),
    commonIndicNumberForms: unicodeCategory("Common Indic Number Forms"),
    phagsPa: unicodeCategory("Phags-pa"),
    saurashtra: unicodeCategory("Saurashtra"),
    devanagariExtended: unicodeCategory("Devanagari Extended"),
    kayahLi: unicodeCategory("Kayah Li"),
    rejang: unicodeCategory("Rejang"),
    hangulJamoExtendedA: unicodeCategory("Hangul Jamo Extended-A"),
    javanese: unicodeCategory("Javanese"),
    myanmarExtendedB: unicodeCategory("Myanmar Extended-B"),
    cham: unicodeCategory("Cham"),
    myanmarExtendedA: unicodeCategory("Myanmar Extended-A"),
    taiViet: unicodeCategory("Tai Viet"),
    meeteiMayekExtensions: unicodeCategory("Meetei Mayek Extensions"),
    ethiopicExtendedA: unicodeCategory("Ethiopic Extended-A"),
    latinExtendedE: unicodeCategory("Latin Extended-E"),
    cherokeeSupplement: unicodeCategory("Cherokee Supplement"),
    meeteiMayek: unicodeCategory("Meetei Mayek"),
    hangulSyllables: unicodeCategory("Hangul Syllables"),
    hangulJamoExtendedB: unicodeCategory("Hangul Jamo Extended-B"),
    highSurrogates: unicodeCategory("High Surrogates"),
    highPrivateUseSurrogates: unicodeCategory("High Private Use Surrogates"),
    lowSurrogates: unicodeCategory("Low Surrogates"),
    privateUseArea: unicodeCategory("Private Use Area"),
    cJKCompatibilityIdeographs: unicodeCategory("CJK Compatibility Ideographs"),
    alphabeticPresentationForms: unicodeCategory("Alphabetic Presentation Forms"),
    arabicPresentationFormsA: unicodeCategory("Arabic Presentation Forms-A"),
    variationSelectors: unicodeCategory("Variation Selectors"),
    verticalForms: unicodeCategory("Vertical Forms"),
    combiningHalfMarks: unicodeCategory("Combining Half Marks"),
    cJKCompatibilityForms: unicodeCategory("CJK Compatibility Forms"),
    smallFormVariants: unicodeCategory("Small Form Variants"),
    arabicPresentationFormsB: unicodeCategory("Arabic Presentation Forms-B"),
    halfwidthAndFullwidthForms: unicodeCategory("Halfwidth and Fullwidth Forms"),
    specials: unicodeCategory("Specials"),
    linearBSyllabary: unicodeCategory("Linear B Syllabary"),
    linearBIdeograms: unicodeCategory("Linear B Ideograms"),
    aegeanNumbers: unicodeCategory("Aegean Numbers"),
    ancientGreekNumbers: unicodeCategory("Ancient Greek Numbers"),
    ancientSymbols: unicodeCategory("Ancient Symbols"),
    phaistosDisc: unicodeCategory("Phaistos Disc"),
    lycian: unicodeCategory("Lycian"),
    carian: unicodeCategory("Carian"),
    copticEpactNumbers: unicodeCategory("Coptic Epact Numbers"),
    oldItalic: unicodeCategory("Old Italic"),
    gothic: unicodeCategory("Gothic"),
    oldPermic: unicodeCategory("Old Permic"),
    ugaritic: unicodeCategory("Ugaritic"),
    oldPersian: unicodeCategory("Old Persian"),
    deseret: unicodeCategory("Deseret"),
    shavian: unicodeCategory("Shavian"),
    osmanya: unicodeCategory("Osmanya"),
    elbasan: unicodeCategory("Elbasan"),
    caucasianAlbanian: unicodeCategory("Caucasian Albanian"),
    linearA: unicodeCategory("Linear A"),
    cypriotSyllabary: unicodeCategory("Cypriot Syllabary"),
    imperialAramaic: unicodeCategory("Imperial Aramaic"),
    palmyrene: unicodeCategory("Palmyrene"),
    nabataean: unicodeCategory("Nabataean"),
    hatran: unicodeCategory("Hatran"),
    phoenician: unicodeCategory("Phoenician"),
    lydian: unicodeCategory("Lydian"),
    meroiticHieroglyphs: unicodeCategory("Meroitic Hieroglyphs"),
    meroiticCursive: unicodeCategory("Meroitic Cursive"),
    kharoshthi: unicodeCategory("Kharoshthi"),
    oldSouthArabian: unicodeCategory("Old South Arabian"),
    oldNorthArabian: unicodeCategory("Old North Arabian"),
    manichaean: unicodeCategory("Manichaean"),
    avestan: unicodeCategory("Avestan"),
    inscriptionalParthian: unicodeCategory("Inscriptional Parthian"),
    inscriptionalPahlavi: unicodeCategory("Inscriptional Pahlavi"),
    psalterPahlavi: unicodeCategory("Psalter Pahlavi"),
    oldTurkic: unicodeCategory("Old Turkic"),
    oldHungarian: unicodeCategory("Old Hungarian"),
    rumiNumeralSymbols: unicodeCategory("Rumi Numeral Symbols"),
    brahmi: unicodeCategory("Brahmi"),
    kaithi: unicodeCategory("Kaithi"),
    soraSompeng: unicodeCategory("Sora Sompeng"),
    chakma: unicodeCategory("Chakma"),
    mahajani: unicodeCategory("Mahajani"),
    sharada: unicodeCategory("Sharada"),
    sinhalaArchaicNumbers: unicodeCategory("Sinhala Archaic Numbers"),
    khojki: unicodeCategory("Khojki"),
    multani: unicodeCategory("Multani"),
    khudawadi: unicodeCategory("Khudawadi"),
    grantha: unicodeCategory("Grantha"),
    tirhuta: unicodeCategory("Tirhuta"),
    siddham: unicodeCategory("Siddham"),
    modi: unicodeCategory("Modi"),
    takri: unicodeCategory("Takri"),
    ahom: unicodeCategory("Ahom"),
    warangCiti: unicodeCategory("Warang Citi"),
    pauCinHau: unicodeCategory("Pau Cin Hau"),
    cuneiform: unicodeCategory("Cuneiform"),
    cuneiformNumbersAndPunctuation: unicodeCategory("Cuneiform Numbers and Punctuation"),
    earlyDynasticCuneiform: unicodeCategory("Early Dynastic Cuneiform"),
    egyptianHieroglyphs: unicodeCategory("Egyptian Hieroglyphs"),
    anatolianHieroglyphs: unicodeCategory("Anatolian Hieroglyphs"),
    bamumSupplement: unicodeCategory("Bamum Supplement"),
    mro: unicodeCategory("Mro"),
    bassaVah: unicodeCategory("Bassa Vah"),
    pahawhHmong: unicodeCategory("Pahawh Hmong"),
    miao: unicodeCategory("Miao"),
    kanaSupplement: unicodeCategory("Kana Supplement"),
    duployan: unicodeCategory("Duployan"),
    shorthandFormatControls: unicodeCategory("Shorthand Format Controls"),
    byzantineMusicalSymbols: unicodeCategory("Byzantine Musical Symbols"),
    musicalSymbols: unicodeCategory("Musical Symbols"),
    ancientGreekMusicalNotation: unicodeCategory("Ancient Greek Musical Notation"),
    taiXuanJingSymbols: unicodeCategory("Tai Xuan Jing Symbols"),
    countingRodNumerals: unicodeCategory("Counting Rod Numerals"),
    mathematicalAlphanumericSymbols: unicodeCategory("Mathematical Alphanumeric Symbols"),
    suttonSignWriting: unicodeCategory("Sutton SignWriting"),
    mendekikak: unicodeCategory("Mende Kikakui"),
    arabicMathematicalAlphabeticSymbols: unicodeCategory("Arabic Mathematical Alphabetic Symbols"),
    mahjongTiles: unicodeCategory("Mahjong Tiles"),
    dominoTiles: unicodeCategory("Domino Tiles"),
    playingCards: unicodeCategory("Playing Cards"),
    enclosedAlphanumericSupplement: unicodeCategory("Enclosed Alphanumeric Supplement"),
    enclosedIdeographicSupplement: unicodeCategory("Enclosed Ideographic Supplement"),
    miscellaneousSymbolsAndPictographs: unicodeCategory("Miscellaneous Symbols and Pictographs"),
    emoticons: unicodeCategory("Emoticons (Emoji)"),
    ornamentalDingbats: unicodeCategory("Ornamental Dingbats"),
    transportAndMapSymbols: unicodeCategory("Transport and Map Symbols"),
    alchemicalSymbols: unicodeCategory("Alchemical Symbols"),
    geometricShapesExtended: unicodeCategory("Geometric Shapes Extended"),
    supplementalArrowsC: unicodeCategory("Supplemental Arrows-C"),
    supplementalSymbolsAndPictographs: unicodeCategory("Supplemental Symbols and Pictographs")
};
const categories = {};
const mod4 = {
    from: from2,
    digit: digit,
    nonZeroDigit: nonZeroDigit,
    unixNewline: unixNewline,
    windowsNewline: windowsNewline,
    newline: newline,
    space: space,
    tab: tab,
    hyphen: hyphen,
    underscore: underscore,
    lowercaseLetters: lowercaseLetters,
    uppercaseLetters: uppercaseLetters,
    letters: letters,
    concat: concat2,
    unicode: unicode,
    blocks: blocks,
    categories: categories
};
function from3(key, val, size) {
    return ()=>{
        const sizeTgt = unwrap(size);
        const record = {};
        for(let idx = 0; idx < sizeTgt; idx++){
            record[unwrap(key)] = unwrap(val);
        }
        return record;
    };
}
function choose2(obj, density) {
    return ()=>{
        const concreteElems = Object.entries(unwrap(obj));
        const subsetCount = BigInt(2) ^ BigInt(concreteElems.length);
        const index = unwrap(density(BigInt(0), subsetCount));
        const bits = index.toString(2).padStart(concreteElems.length, "0").split("");
        const subset = [];
        for(let idx = 0; idx < bits.length; idx++){
            if (bits[idx] === "1") {
                subset.push(concreteElems[idx]);
            }
        }
        return Object.fromEntries(subset);
    };
}
const mod5 = {
    from: from3,
    choose: choose2
};
function truth() {
    return ()=>{
        return true;
    };
}
function falsity() {
    return ()=>{
        return false;
    };
}
function oneOf1(density) {
    return ()=>{
        return oneOf(density, [
            true,
            false
        ])();
    };
}
const mod6 = {
    truth: truth,
    falsity: falsity,
    oneOf: oneOf1
};
function uniform1(from, to) {
    return ()=>{
        const lower = unwrap(from);
        const upper = unwrap(to);
        const diff = upper - lower;
        if (diff > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Range too large: ${lower}...${upper} (${diff} > ${Number.MAX_SAFE_INTEGER})`);
        }
        return BigInt(Math.floor(Math.random() * Number(diff))) + lower;
    };
}
const mod7 = {
    uniform: uniform1
};
function K(val) {
    return ()=>val;
}
const mod8 = {
    unwrap: unwrap,
    K: K,
    Array: mod,
    Logic: mod1,
    Number: mod2,
    Set: mod3,
    String: mod4,
    Object: mod5,
    Boolean: mod6,
    BigInt: mod7
};
function parseUrn(urn, namespace = "ró") {
    if (!urn.startsWith(`urn:${namespace}:`)) {
        throw new Error(`Invalid URN for namespace ${namespace}: ${urn}`);
    }
    const delimited = urn.split(":");
    const type = delimited[2];
    const idx = urn.indexOf("?");
    const queryString = idx !== -1 ? urn.slice(idx + 1) : "";
    const id = idx !== -1 ? delimited[3].slice(0, delimited[3].indexOf("?")) : delimited[3];
    const qs = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
    return {
        type,
        id,
        qs
    };
}
function asUrn(value, namespace = "ró") {
    if (typeof value !== "string" || !value.startsWith(`urn:${namespace}:`)) {
        return {
            type: "unknown",
            id: value,
            qs: {}
        };
    }
    return parseUrn(value, namespace);
}
class IndexedSet {
    #idx;
    #map;
    #reverseMap;
    constructor(){
        this.#idx = 0;
        this.#map = new Map();
        this.#reverseMap = new Map();
    }
    map() {
        return this.#map;
    }
    reverseMap() {
        return this.#reverseMap;
    }
    add(value) {
        if (this.#map.has(value)) {
            return this.#map.get(value);
        }
        this.#map.set(value, this.#idx);
        this.#reverseMap.set(this.#idx, value);
        this.#idx++;
        return this.#idx - 1;
    }
    setIndex(value, index) {
        this.#map.set(value, index);
        this.#reverseMap.set(index, value);
    }
    getIndex(value) {
        return this.#map.get(value);
    }
    getValue(idx) {
        return this.#reverseMap.get(idx);
    }
    has(value) {
        return this.#map.has(value);
    }
    clone() {
        const newSet = new IndexedSet();
        for (const [key, value] of this.#map.entries()){
            newSet.setIndex(key, value);
        }
        return newSet;
    }
}
class Sets {
    static intersection(metrics, sets) {
        if (sets.length === 0) {
            return new Set();
        }
        sets.sort((setA, setB)=>{
            return setA.size - setB.size;
        });
        const acc = new Set(sets[0]);
        for(let idx = 1; idx < sets.length; idx++){
            const currentSet = sets[idx];
            for (const value of acc){
                metrics.setCheck();
                if (!currentSet.has(value)) {
                    acc.delete(value);
                }
            }
            if (acc.size === 0) {
                break;
            }
        }
        return acc;
    }
    static append(set0, set1) {
        for (const item of set1){
            set0.add(item);
        }
        return set0;
    }
    static difference(set0, set1) {
        const result = new Set();
        for (const item of set0){
            if (!set1.has(item)) {
                result.add(item);
            }
        }
        return result;
    }
}
class IndexPerformanceMetrics {
    mapReadCount;
    constructor(){
        this.mapReadCount = 0;
    }
    mapRead() {
        this.mapReadCount++;
    }
    clone() {
        const clone = new IndexPerformanceMetrics();
        clone.mapReadCount = this.mapReadCount;
        return clone;
    }
}
class TribbleDBPerformanceMetrics {
    setCheckCount;
    constructor(){
        this.setCheckCount = 0;
    }
    setCheck() {
        this.setCheckCount++;
    }
    clone() {
        const clone = new TribbleDBPerformanceMetrics();
        clone.setCheckCount = this.setCheckCount;
        return clone;
    }
}
class Index {
    indexedTriples;
    tripleMetadata;
    stringIndex;
    tripleHashes;
    hashIndices;
    sourceType;
    sourceId;
    sourceQs;
    relations;
    targetType;
    targetId;
    targetQs;
    metrics;
    stringUrn;
    constructor(triples){
        this.indexedTriples = [];
        this.tripleMetadata = new Map();
        this.stringIndex = new IndexedSet();
        this.tripleHashes = new Set();
        this.hashIndices = new Map();
        this.sourceType = new Map();
        this.sourceId = new Map();
        this.sourceQs = new Map();
        this.relations = new Map();
        this.targetType = new Map();
        this.targetId = new Map();
        this.targetQs = new Map();
        this.stringUrn = new Map();
        this.add(triples);
        this.metrics = new IndexPerformanceMetrics();
    }
    delete(triples) {
        for(let idx = 0; idx < triples.length; idx++){
            const triple = triples[idx];
            const tripleHash = this.hashTriple(triple);
            const tripleIndex = this.hashIndices.get(tripleHash);
            if (tripleIndex === undefined) {
                continue;
            }
            this.tripleHashes.delete(tripleHash);
            this.hashIndices.delete(tripleHash);
            const metadata = this.tripleMetadata.get(tripleIndex);
            if (metadata) {
                this.sourceType.get(metadata.sourceTypeIdx)?.delete(tripleIndex);
                this.sourceId.get(metadata.sourceIdIdx)?.delete(tripleIndex);
                this.relations.get(metadata.relationIdx)?.delete(tripleIndex);
                this.targetType.get(metadata.targetTypeIdx)?.delete(tripleIndex);
                this.targetId.get(metadata.targetIdIdx)?.delete(tripleIndex);
                for (const qsIdx of metadata.sourceQsIndices){
                    this.sourceQs.get(qsIdx)?.delete(tripleIndex);
                }
                for (const qsIdx of metadata.targetQsIndices){
                    this.targetQs.get(qsIdx)?.delete(tripleIndex);
                }
                this.tripleMetadata.delete(tripleIndex);
            }
            delete this.indexedTriples[tripleIndex];
        }
    }
    difference(triples) {
        return triples.filter((triple)=>!this.hasTriple(triple));
    }
    hasTriple(triple) {
        return this.tripleHashes.has(this.hashTriple(triple));
    }
    hashTriple(triple) {
        const str = `${triple[0]}${triple[1]}${triple[2]}`;
        let hash = 0;
        for(let i = 0, len = str.length; i < len; i++){
            const chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0;
        }
        return hash.toString();
    }
    getTripleIndex(triple) {
        const hash = this.hashTriple(triple);
        return this.hashIndices.get(hash);
    }
    add(triples) {
        for(let jdx = 0; jdx < triples.length; jdx++){
            const triple = triples[jdx];
            const source = triple[0];
            const relation = triple[1];
            const target = triple[2];
            let parsedSource = this.stringUrn.get(source);
            if (!parsedSource) {
                parsedSource = asUrn(source);
                this.stringUrn.set(source, parsedSource);
            }
            let parsedTarget = this.stringUrn.get(target);
            if (!parsedTarget) {
                parsedTarget = asUrn(target);
                this.stringUrn.set(target, parsedTarget);
            }
            const sourceIdx = this.stringIndex.add(source);
            const relationIdx = this.stringIndex.add(relation);
            const targetIdx = this.stringIndex.add(target);
            const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
            const sourceIdIdx = this.stringIndex.add(parsedSource.id);
            const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
            const targetIdIdx = this.stringIndex.add(parsedTarget.id);
            const hash = this.hashTriple(triple);
            if (this.tripleHashes.has(hash)) {
                continue;
            }
            this.tripleHashes.add(hash);
            const idx = this.indexedTriples.length;
            this.hashIndices.set(hash, idx);
            this.indexedTriples.push([
                sourceIdx,
                relationIdx,
                targetIdx
            ]);
            const sourceQsIndices = [];
            const targetQsIndices = [];
            let sourceTypeSet = this.sourceType.get(sourceTypeIdx);
            if (!sourceTypeSet) {
                sourceTypeSet = new Set();
                this.sourceType.set(sourceTypeIdx, sourceTypeSet);
            }
            sourceTypeSet.add(idx);
            let sourceIdSet = this.sourceId.get(sourceIdIdx);
            if (!sourceIdSet) {
                sourceIdSet = new Set();
                this.sourceId.set(sourceIdIdx, sourceIdSet);
            }
            sourceIdSet.add(idx);
            for (const [key, val] of Object.entries(parsedSource.qs)){
                const qsIdx = this.stringIndex.add(`${key}=${val}`);
                sourceQsIndices.push(qsIdx);
                let sourceQsSet = this.sourceQs.get(qsIdx);
                if (!sourceQsSet) {
                    sourceQsSet = new Set();
                    this.sourceQs.set(qsIdx, sourceQsSet);
                }
                sourceQsSet.add(idx);
            }
            let relationSet = this.relations.get(relationIdx);
            if (!relationSet) {
                relationSet = new Set();
                this.relations.set(relationIdx, relationSet);
            }
            relationSet.add(idx);
            let targetTypeSet = this.targetType.get(targetTypeIdx);
            if (!targetTypeSet) {
                targetTypeSet = new Set();
                this.targetType.set(targetTypeIdx, targetTypeSet);
            }
            targetTypeSet.add(idx);
            let targetIdSet = this.targetId.get(targetIdIdx);
            if (!targetIdSet) {
                targetIdSet = new Set();
                this.targetId.set(targetIdIdx, targetIdSet);
            }
            targetIdSet.add(idx);
            for (const [key, val] of Object.entries(parsedTarget.qs)){
                const qsIdx = this.stringIndex.add(`${key}=${val}`);
                targetQsIndices.push(qsIdx);
                let targetQsSet = this.targetQs.get(qsIdx);
                if (!targetQsSet) {
                    targetQsSet = new Set();
                    this.targetQs.set(qsIdx, targetQsSet);
                }
                targetQsSet.add(idx);
            }
            this.tripleMetadata.set(idx, {
                sourceTypeIdx,
                sourceIdIdx,
                sourceQsIndices,
                relationIdx,
                targetTypeIdx,
                targetIdIdx,
                targetQsIndices
            });
        }
    }
    get length() {
        return this.tripleHashes.size;
    }
    get arrayLength() {
        return this.indexedTriples.length;
    }
    triples() {
        return this.indexedTriples.filter((triple)=>triple !== undefined).map(([sourceIdx, relationIdx, targetIdx])=>[
                this.stringIndex.getValue(sourceIdx),
                this.stringIndex.getValue(relationIdx),
                this.stringIndex.getValue(targetIdx)
            ]);
    }
    getTriple(index) {
        if (index < 0 || index >= this.indexedTriples.length) {
            return undefined;
        }
        const indexedTriple = this.indexedTriples[index];
        if (!indexedTriple) {
            return undefined;
        }
        const [sourceIdx, relationIdx, targetIdx] = indexedTriple;
        return [
            this.stringIndex.getValue(sourceIdx),
            this.stringIndex.getValue(relationIdx),
            this.stringIndex.getValue(targetIdx)
        ];
    }
    getTripleIndices(index) {
        if (index < 0 || index >= this.indexedTriples.length) {
            return undefined;
        }
        return this.indexedTriples[index];
    }
    getSourceTypeSet(type) {
        const typeIdx = this.stringIndex.getIndex(type);
        if (typeIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.sourceType.get(typeIdx);
    }
    getSourceIdSet(id) {
        const idIdx = this.stringIndex.getIndex(id);
        if (idIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.sourceId.get(idIdx);
    }
    getSourceQsSet(key, val) {
        const qsIdx = this.stringIndex.getIndex(`${key}=${val}`);
        if (qsIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.sourceQs.get(qsIdx);
    }
    getRelationSet(relation) {
        const relationIdx = this.stringIndex.getIndex(relation);
        if (relationIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.relations.get(relationIdx);
    }
    getTargetTypeSet(type) {
        const typeIdx = this.stringIndex.getIndex(type);
        if (typeIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.targetType.get(typeIdx);
    }
    getTargetIdSet(id) {
        const idIdx = this.stringIndex.getIndex(id);
        if (idIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.targetId.get(idIdx);
    }
    getTargetQsSet(key, val) {
        const qsIdx = this.stringIndex.getIndex(`${key}=${val}`);
        if (qsIdx === undefined) {
            return undefined;
        }
        this.metrics.mapRead();
        return this.targetQs.get(qsIdx);
    }
    clone() {
        const newIndex = new Index([]);
        newIndex.indexedTriples = this.indexedTriples.slice();
        newIndex.tripleMetadata = new Map(this.tripleMetadata);
        newIndex.stringIndex = this.stringIndex.clone();
        newIndex.tripleHashes = new Set(this.tripleHashes);
        newIndex.hashIndices = new Map(this.hashIndices);
        const cloneMap = (original)=>{
            const newMap = new Map();
            for (const [key, valueSet] of original.entries()){
                newMap.set(key, new Set(valueSet));
            }
            return newMap;
        };
        newIndex.sourceType = cloneMap(this.sourceType);
        newIndex.sourceId = cloneMap(this.sourceId);
        newIndex.sourceQs = cloneMap(this.sourceQs);
        newIndex.relations = cloneMap(this.relations);
        newIndex.targetType = cloneMap(this.targetType);
        newIndex.targetId = cloneMap(this.targetId);
        newIndex.targetQs = cloneMap(this.targetQs);
        newIndex.stringUrn = new Map(this.stringUrn);
        newIndex.metrics = this.metrics.clone();
        return newIndex;
    }
}
class Triples {
    static source(triple) {
        return triple[0];
    }
    static relation(triple) {
        return triple[1];
    }
    static target(triple) {
        return triple[2];
    }
}
function validateInput(params) {
    const allowedKeys = [
        "source",
        "relation",
        "target"
    ];
    if (!Array.isArray(params)) {
        for (const key of Object.keys(params)){
            if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
            if (!allowedKeys.includes(key)) {
                throw new Error(`Unexpected search parameter: ${key}`);
            }
        }
    }
}
function nodeTypeMatches(type, source, index) {
    const matches = source ? index.getSourceTypeSet(type) : index.getTargetTypeSet(type);
    if (matches === undefined || matches.size === 0) {
        return new Set();
    }
    return matches;
}
function nodeIdMatches(id, source, index) {
    const matches = new Set();
    const ids = Array.isArray(id) ? id : [
        id
    ];
    for (const subid of ids){
        const subidRows = source ? index.getSourceIdSet(subid) : index.getTargetIdSet(subid);
        if (subidRows) {
            Sets.append(matches, subidRows);
        }
    }
    if (matches.size === 0) {
        return new Set();
    }
    return matches;
}
function nodeQsMatches(qs, source, index, metrics) {
    const matches = [];
    for (const [key, val] of Object.entries(qs)){
        const qsSet = source ? index.getSourceQsSet(key, val) : index.getTargetQsSet(key, val);
        if (typeof qsSet === "undefined") {
            return new Set();
        }
        matches.push(qsSet);
    }
    return Sets.intersection(metrics, matches);
}
function nodeMatches(query, source, index, metrics, cursorIndices) {
    let typeRows = undefined;
    if (query.type) {
        typeRows = nodeTypeMatches(query.type, source, index);
        if (typeRows.size === 0) {
            return new Set();
        }
    }
    let idRows = undefined;
    if (query.id) {
        idRows = nodeIdMatches(query.id, source, index);
        if (idRows.size === 0) {
            return new Set();
        }
    }
    let qsRows = undefined;
    if (query.qs && Object.keys(query.qs).length > 0) {
        qsRows = nodeQsMatches(query.qs, source, index, metrics);
        if (qsRows.size === 0) {
            return new Set();
        }
    }
    if (typeRows === undefined && idRows === undefined && qsRows === undefined) {
        const pred = query.predicate;
        if (!pred) {
            return cursorIndices;
        }
        const indexCopy = new Set([
            ...cursorIndices
        ]);
        for (const idx of indexCopy){
            const triple = index.getTriple(idx);
            if (!triple) {
                indexCopy.delete(idx);
                continue;
            }
            if (!pred(source ? triple[0] : triple[2])) {
                indexCopy.delete(idx);
            }
        }
        return indexCopy;
    }
    const matches = [
        cursorIndices
    ];
    if (typeRows !== undefined) {
        matches.push(typeRows);
    }
    if (idRows !== undefined) {
        matches.push(idRows);
    }
    if (qsRows !== undefined) {
        matches.push(qsRows);
    }
    const matchingRows = Sets.intersection(metrics, matches);
    if (!query.predicate) {
        return matchingRows;
    }
    const pred = query.predicate;
    for (const idx of matchingRows){
        const triple = index.getTriple(idx);
        if (!pred(source ? triple[0] : triple[2])) {
            matchingRows.delete(idx);
        }
    }
    return matchingRows;
}
function findMatchingNodes(query, source, index, metrics, cursorIndices) {
    const matches = new Set();
    for (const subquery of query){
        Sets.append(matches, nodeMatches(subquery, source, index, metrics, cursorIndices));
    }
    return matches;
}
function findMatchingRelations(query, index) {
    const relations = Array.isArray(query.relation) ? query.relation : [
        query.relation
    ];
    const matches = new Set();
    for (const rel of relations){
        const relationSet = index.getRelationSet(rel);
        if (relationSet) {
            Sets.append(matches, relationSet);
        }
    }
    if (!query.predicate) {
        return matches;
    }
    const pred = query.predicate;
    for (const idx of matches){
        const triple = index.getTriple(idx);
        if (!triple) {
            matches.delete(idx);
            continue;
        }
        if (!pred(triple[1])) {
            matches.delete(idx);
        }
    }
    return matches;
}
function findMatchingRows(params, index, cursorIndices, metrics) {
    const { source, relation, target } = params;
    const matchingRowSets = [];
    if (source) {
        const input = Array.isArray(source) ? source : [
            source
        ];
        const matches = findMatchingNodes(input, true, index, metrics, cursorIndices);
        matchingRowSets.push(matches);
    }
    if (relation) {
        matchingRowSets.push(findMatchingRelations(relation, index));
    }
    if (target) {
        const input = Array.isArray(target) ? target : [
            target
        ];
        const matches = findMatchingNodes(input, false, index, metrics, cursorIndices);
        matchingRowSets.push(matches);
    }
    if (matchingRowSets.length === 0) {
        return cursorIndices;
    }
    return Sets.intersection(metrics, matchingRowSets);
}
function isUrn(value) {
    return value.startsWith(`urn:`);
}
function parseNodeSearch(search) {
    if (typeof search === "string") {
        return isUrn(search) ? [
            asUrn(search)
        ] : [
            {
                type: "unknown",
                id: search
            }
        ];
    }
    if (Array.isArray(search)) {
        return search.map((subsearch)=>{
            return isUrn(subsearch) ? asUrn(subsearch) : {
                type: "unknown",
                id: subsearch
            };
        });
    }
    return [
        search
    ];
}
function parseRelation(search) {
    return typeof search === "string" || Array.isArray(search) ? {
        relation: search
    } : search;
}
function parseSearch(search) {
    const source = Array.isArray(search) ? search[0] : search.source;
    const relation = Array.isArray(search) ? search[1] : search.relation;
    const target = Array.isArray(search) ? search[2] : search.target;
    const out = {};
    if (source) {
        out.source = parseNodeSearch(source);
    }
    if (relation) {
        out.relation = parseRelation(relation);
    }
    if (target) {
        out.target = parseNodeSearch(target);
    }
    return out;
}
class TribbleDB {
    index;
    triplesCount;
    cursorIndices;
    metrics;
    validations;
    constructor(triples, validations = {}){
        this.index = new Index(triples);
        this.triplesCount = this.index.length;
        this.cursorIndices = new Set();
        this.metrics = new TribbleDBPerformanceMetrics();
        this.validations = validations;
        for(let idx = 0; idx < this.triplesCount; idx++){
            this.cursorIndices.add(idx);
        }
    }
    clone() {
        const clonedDB = new TribbleDB([]);
        clonedDB.index = this.index;
        clonedDB.triplesCount = this.triplesCount;
        clonedDB.cursorIndices = this.cursorIndices;
        clonedDB.metrics = this.metrics;
        return clonedDB;
    }
    static of(triples) {
        return new TribbleDB(triples);
    }
    static from(objects) {
        const triples = [];
        for (const obj of objects){
            const { id, ...relations } = obj;
            if (typeof id !== "string") {
                throw new Error("Each TripleObject must have a string id.");
            }
            for (const [relation, target] of Object.entries(relations)){
                if (Array.isArray(target)) {
                    for (const sub of target){
                        triples.push([
                            id,
                            relation,
                            sub
                        ]);
                    }
                } else {
                    triples.push([
                        id,
                        relation,
                        target
                    ]);
                }
            }
        }
        return new TribbleDB(triples);
    }
    validateTriples(triples) {
        const messages = [];
        for (const [source, relation, target] of triples){
            const validator = this.validations[relation];
            if (!validator) {
                continue;
            }
            const { type } = asUrn(source);
            const res = validator(type, relation, target);
            if (typeof res === "string") {
                messages.push(res);
            }
        }
        if (messages.length > 0) {
            throw new Error(`Triple validation failed:\n- ${messages.join("\n- ")}`);
        }
    }
    add(triples) {
        const oldLength = this.index.arrayLength;
        this.validateTriples(triples);
        this.index.add(triples);
        this.triplesCount = this.index.length;
        for(let idx = oldLength; idx < this.index.arrayLength; idx++){
            this.cursorIndices.add(idx);
        }
    }
    map(fn) {
        return new TribbleDB(this.index.triples().map(fn));
    }
    flatMap(fn) {
        const flatMappedTriples = this.index.triples().flatMap(fn);
        const newDb = new TribbleDB([]);
        newDb.index = this.index.clone();
        newDb.add(flatMappedTriples);
        return newDb;
    }
    deduplicateTriples(triples) {
        const seen = new Set();
        const result = [];
        for (const triple of triples){
            const hash = this.index.hashTriple(triple);
            if (!seen.has(hash)) {
                seen.add(hash);
                result.push(triple);
            }
        }
        return result;
    }
    searchFlatmap(search, fn) {
        const searchResults = this.search(search);
        const matchingTriples = searchResults.triples();
        const transformedTriples = matchingTriples.flatMap(fn);
        const deduplicatedTransformed = this.deduplicateTriples(transformedTriples);
        const originalHashMap = new Map();
        for (const triple of matchingTriples){
            const hash = this.index.hashTriple(triple);
            originalHashMap.set(hash, triple);
        }
        const transformedHashMap = new Map();
        for (const triple of deduplicatedTransformed){
            const hash = this.index.hashTriple(triple);
            transformedHashMap.set(hash, triple);
        }
        const triplesToDelete = [];
        const triplesToAdd = [];
        for (const [hash, triple] of originalHashMap){
            if (!transformedHashMap.has(hash)) {
                triplesToDelete.push(triple);
            }
        }
        for (const [hash, triple] of transformedHashMap){
            if (!originalHashMap.has(hash)) {
                triplesToAdd.push(triple);
            }
        }
        this.delete(triplesToDelete);
        this.add(triplesToAdd);
        return this;
    }
    firstTriple() {
        return this.index.length > 0 ? this.index.getTriple(0) : undefined;
    }
    firstSource() {
        const first = this.firstTriple();
        return first ? Triples.source(first) : undefined;
    }
    firstRelation() {
        const first = this.firstTriple();
        return first ? Triples.relation(first) : undefined;
    }
    firstTarget() {
        const first = this.firstTriple();
        return first ? Triples.target(first) : undefined;
    }
    firstObject(listOnly = false) {
        let firstId = undefined;
        const obj = {};
        for (const [source, relation, target] of this.index.triples()){
            if (firstId === undefined) {
                firstId = source;
                obj.id = source;
            }
            if (firstId !== source) {
                continue;
            }
            if (!obj[relation]) {
                obj[relation] = listOnly ? [
                    target
                ] : target;
            } else if (Array.isArray(obj[relation])) {
                if (!obj[relation].includes(target)) {
                    obj[relation].push(target);
                }
            } else {
                obj[relation] = obj[relation] === target ? obj[relation] : [
                    obj[relation],
                    target
                ];
            }
        }
        return Object.keys(obj).length > 0 ? obj : undefined;
    }
    triples() {
        return this.index.triples();
    }
    sources() {
        return new Set(this.index.triples().map(Triples.source));
    }
    relations() {
        return new Set(this.index.triples().map(Triples.relation));
    }
    targets() {
        return new Set(this.index.triples().map(Triples.target));
    }
    objects(listOnly = false) {
        const output = [];
        for (const [id, obj] of Object.entries(this.#object(listOnly))){
            obj.id = id;
            output.push(obj);
        }
        return output;
    }
    #object(listOnly = false) {
        const objs = {};
        for (const [source, relation, target] of this.index.triples()){
            if (!objs[source]) {
                objs[source] = {
                    id: source
                };
            }
            const relationRef = objs[source][relation];
            if (!relationRef) {
                objs[source][relation] = listOnly ? [
                    target
                ] : target;
            } else if (Array.isArray(relationRef)) {
                if (!relationRef.includes(target)) {
                    relationRef.push(target);
                }
            } else {
                objs[source][relation] = relationRef === target ? relationRef : [
                    relationRef,
                    target
                ];
            }
        }
        return objs;
    }
    search(params) {
        const parsed = parseSearch(params);
        validateInput(parsed);
        const matchingTriples = [];
        for (const rowIdx of findMatchingRows(parsed, this.index, this.cursorIndices, this.metrics)){
            const triple = this.index.getTriple(rowIdx);
            if (triple !== undefined) {
                matchingTriples.push(triple);
            }
        }
        return new TribbleDB(matchingTriples);
    }
    getMetrics() {
        return {
            index: this.index.metrics,
            db: this.metrics
        };
    }
    readThing(urn, opts = {
        qs: false
    }) {
        if (opts.qs) {
            const { type, id } = asUrn(urn);
            return this.search({
                source: {
                    type,
                    id
                }
            }).firstObject();
        } else {
            return this.search({
                source: urn
            }).firstObject();
        }
    }
    readThings(urns, opts = {
        qs: false
    }) {
        const results = [];
        for (const urn of urns){
            const thing = this.readThing(urn, opts);
            if (thing !== undefined) {
                results.push(thing);
            }
        }
        return results;
    }
    parseThing(parser, urn, opts = {
        qs: false
    }) {
        const thing = this.readThing(urn, opts);
        if (thing) {
            return parser(thing);
        } else {
            return undefined;
        }
    }
    parseThings(parser, urns, opts = {
        qs: false
    }) {
        const results = [];
        for (const urn of urns){
            const res = this.parseThing(parser, urn, opts);
            if (res) {
                results.push(res);
            }
        }
        return results;
    }
    merge(other) {
        this.add(other.triples());
        return this;
    }
    delete(triples) {
        const indicesToDelete = new Set();
        for (const triple of triples){
            const tripleIndex = this.index.getTripleIndex(triple);
            if (tripleIndex !== undefined) {
                indicesToDelete.add(tripleIndex);
            }
        }
        this.index.delete(triples);
        this.triplesCount = this.index.length;
        for (const idx of indicesToDelete){
            this.cursorIndices.delete(idx);
        }
        return this;
    }
}
const { uniform: U } = mod8.Number;
const { unwrap: unwrap1 } = mod8;
function ID(len) {
    return mod8.String.from(mod8.String.lowercaseLetters(U), len);
}
function Type(len) {
    return mod8.String.from(mod8.String.lowercaseLetters(U), len);
}
function QSKey(len) {
    return mod8.String.from(mod8.String.lowercaseLetters(U), len);
}
function QSValue(len) {
    return mod8.String.from(mod8.String.lowercaseLetters(U), len);
}
function QSPair(keyLen, valueLen) {
    return mod8.String.concat(QSKey(keyLen), "=", QSValue(valueLen));
}
function NodeID(idLen) {
    return ID(idLen);
}
function NodeIDType(idLen, typeLen) {
    return mod8.String.concat(ID(idLen), ":", Type(typeLen));
}
function NodeIDTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen) {
    const QSString = ()=>{
        const pairs = [];
        const count = unwrap1(numQS);
        for(let idx = 0; idx < count; idx++){
            const pair = unwrap1(QSPair(qsKeyLen, qsValueLen));
            pairs.push(pair);
        }
        return pairs.join("&");
    };
    return mod8.String.concat(ID(idLen), ":", Type(typeLen), "?", QSString);
}
function Relation(len) {
    return mod8.String.from(mod8.String.lowercaseLetters(U), len);
}
function TripleNodeId(idLen, relationLen) {
    return mod8.Array.concat(NodeID(idLen), Relation(relationLen), NodeID(idLen));
}
function TripleNodeIdType(idLen, typeLen, relationLen) {
    return mod8.Array.concat(NodeIDType(idLen, typeLen), Relation(relationLen), NodeIDType(idLen, typeLen));
}
function TripleNodeIdTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen, relationLen) {
    return mod8.Array.concat(NodeIDTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen), Relation(relationLen), NodeIDTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen));
}
function TriplesNodeId(count, idLen, relationLen) {
    return mod8.Array.from(TripleNodeId(idLen, relationLen), count);
}
function TriplesNodeIdType(count, idLen, typeLen, relationLen) {
    return mod8.Array.from(TripleNodeIdType(idLen, typeLen, relationLen), count);
}
function TriplesNodeIdTypeQS(count, idLen, typeLen, numQS, qsKeyLen, qsValueLen, relationLen) {
    return mod8.Array.from(TripleNodeIdTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen, relationLen), count);
}
const SAMPLE_SIZES = [
    1_000,
    5_000,
    10_000,
    50_000,
    100_000
];
for (const samples of SAMPLE_SIZES){
    const experiment = {
        experiment: 'SearchFlatMap',
        sampleSize: samples,
        category: 'NodeID, high uniqueness, identity transform',
        parameters: {
            ID_LENGTH: 20,
            RELATION_LENGTH: 5
        }
    };
    Deno.bench({
        name: JSON.stringify(experiment),
        group: 'TribbleDB SearchFlatMap (NodeID)',
        fn (bench) {
            const ID_LENGTH = experiment.parameters.ID_LENGTH;
            const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
            const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);
            const data = unwrap(sampleData);
            const db = new TribbleDB(data);
            bench.start();
            db.searchFlatmap({}, (x)=>[
                    x
                ]);
        }
    });
}
for (const samples of SAMPLE_SIZES){
    const experiment = {
        experiment: 'SearchFlatMap',
        sampleSize: samples,
        category: 'NodeID, high uniqueness, full transform',
        parameters: {
            ID_LENGTH: 20,
            RELATION_LENGTH: 5
        }
    };
    Deno.bench({
        name: JSON.stringify(experiment),
        group: 'TribbleDB SearchFlatMap (NodeID)',
        fn (bench) {
            const ID_LENGTH = experiment.parameters.ID_LENGTH;
            const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
            const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);
            const data = unwrap(sampleData);
            const db = new TribbleDB(data);
            bench.start();
            db.searchFlatmap({}, (x)=>[
                    x.reverse()
                ]);
        }
    });
}
for (const samples of SAMPLE_SIZES){
    const experiment = {
        experiment: 'SearchFlatMap',
        sampleSize: samples,
        category: 'NodeIDType, high uniqueness, identity transform',
        parameters: {
            ID_LENGTH: 20,
            RELATION_LENGTH: 5,
            TYPE_LENGTH: 10
        }
    };
    Deno.bench({
        name: JSON.stringify(experiment),
        group: 'TribbleDB SearchFlatMap (NodeIDType)',
        fn (bench) {
            const ID_LENGTH = experiment.parameters.ID_LENGTH;
            const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
            const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
            const sampleData = TriplesNodeIdType(samples, ID_LENGTH, TYPE_LENGTH, RELATION_LENGTH);
            const data = unwrap(sampleData);
            const db = new TribbleDB(data);
            bench.start();
            db.searchFlatmap({}, (x)=>[
                    x
                ]);
        }
    });
}
for (const samples of SAMPLE_SIZES){
    const experiment = {
        experiment: 'SearchFlatMap',
        sampleSize: samples,
        category: 'NodeIDType, high uniqueness, full transform',
        parameters: {
            ID_LENGTH: 20,
            RELATION_LENGTH: 5,
            TYPE_LENGTH: 10
        }
    };
    Deno.bench({
        name: JSON.stringify(experiment),
        group: 'TribbleDB SearchFlatMap (NodeIDType)',
        fn (bench) {
            const ID_LENGTH = experiment.parameters.ID_LENGTH;
            const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
            const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
            const sampleData = TriplesNodeIdType(samples, ID_LENGTH, TYPE_LENGTH, RELATION_LENGTH);
            const data = unwrap(sampleData);
            const db = new TribbleDB(data);
            bench.start();
            db.searchFlatmap({}, (x)=>[
                    x.reverse()
                ]);
        }
    });
}
for (const samples of SAMPLE_SIZES){
    const experiment = {
        experiment: 'SearchFlatMap',
        sampleSize: samples,
        category: 'NodeIDTypeQS, high uniqueness, identity transform',
        parameters: {
            ID_LENGTH: 20,
            RELATION_LENGTH: 5,
            TYPE_LENGTH: 10,
            NUM_QS: 3,
            KEY_LENGTH: 10,
            VALUE_LENGTH: 10
        }
    };
    Deno.bench({
        name: JSON.stringify(experiment),
        group: 'TribbleDB SearchFlatMap (NodeIDTypeQS)',
        fn (bench) {
            const ID_LENGTH = experiment.parameters.ID_LENGTH;
            const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
            const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
            const NUM_QS = experiment.parameters.NUM_QS;
            const KEY_LENGTH = experiment.parameters.KEY_LENGTH;
            const VALUE_LENGTH = experiment.parameters.VALUE_LENGTH;
            const sampleData = TriplesNodeIdTypeQS(samples, ID_LENGTH, TYPE_LENGTH, NUM_QS, KEY_LENGTH, VALUE_LENGTH, RELATION_LENGTH);
            const data = unwrap(sampleData);
            const db = new TribbleDB(data);
            bench.start();
            db.searchFlatmap({}, (x)=>[
                    x
                ]);
        }
    });
}
for (const samples of SAMPLE_SIZES){
    const experiment = {
        experiment: 'SearchFlatMap',
        sampleSize: samples,
        category: 'NodeIDTypeQS, high uniqueness, full transform',
        parameters: {
            ID_LENGTH: 20,
            RELATION_LENGTH: 5,
            TYPE_LENGTH: 10,
            NUM_QS: 3,
            KEY_LENGTH: 10,
            VALUE_LENGTH: 10
        }
    };
    Deno.bench({
        name: JSON.stringify(experiment),
        group: 'TribbleDB SearchFlatMap (NodeIDTypeQS)',
        fn (bench) {
            const ID_LENGTH = experiment.parameters.ID_LENGTH;
            const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
            const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
            const NUM_QS = experiment.parameters.NUM_QS;
            const KEY_LENGTH = experiment.parameters.KEY_LENGTH;
            const VALUE_LENGTH = experiment.parameters.VALUE_LENGTH;
            const sampleData = TriplesNodeIdTypeQS(samples, ID_LENGTH, TYPE_LENGTH, NUM_QS, KEY_LENGTH, VALUE_LENGTH, RELATION_LENGTH);
            const data = unwrap(sampleData);
            const db = new TribbleDB(data);
            bench.start();
            db.searchFlatmap({}, (x)=>[
                    x.reverse()
                ]);
        }
    });
}
