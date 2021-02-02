function sendMessage(type, data) {
  self.postMessage({type: type, data: data});
}

self.onmessage = function(event) {
  switch (event.data.type) {
    case "SWF_URL":
      processSWFURL(event.data.data);
      break;
    default:
      break;
  }
}

var console = {};
console.log = function(...args) {
  sendMessage("con.log", args);
}
console.warn = function(...args) {
  sendMessage("con.war", args);
}
console.error = function(...args) {
  sendMessage("con.err", args);
}


function processSWFURL(url) {
  loadBinFile(url).then((byteArray) => {
    let SWF = rebuildSWF(byteArray);
    console.log(SWF._file, "\n");
    SWF.readFileHeader();
    console.log("File Version: ", SWF.Version, "\nFile Length: ", SWF.FileLength, "\nFrame Size: ", SWF.FrameSize, "\nFrame Rate: ", SWF.FrameRate, "\nFrame Count: ", SWF.FrameCount, "\n");
    SWF.readFileBody();
  }).catch((e) => {
    console.log("Error loading .swf file ", url, "\n", e);
  });
}


class Position {
  v;
  constructor(pos = 0) {
    this.v = pos;
  }
}

class RGB {
  Red;
  Green;
  Blue;
}
class RGBA {
  Red;
  Green;
  Blue;
  Alpha;
}
class Rectangle {
  Nbits;
  Xmin;
  Xmax;
  Ymin;
  Ymax;
}
class MATRIX {
  HasScale;
  NScaleBits;
  ScaleX;
  ScaleY;
  HasRotate;
  NRotateBits;
  RotateSkew0;
  RotateSkew1;
  NTranslateBits;
  TranslateX;
  TranslateY;
}
class CXFORM {
  HasAddTerms;
  HasMultTerms;
  Nbits;
  RedMultTerm;
  GreenMultTerm;
  BlueMultTerm;
  RedAddTerm;
  GreenAddTerm;
  BlueAddTerm;
}
class CXFORMWITHALPHA {
  HasAddTerms;
  HasMultTerms;
  Nbits;
  RedMultTerm;
  GreenMultTerm;
  BlueMultTerm;
  AlphaMultTerm
  RedAddTerm;
  GreenAddTerm;
  BlueAddTerm;
  AlphaAddTerm
}


class SWFObject {
  character_id;
  depth;
  transformation_matrix;
  color_transform;
  name;
  clip_depth;
  ratio;
  type;
  data;
}

class SWF {
  _file;
  get length() {
    return this._file.length;
  }

  _PosBit;
  _Pos;

  // SWF Header
  Version;
  get FileLength() {return this._file.length;}
  set FileLength(value) {if (value != this._file.length) console.warn("read size is not the file size");}
  FrameSize;
  FrameRate;
  FrameCount;

  Dictionary;
  DisplayList;

  FileAttributes;

  constructor(size) {
    this._file = new Uint8Array(size);
    this._PosBit = new Position();
    this._PosBit.v = 0;

    this._Pos = new Position();
    this._Pos.v = 0;

    this.Dictionary = {0: null};
    this.DisplayList = {};
  }
  set(...args) {
    this._file.set(...args);
  }

  readFileHeader() {
    this._Pos.v = 0;
    this.getUI8(this._Pos); this.getUI8(this._Pos); this.getUI8(this._Pos);
    this.Version = this.getUI8(this._Pos);
    this.FileLength = this.getUI32(this._Pos);
    this.FrameSize = this.getRectangle(this._Pos);
    this.FrameRate = /*this.getUI16(this._Pos)*/this.getFIXED8(this._Pos);
    this.FrameCount = this.getUI16(this._Pos);
  }

  readFileBody() {
    let i = 0;
    while (this._Pos.v < this.FileLength && i < 100000) {
      this.readTag(this._Pos);
      i++;
    }
    console.log("pos: ", this._Pos.v, "file length: ", this.FileLength);
  }


  readRECORDHEADER(pos) {
    // read RECORDHEADER (short)
    let TagCodeAndLength = this.getUI16(pos);
    let TagCode = TagCodeAndLength >> 6;
    let Length = TagCodeAndLength & 0b111111;
    // read RECORDHEADER (long) if neccessary
    if (Length == 0x3f) {
      Length = this.getUI32(pos);
    }
    return {type: TagCode, length: Length};
  }

  readTag(pos) {
    let recordHeader = this.readRECORDHEADER(pos);
    switch (recordHeader.type) {
      case 69: // FileAttributes tag
        let FA = {};
        FA.Reserved = this.getUB(pos, this._BitPos, 1);
        FA.UseDirectBlit = this.getUB(pos, this._BitPos, 1);
        FA.UseGPU = this.getUB(pos, this._BitPos, 1);
        FA.HasMetadata = this.getUB(pos, this._BitPos, 1);
        FA.ActionScript3 = this.getUB(pos, this._BitPos, 1);
        FA.Reserved2 = this.getUB(pos, this._BitPos, 2);
        FA.UseNetwork = this.getUB(pos, this._BitPos, 1);
        FA.Reserved3 = this.getUB(pos, this._BitPos, 24);
        this.FileAttributes = FA;
        break;
      default:
        console.log(recordHeader.type);
        pos.v += recordHeader.length;
        break;
    }
  }


  getSI8(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++];
    //num = parseInt(num, 16);
    if (num > 127) num -= 256;
    return num;
  }
  getSI16(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++] | this._file[pos.v++] << 8;
    //num = parseInt(num, 16);
    if (num > 32767) num -= 65536;
    return num;
  }
  getSI32(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++] | this._file[pos.v++] << 8 | this._file[pos.v++] << 16 | this._file[pos.v++] << 24;
    //num = parseInt(num, 16);
    if (num > 2147483647) num -= 4294967296;
    return num;
  }

  getSI8n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this.getSI8(pos/* + (i * 1)*/);
    }
    return o;
  }
  getSI16n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this.getSI16(pos/* + (i * 2)*/);
    }
    return o;
  }

  getUI8(pos, noPosReset = false) {
    if (noPosReset !== true) {if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;}
    let num = this._file[pos.v++];
    //num = parseInt(num, 16);
    return num;
  }
  getUI16(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++] | this._file[pos.v++] << 8;
    //num = parseInt(num, 16);
    return num;
  }
  _getUI24(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++] | this._file[pos.v++] << 8 | this._file[pos.v++] << 16;
    //num = parseInt(num, 16);
    return num;
  }
  getUI32(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++] | this._file[pos.v++] << 8 | this._file[pos.v++] << 16 | this._file[pos.v++] << 24;
    //num = parseInt(num, 16);
    return num;
  }
  _getUI64(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let num = this._file[pos.v++] | this._file[pos.v++] << 8 | this._file[pos.v++] << 16 | this._file[pos.v++] << 24 | this._file[pos.v++] << 32 | this._file[pos.v++] << 40 | this._file[pos.v++] << 48 | this._file[pos.v++] << 56;
    //num = parseInt(num, 16);
    return num;
  }

  getUI8n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this.getUI8(pos/* + (i * 1)*/);
    }
    return o;
  }
  getUI16n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this.getUI16(pos/* + (i * 2)*/);
    }
    return o;
  }
  getUI24n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this._getUI24(pos/* + (i * 3)*/);
    }
    return o;
  }
  getUI32n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this.getUI32(pos/* + (i * 4)*/);
    }
    return o;
  }
  getUI64n(pos, n) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let o = [];
    for (let i = 0; i < n; i++) {
      o[o.length] = this._getUI64(pos/* + (i * 8)*/);
    }
    return o;
  }

  getFIXED(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let intP, floatP = 0, fp;
    fp = this.getUI16(pos);
    intP = this.getSI16(pos);
    for (let i = 15; i >= 0; i--) {
      floatP += ((fp & (1 << i)) >> i) * (1 / (1 << 16 - i));
    }
    return intP + floatP;
  }
  getFIXED8(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let intP, floatP = 0, fp;
    fp = this.getUI8(pos);
    intP = this.getSI8(pos);
    for (let i = 7; i >= 0; i--) {
      floatP += ((fp & (1 << i)) >> i) * (1 / (1 << 8 - i));
    }
    return intP + floatP;
  }

  getFLOAT16(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let p = pos.v + 2, o = ieee754.read(this._file, pos.v, true, 10, 2);
    pos.v = p;
    return o;
  }
  getFLOAT(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let p = pos.v + 4, o =  ieee754.read(this._file, pos.v, true, 23, 4);
    pos.v = p;
    return o;
  }
  getDOUBLE(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let p = pos.v + 8, o =  ieee754.read(this._file, pos.v, true, 52, 8);
    pos.v = p;
    return o;
  }

  getEncodedU32(pos) {
    if (this._PosBit.v != 0) pos.v++; this._PosBit.v = 0;
    let result = this._file[pos.v+0]
    if (!(result & 0x00000080)) {
      pos.v++;
      return result;
    }
    result = (result & 0x0000007f) | this._file[pos.v+1]<<7;
    if (!(result & 0x00004000)) {
      pos.v += 2;
      return result;
    }
    result = (result && 0x00003fff) | this._file[pos.v+2]<<14;
    if (!(result & 0x00200000)) {
      pos.v += 3;
      return result;
    }
    result = (result & 0x001fffff) | this._file[pos.v+3]<<21;
    if (!(result & 0x10000000)) {
      pos.v += 4;
      return result;
    }
    result = (result & 0x0fffffff) | this._file[pos.v+4]<<28;
    pos.v += 5;
    return result;
  }

  getSB(pos, posBit, nBits) {
    /*let o = 0;
    for (let i = 0; i < nBits; i++) {
      if (posBit.v > 7) {
        posBit.v = 0;
        pos.v++;
      }
      let bit = this.getUI8(pos); pos.v--;
      bit = (bit & (1 << posBit.v)) >> posBit.v;
      if (i == nBits - 1) o += (bit << i) * -1;
      else o += bit << i;
      posBit.v++;
    }
    if (posBit.v > 7) {
      posBit.v = 0;
      pos.v++;
    }
    //pos.v += Math.floor(nBits / 8);
    //posBit.v += nBits % 8;
    return o;*/
    let out = 0, PH = {v: pos.v}, byte = this.getUI8(PH, true);
    for (let i = 0; i < nBits; i++) {
      if (posBit.v > 7) {
        posBit.v = 0;
        pos.v++;
        PH.v = pos.v;
        byte = this.getUI8(PH, true);
      }
      let POB = 7 - posBit.v++;
      let bit = (byte >> POB) & 0x01;
      if (i == nBits - 1) out += (bit << ((nBits - 1) - i)) * -1;
      else out |= bit << ((nBits - 1) - i);
    }
    if (posBit.v > 7) {
      posBit.v = 0;
      pos.v++;
    }
    return out;
  }
  getUB(pos, posBit, nBits) {
    /*let o = 0;
    for (let i = nBits - 1; i >= 0; i--) {
      if (posBit.v > 7) {
        posBit.v = 0;
        pos.v++;
      }
      let bit = this.getUI8(pos); pos.v--;
      let POB = 7 - posBit.v;
      bit = (bit & (1 << POB)) >> POB;
      o |= bit << i;
      posBit.v++;
    }
    if (posBit.v > 7) {
      posBit.v = 0;
      pos.v++;
    }
    //pos.v += Math.floor(nBits / 8);
    //posBit.v += nBits % 8;
    return o;*/
    let out = 0, PH = {v: pos.v}, byte = this.getUI8(PH, true);
    for (let i = 0; i < nBits; i++) {
      if (posBit.v > 7) {
        posBit.v = 0;
        pos.v++;
        PH.v = pos.v;
        byte = this.getUI8(PH, true);
      }
      let POB = 7 - posBit.v++;
      let bit = (byte >> POB) & 0x01;
      out |= bit << ((nBits - 1) - i);
    }
    if (posBit.v > 7) {
      posBit.v = 0;
      pos.v++;
    }
    return out;
  }
  getFB(pos, posBit, nBits) {
    /*let o = 0;
    for (let i = 0; i < nBits; i++) {
      if (posBit.v > 7) {
        posBit.v = 0;
        pos.v++;
      }
      let bit = this.getUI8(pos); pos.v--;
      bit = (bit & (1 << posBit.v)) >> posBit.v;
      var shift = i < 16 ? (bit * (1 / (1 << (16 - i)))) : (bit << i);
      if (i == nBits - 1) o += shift * -1;
      else o += shift;
      posBit.v++;
    }
    if (posBit.v > 7) {
      posBit.v = 0;
      pos.v++;
    }
    //pos.v += Math.floor(nBits / 8);
    //posBit.v += nBits % 8;
    return o;*/
    let out = 0, PH = {v: pos.v}, byte = this.getUI8(PH, true);
    for (let i = 0; i < nBits; i++) {
      if (posBit.v > 7) {
        posBit.v = 0;
        pos.v++;
        PH.v = pos.v;
        byte = this.getUI8(PH, true);
      }
      let POB = 7 - posBit.v++;
      let bit = (byte >> POB) & 0x01;
      let shift = i < 16 ? (bit * (1 / (1 << (16 - i)))) : bit << ((nBits - 1) - i);
      if (1 == nBits - 1) out += shift * -1;
      else out += shift;
    }
    if (posBit.v > 7) {
      posBit.v = 0;
      pos.v++;
    }
    return out;
  }

  getString(pos) {
    let size = /*this.getUI32(new Position(4))*/this.length, cont = true;
    let stringStart = pos.v, stringSize = 0;
    while (cont) {
      if (pos.v > size) {cont = false; pos.v = size; break;}
      if (this.getUI8(pos) === 0x00) {cont = false; pos.v--; break;}
    }
    stringSize = pos.v - stringStart;
    //return (new TextDecoder("utf-8").decode(this._file.subarray(stringStart, stringSize))).split("");
    return this._file.subarray(stringStart, stringSize);
  }

  getLanguageCode(pos) {
    return this.getUI8(pos);
    /*
        1 = Latin
        2 = Japanese
        3 = Korean
        4 = Simplified Chinese
        5 = Traditional Chinese
    */
  }

  getRGB(pos) {
    let o = new RGB();
    o.Red = this.getUI8(pos);
    o.Green = this.getUI8(pos);
    o.Blue = this.getUI8(pos);
    return o;
  }

  getRGBA(pos) {
    let o = new RGBA();
    o.Red = this.getUI8(pos);
    o.Green = this.getUI8(pos);
    o.Blue = this.getUI8(pos);
    o.Alpha = this.getUI8(pos);
    return o;
  }

  getARGB(pos) {
    let o = new RGBA();
    o.Alpha = this.getUI8(pos);
    o.Red = this.getUI8(pos);
    o.Green = this.getUI8(pos);
    o.Blue = this.getUI8(pos);
    return o;
  }

  getRectangle(pos) {
    let o = new Rectangle();
    o.Nbits = this.getUB(pos, this._PosBit, 5);
    o.Xmin = this.getSB(pos, this._PosBit, o.Nbits);
    o.Xmax = this.getSB(pos, this._PosBit, o.Nbits);
    o.Ymin = this.getSB(pos, this._PosBit, o.Nbits);
    o.Ymax = this.getSB(pos, this._PosBit, o.Nbits);
    return o;
  }

  getMATRIX(pos) {
    let o = new MATRIX();
    o.HasScale = this.getUB(pos, this._PosBit, 1);
    if (o.HasScale == 1) {
      o.NScaleBits = this.getUB(pos, this._PosBit, 5);
      o.ScaleX = this.getFB(pos, this._PosBit, o.NScaleBits);
      o.ScaleY = this.getFB(pos, this._PosBit, o.NScaleBits);
    }
    o.HasRotate = this.getUB(pos, this._PosBit, 1);
    if (o.HasRotate == 1) {
      o.NRotateBits = this.getUB(pos, this._PosBit, 5);
      o.RotateSkew0 = this.getFB(pos, this._PosBit, o.NRotateBits);
      o.RotateSkew1 = this.getFB(pos, this._PosBit, o.NRotateBits);
    }
    o.NTranslateBits = this.getUB(pos, this._PosBit, 5);
    o.TranslateX = this.getSB(pos, this._PosBit, o.NTranslateBits);
    o.TranslateY = this.getSB(pos, this._PosBit, o.NTranslateBits);
    return o;
  }

  getCXFORM(pos) {
    let o = new CXFORM();
    o.HasAddTerms = this.getUB(pos, this._PosBit, 1);
    o.HasMultTerms = this.getUB(pos, this._PosBit, 1);
    o.Nbits = this.getUB(pos, this._PosBit, 4);
    if (o.HasMultTerms == 1) {
      o.RedMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.GreenMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.BlueMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
    }
    if (o.HasAddTerms == 1) {
      o.RedAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.GreenAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.BlueAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
    }
    return o;
  }

  getCXFORMWITHALPHA(pos) {
    let o = new CXFORMWITHALPHA();
    o.HasAddTerms = this.getUB(pos, this._PosBit, 1);
    o.HasMultTerms = this.getUB(pos, this._PosBit, 1);
    o.Nbits = this.getUB(pos, this._PosBit, 4);
    if (o.HasMultTerms == 1) {
      o.RedMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.GreenMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.BlueMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.AlphaMultTerm = this.getSB(pos, this._PosBit, o.Nbits);
    }
    if (o.HasAddTerms == 1) {
      o.RedAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.GreenAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.BlueAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
      o.AlphaAddTerm = this.getSB(pos, this._PosBit, o.Nbits);
    }
    return o;
  }
}


function rebuildSWF(byteArray) {
  var stringArray = (new TextDecoder("utf-8").decode(byteArray.subarray(0, 3))).split("");
  if (stringArray[1] != "W" && stringArray[2] != "S") return console.log("Signature bytes are not correct");

  var size = (byteArray[7] << 24 | byteArray[6] << 16 | byteArray[5] << 8 | byteArray[4]);

  //var plain = new Uint8Array(size);
  var plain = new SWF(size);
  var opt = byteArray.subarray(0, 8);
  plain.set(opt, 0)
  if (stringArray[0] === "F")
    plain.set(byteArray.subarray(8), opt.length);
  else if (stringArray[0] === "C")
    plain.set((new Zlib.Inflate(byteArray.subarray(8))).decompress(), opt.length);
  else if (stringArray[0] === "Z")
    throw new Error("Unsupported compression type (LZMA)");
  else
    throw new Error("Unsupported compression type/Corrupted SWF file");

  if (plain.length !== size) throw new Error("Uncompressed length is not equal to the expected length");

  //console.log(plain);
  //console.log("Size: " + size);

  return plain;
}

function loadBinFile(url) {
  let oReq = new XMLHttpRequest();
  oReq.open("GET", url, true);
  oReq.responseType = "arraybuffer";

  var p = new Promise((resolve, reject)=>{

    oReq.onload = function (oEvent) {
      let arrayBuffer = oReq.response;
      if (arrayBuffer) {
        let byteArray = new Uint8Array(arrayBuffer);
        resolve(byteArray);
      }
    }
    oReq.onerror = (e) => {reject(e)};

  });

  oReq.send(null);
  return p;
}


/** The following Zlib creation function is an excerpt from zlib.js from imaya */
/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
var Zlib = (function() {
  var USE_TYPEDARRAY = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Uint32Array !== "undefined" && typeof DataView !== "undefined";
  var ZLIB_RAW_INFLATE_BUFFER_SIZE = 32768;

  var Util = {};
  Util.stringToByteArray = function(str) {
    var tmp = str.split("");
    var i;
    var il;
    for(i = 0, il = tmp.length;i < il;i++) {
      tmp[i] = (tmp[i].charCodeAt(0) & 255) >>> 0
    }
    return tmp
  }

  var Huffman = {};
  Huffman.buildHuffmanTable = function(lengths) {
    var listSize = lengths.length;
    var maxCodeLength = 0;
    var minCodeLength = Number.POSITIVE_INFINITY;
    var size;
    var table;
    var bitLength;
    var code;
    var skip;
    var reversed;
    var rtemp;
    var i;
    var il;
    var j;
    var value;
    for(i = 0, il = listSize;i < il;++i) {
      if(lengths[i] > maxCodeLength) {
        maxCodeLength = lengths[i]
      }
      if(lengths[i] < minCodeLength) {
        minCodeLength = lengths[i]
      }
    }
    size = 1 << maxCodeLength;
    table = new (USE_TYPEDARRAY ? Uint32Array : Array)(size);
    for(bitLength = 1, code = 0, skip = 2;bitLength <= maxCodeLength;) {
      for(i = 0;i < listSize;++i) {
        if(lengths[i] === bitLength) {
          for(reversed = 0, rtemp = code, j = 0;j < bitLength;++j) {
            reversed = reversed << 1 | rtemp & 1;
            rtemp >>= 1
          }
          value = bitLength << 16 | i;
          for(j = reversed;j < size;j += skip) {
            table[j] = value
          }
          ++code
        }
      }
      ++bitLength;
      code <<= 1;
      skip <<= 1
    }
    return[table, maxCodeLength, minCodeLength]
  }

  function Adler32(array) {
    if(typeof array === "string") {
      array = Util.stringToByteArray(array);
    }
    return Adler32.update(a, array);
  }
  Adler32.update = function(adler, array) {
    var s1 = adler & 65535;
    var s2 = adler >>> 16 & 65535;
    var len = array.length;
    var tlen;
    var i = 0;
    while(len > 0) {
      tlen = len > Adler32.OptimizationParameter ? Adler32.OptimizationParameter : len;
      len -= tlen;
      do {
        s1 += array[i++];
        s2 += s1
      }while(--tlen);
      s1 %= 65521;
      s2 %= 65521
    }
    return(s2 << 16 | s1) >>> 0
  };
  Adler32.OptimizationParameter = 1024

  var buildHuffmanTable = Huffman.buildHuffmanTable;
  function RawInflate(input, opt_params) {
    this.buffer;
    this.blocks = [];
    this.bufferSize = ZLIB_RAW_INFLATE_BUFFER_SIZE;
    this.totalpos = 0;
    this.ip = 0;
    this.bitsbuf = 0;
    this.bitsbuflen = 0;
    this.input = USE_TYPEDARRAY ? new Uint8Array(input) : input;
    this.output;
    this.op;
    this.bfinal = false;
    this.bufferType = RawInflate.BufferType.ADAPTIVE;
    this.resize = false;
    if (opt_params || !(opt_params = {})) {
      if(opt_params["index"]) {
        this.ip = opt_params["index"];
      }
      if(opt_params["bufferSize"]) {
        this.bufferSize = opt_params["bufferSize"];
      }
      if(opt_params["bufferType"]) {
        this.bufferType = opt_params["bufferType"];
      }
      if(opt_params["resize"]) {
        this.resize = opt_params["resize"];
      }
    }
    switch(this.bufferType) {
      case RawInflate.BufferType.BLOCK:
        this.op = RawInflate.MaxBackwardLength;
        this.output = new (USE_TYPEDARRAY ? Uint8Array : Array)(RawInflate.MaxBackwardLength + this.bufferSize + RawInflate.MaxCopyLength);
        break;
      case RawInflate.BufferType.ADAPTIVE:
        this.op = 0;
        this.output = new (USE_TYPEDARRAY ? Uint8Array : Array)(this.bufferSize);
        this.expandBuffer = this.expandBufferAdaptive;
        this.concatBuffer = this.concatBufferDynamic;
        this.decodeHuffman = this.decodeHuffmanAdaptive;
        break;
      default:
        throw new Error("invalid inflate mode");
    }
  };
  RawInflate.BufferType = {BLOCK:0, ADAPTIVE:1};
    RawInflate.prototype.decompress = function() {
    while(!this.bfinal) {
      this.parseBlock()
    }
    return this.concatBuffer()
  };
  RawInflate.MaxBackwardLength = 32768;
  RawInflate.MaxCopyLength = 258;
  RawInflate.Order = function(table) {
    return USE_TYPEDARRAY ? new Uint16Array(table) : table
  }([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  RawInflate.LengthCodeTable = function(table) {
    return USE_TYPEDARRAY ? new Uint16Array(table) : table
  }([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 258, 258]);
  RawInflate.LengthExtraTable = function(table) {
    return USE_TYPEDARRAY ? new Uint8Array(table) : table
  }([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0]);
  RawInflate.DistCodeTable = function(table) {
    return USE_TYPEDARRAY ? new Uint16Array(table) : table
  }([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]);
  RawInflate.DistExtraTable = function(table) {
    return USE_TYPEDARRAY ? new Uint8Array(table) : table
  }([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
  RawInflate.FixedLiteralLengthTable = function(table) {
    return table
  }(function() {
    var lengths = new (USE_TYPEDARRAY ? Uint8Array : Array)(288);
    var i, il;
    for(i = 0, il = lengths.length;i < il;++i) {
      lengths[i] = i <= 143 ? 8 : i <= 255 ? 9 : i <= 279 ? 7 : 8
    }
    return buildHuffmanTable(lengths)
  }());
  RawInflate.FixedDistanceTable = function(table) {
    return table
  }(function() {
    var lengths = new (USE_TYPEDARRAY ? Uint8Array : Array)(30);
    var i, il;
    for(i = 0, il = lengths.length;i < il;++i) {
      lengths[i] = 5
    }
    return buildHuffmanTable(lengths)
  }());
  RawInflate.prototype.parseBlock = function() {
    var hdr = this.readBits(3);
    if(hdr & 1) {
      this.bfinal = true
    }
    hdr >>>= 1;
    switch(hdr) {
      case 0:
        this.parseUncompressedBlock();
        break;
      case 1:
        this.parseFixedHuffmanBlock();
        break;
      case 2:
        this.parseDynamicHuffmanBlock();
        break;
      default:
        throw new Error("unknown BTYPE: " + hdr);
    }
  };
  RawInflate.prototype.readBits = function(length) {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;
    var inputLength = input.length;
    var octet;
    while(bitsbuflen < length) {
      if(ip >= inputLength) {
        throw new Error("input buffer is broken");
      }
      bitsbuf |= input[ip++] << bitsbuflen;
      bitsbuflen += 8
    }
    octet = bitsbuf & (1 << length) - 1;
    bitsbuf >>>= length;
    bitsbuflen -= length;
    this.bitsbuf = bitsbuf;
    this.bitsbuflen = bitsbuflen;
    this.ip = ip;
    return octet
  };
  RawInflate.prototype.readCodeByTable = function(table) {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;
    var inputLength = input.length;
    var codeTable = table[0];
    var maxCodeLength = table[1];
    var codeWithLength;
    var codeLength;
    while(bitsbuflen < maxCodeLength) {
      if(ip >= inputLength) {
        break
      }
      bitsbuf |= input[ip++] << bitsbuflen;
      bitsbuflen += 8
    }
    codeWithLength = codeTable[bitsbuf & (1 << maxCodeLength) - 1];
    codeLength = codeWithLength >>> 16;
    if(codeLength > bitsbuflen) {
      throw new Error("invalid code length: " + codeLength);
    }
    this.bitsbuf = bitsbuf >> codeLength;
    this.bitsbuflen = bitsbuflen - codeLength;
    this.ip = ip;
    return codeWithLength & 65535
  };
  RawInflate.prototype.parseUncompressedBlock = function() {
    var input = this.input;
    var ip = this.ip;
    var output = this.output;
    var op = this.op;
    var inputLength = input.length;
    var len;
    var nlen;
    var olength = output.length;
    var preCopy;
    this.bitsbuf = 0;
    this.bitsbuflen = 0;
    if(ip + 1 >= inputLength) {
      throw new Error("invalid uncompressed block header: LEN");
    }
    len = input[ip++] | input[ip++] << 8;
    if(ip + 1 >= inputLength) {
      throw new Error("invalid uncompressed block header: NLEN");
    }
    nlen = input[ip++] | input[ip++] << 8;
    if(len === ~nlen) {
      throw new Error("invalid uncompressed block header: length verify");
    }
    if(ip + len > input.length) {
      throw new Error("input buffer is broken");
    }
    switch(this.bufferType) {
      case RawInflate.BufferType.BLOCK:
        while(op + len > output.length) {
          preCopy = olength - op;
          len -= preCopy;
          if(USE_TYPEDARRAY) {
            output.set(input.subarray(ip, ip + preCopy), op);
            op += preCopy;
            ip += preCopy
          }else {
            while(preCopy--) {
              output[op++] = input[ip++]
            }
          }
          this.op = op;
          output = this.expandBuffer();
          op = this.op
        }
        break;
      case RawInflate.BufferType.ADAPTIVE:
        while(op + len > output.length) {
          output = this.expandBuffer({fixRatio:2})
        }
        break;
      default:
        throw new Error("invalid inflate mode");
    }
    if(USE_TYPEDARRAY) {
      output.set(input.subarray(ip, ip + len), op);
      op += len;
      ip += len
    }else {
      while(len--) {
        output[op++] = input[ip++]
      }
    }
    this.ip = ip;
    this.op = op;
    this.output = output
  };
  RawInflate.prototype.parseFixedHuffmanBlock = function() {
    this.decodeHuffman(RawInflate.FixedLiteralLengthTable, RawInflate.FixedDistanceTable)
  };
  RawInflate.prototype.parseDynamicHuffmanBlock = function() {
    var hlit = this.readBits(5) + 257;
    var hdist = this.readBits(5) + 1;
    var hclen = this.readBits(4) + 4;
    var codeLengths = new (USE_TYPEDARRAY ? Uint8Array : Array)(RawInflate.Order.length);
    var codeLengthsTable;
    var litlenTable;
    var distTable;
    var lengthTable;
    var code;
    var prev;
    var repeat;
    var i;
    var il;
    for(i = 0;i < hclen;++i) {
      codeLengths[RawInflate.Order[i]] = this.readBits(3)
    }
    if(!USE_TYPEDARRAY) {
      for(i = hclen, hclen = codeLengths.length;i < hclen;++i) {
        codeLengths[RawInflate.Order[i]] = 0
      }
    }
    codeLengthsTable = buildHuffmanTable(codeLengths);
    lengthTable = new (USE_TYPEDARRAY ? Uint8Array : Array)(hlit + hdist);
    for(i = 0, il = hlit + hdist;i < il;) {
      code = this.readCodeByTable(codeLengthsTable);
      switch(code) {
        case 16:
          repeat = 3 + this.readBits(2);
          while(repeat--) {
            lengthTable[i++] = prev
          }
          break;
        case 17:
          repeat = 3 + this.readBits(3);
          while(repeat--) {
            lengthTable[i++] = 0
          }
          prev = 0;
          break;
        case 18:
          repeat = 11 + this.readBits(7);
          while(repeat--) {
            lengthTable[i++] = 0
          }
          prev = 0;
          break;
        default:
          lengthTable[i++] = code;
          prev = code;
          break
      }
    }
    litlenTable = USE_TYPEDARRAY ? buildHuffmanTable(lengthTable.subarray(0, hlit)) : buildHuffmanTable(lengthTable.slice(0, hlit));
    distTable = USE_TYPEDARRAY ? buildHuffmanTable(lengthTable.subarray(hlit)) : buildHuffmanTable(lengthTable.slice(hlit));
    this.decodeHuffman(litlenTable, distTable)
  };
  RawInflate.prototype.decodeHuffman = function(litlen, dist) {
    var output = this.output;
    var op = this.op;
    this.currentLitlenTable = litlen;
    var olength = output.length - RawInflate.MaxCopyLength;
    var code;
    var ti;
    var codeDist;
    var codeLength;
    while((code = this.readCodeByTable(litlen)) !== 256) {
      if(code < 256) {
        if(op >= olength) {
          this.op = op;
          output = this.expandBuffer();
          op = this.op
        }
        output[op++] = code;
        continue
      }
      ti = code - 257;
      codeLength = RawInflate.LengthCodeTable[ti];
      if(RawInflate.LengthExtraTable[ti] > 0) {
        codeLength += this.readBits(RawInflate.LengthExtraTable[ti])
      }
      code = this.readCodeByTable(dist);
      codeDist = RawInflate.DistCodeTable[code];
      if(RawInflate.DistExtraTable[code] > 0) {
        codeDist += this.readBits(RawInflate.DistExtraTable[code])
      }
      if(op >= olength) {
        this.op = op;
        output = this.expandBuffer();
        op = this.op
      }
      while(codeLength--) {
        output[op] = output[op++ - codeDist]
      }
    }
    while(this.bitsbuflen >= 8) {
      this.bitsbuflen -= 8;
      this.ip--
    }
    this.op = op
  };
  RawInflate.prototype.decodeHuffmanAdaptive = function(litlen, dist) {
    var output = this.output;
    var op = this.op;
    this.currentLitlenTable = litlen;
    var olength = output.length;
    var code;
    var ti;
    var codeDist;
    var codeLength;
    while((code = this.readCodeByTable(litlen)) !== 256) {
      if(code < 256) {
        if(op >= olength) {
          output = this.expandBuffer();
          olength = output.length
        }
        output[op++] = code;
        continue
      }
      ti = code - 257;
      codeLength = RawInflate.LengthCodeTable[ti];
      if(RawInflate.LengthExtraTable[ti] > 0) {
        codeLength += this.readBits(RawInflate.LengthExtraTable[ti])
      }
      code = this.readCodeByTable(dist);
      codeDist = RawInflate.DistCodeTable[code];
      if(RawInflate.DistExtraTable[code] > 0) {
        codeDist += this.readBits(RawInflate.DistExtraTable[code])
      }
      if(op + codeLength > olength) {
        output = this.expandBuffer();
        olength = output.length
      }
      while(codeLength--) {
        output[op] = output[op++ - codeDist]
      }
    }
    while(this.bitsbuflen >= 8) {
      this.bitsbuflen -= 8;
      this.ip--
    }
    this.op = op
  };
  RawInflate.prototype.expandBuffer = function(opt_param) {
    var buffer = new (USE_TYPEDARRAY ? Uint8Array : Array)(this.op - RawInflate.MaxBackwardLength);
    var backward = this.op - RawInflate.MaxBackwardLength;
    var i;
    var il;
    var output = this.output;
    if(USE_TYPEDARRAY) {
      buffer.set(output.subarray(RawInflate.MaxBackwardLength, buffer.length))
    }else {
      for(i = 0, il = buffer.length;i < il;++i) {
        buffer[i] = output[i + RawInflate.MaxBackwardLength]
      }
    }
    this.blocks.push(buffer);
    this.totalpos += buffer.length;
    if(USE_TYPEDARRAY) {
      output.set(output.subarray(backward, backward + RawInflate.MaxBackwardLength))
    }else {
      for(i = 0;i < RawInflate.MaxBackwardLength;++i) {
        output[i] = output[backward + i]
      }
    }
    this.op = RawInflate.MaxBackwardLength;
    return output
  };
  RawInflate.prototype.expandBufferAdaptive = function(opt_param) {
    var buffer;
    var ratio = this.input.length / this.ip + 1 | 0;
    var maxHuffCode;
    var newSize;
    var maxInflateSize;
    var input = this.input;
    var output = this.output;
    if(opt_param) {
      if(typeof opt_param.fixRatio === "number") {
        ratio = opt_param.fixRatio
      }
      if(typeof opt_param.addRatio === "number") {
        ratio += opt_param.addRatio
      }
    }
    if(ratio < 2) {
      maxHuffCode = (input.length - this.ip) / this.currentLitlenTable[2];
      maxInflateSize = maxHuffCode / 2 * 258 | 0;
      newSize = maxInflateSize < output.length ? output.length + maxInflateSize : output.length << 1
    }else {
      newSize = output.length * ratio
    }
    if(USE_TYPEDARRAY) {
      buffer = new Uint8Array(newSize);
      buffer.set(output)
    }else {
      buffer = output
    }
    this.output = buffer;
    return this.output
  };
  RawInflate.prototype.concatBuffer = function() {
    var pos = 0;
    var limit = this.totalpos + (this.op - RawInflate.MaxBackwardLength);
    var output = this.output;
    var blocks = this.blocks;
    var block;
    var buffer = new (USE_TYPEDARRAY ? Uint8Array : Array)(limit);
    var i;
    var il;
    var j;
    var jl;
    if(blocks.length === 0) {
      return USE_TYPEDARRAY ? this.output.subarray(RawInflate.MaxBackwardLength, this.op) : this.output.slice(RawInflate.MaxBackwardLength, this.op)
    }
    for(i = 0, il = blocks.length;i < il;++i) {
      block = blocks[i];
      for(j = 0, jl = block.length;j < jl;++j) {
        buffer[pos++] = block[j]
      }
    }
    for(i = RawInflate.MaxBackwardLength, il = this.op;i < il;++i) {
      buffer[pos++] = output[i]
    }
    this.blocks = [];
    this.buffer = buffer;
    return this.buffer
  };
  RawInflate.prototype.concatBufferDynamic = function() {
    var buffer;
    var op = this.op;
    if(USE_TYPEDARRAY) {
      if(this.resize) {
        buffer = new Uint8Array(op);
        buffer.set(this.output.subarray(0, op))
      }else {
        buffer = this.output.subarray(0, op)
      }
    }else {
      if(this.output.length > op) {
        this.output.length = op
      }
      buffer = this.output
    }
    this.buffer = buffer;
    return this.buffer
  }

  CompressionMethod = {DEFLATE:8, RESERVED:15};

  function Inflate(input, opt_params) {
    var bufferSize;
    var bufferType;
    var cmf;
    var flg;
    this.input = input;
    this.ip = 0;
    this.rawinflate;
    this.verify;
    if(opt_params || !(opt_params = {})) {
      if (opt_params["index"]) {
        this.ip = opt_params["index"];
      }
      if (opt_params["verify"]) {
        this.verify = opt_params["verify"];
      }
    }
    cmf = input[this.ip++];
    flg = input[this.ip++];
    switch(cmf & 15) {
      case CompressionMethod.DEFLATE:
        this.method = CompressionMethod.DEFLATE;
        break;
      default:
        throw new Error("unsupported compression method");
    }
    if (((cmf << 8) + flg) %31 !== 0) {
      throw new Error("invalid fcheck flag:" + ((cmf << 8) + flg) % 31);
    }
    if (flg & 32) {
      throw new Error("fdict flag is not supported");
    }
    this.rawinflate = new RawInflate(input, {"index":this.ip, "bufferSize":opt_params["bufferSize"], "bufferType":opt_params["bufferType"], resize:opt_params["resize"]});
  }
  Inflate.BufferType = RawInflate.BufferType;
  Inflate.prototype.decompress = function() {
    var input = this.input;
    var buffer;
    var adler32;
    buffer = this.rawinflate.decompress();
    this.ip = this.rawinflate.ip;
    if (this.verify) {
      adler32 = (input[this.ip++] << 24 | input[this.ip++] << 16 | input[this.ip++] << 8 | input[this.ip++]) >>> 0;
      if (adler32 !== Adler32(buffer)) {
        throw new Error("invalid adler-32 checksum");
      }
    }
    return buffer;
  }


  return {
    Inflate,
    RawInflate,
    Adler32,
    Huffman,
    Util
  };
})();


/** The following ieee754 creation function is an excerpt from ieee754 from Feross Aboukhadijeh */
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
var ieee754 = (function() {
  function read(buffer, offset, isLE, mLen, nBytes) {
    let e, m
    const eLen = (nBytes * 8) - mLen - 1
    const eMax = (1 << eLen) - 1
    const eBias = eMax >> 1
    let nBits = -7
    let i = isLE ? (nBytes - 1) : 0
    const d = isLE ? -1 : 1
    let s = buffer[offset + i]

    i += d

    e = s & ((1 << (-nBits)) - 1)
    s >>= (-nBits)
    nBits += eLen
    while (nBits > 0) {
      e = (e * 256) + buffer[offset + i]
      i += d
      nBits -= 8
    }

    m = e & ((1 << (-nBits)) - 1)
    e >>= (-nBits)
    nBits += mLen
    while (nBits > 0) {
      m = (m * 256) + buffer[offset + i]
      i += d
      nBits -= 8
    }

    if (e === 0) {
      e = 1 - eBias
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity)
    } else {
      m = m + Math.pow(2, mLen)
      e = e - eBias
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  }

  function write(buffer, value, offset, isLE, mLen, nBytes) {
    let e, m, c
    let eLen = (nBytes * 8) - mLen - 1
    const eMax = (1 << eLen) - 1
    const eBias = eMax >> 1
    const rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
    let i = isLE ? 0 : (nBytes - 1)
    const d = isLE ? 1 : -1
    const s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

    value = Math.abs(value)

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0
      e = eMax
    } else {
      e = Math.floor(Math.log(value) / Math.LN2)
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--
        c *= 2
      }
      if (e + eBias >= 1) {
        value += rt / c
      } else {
        value += rt * Math.pow(2, 1 - eBias)
      }
      if (value * c >= 2) {
        e++
        c /= 2
      }

      if (e + eBias >= eMax) {
        m = 0
        e = eMax
      } else if (e + eBias >= 1) {
        m = ((value * c) - 1) * Math.pow(2, mLen)
        e = e + eBias
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
        e = 0
      }
    }

    while (mLen >= 8) {
      buffer[offset + i] = m & 0xff
      i += d
      m /= 256
      mLen -= 8
    }

    e = (e << mLen) | m
    eLen += mLen
    while (eLen > 0) {
      buffer[offset + i] = e & 0xff
      i += d
      e /= 256
      eLen -= 8
    }

    buffer[offset + i - d] |= s * 128
  }

  return {
    read,
    write
  };
})();