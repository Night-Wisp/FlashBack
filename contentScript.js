class WorkerApp {
  _worker = null;
  _id = -1;
  get id() {return _id;}

  constructor(url, ident = -1) {
    this._worker = new Worker(chrome.runtime.getURL('workerVM.js'));
    this._worker.onmessage = this._onMessage;
    this._id = ident;
    this.sendMessage("SWF_URL", url);
  }

  _onMessage(event) {
    switch (event.data.type) {
      case "con.log":
        console.log("Worker " + this._id + ":\n", ...event.data.data);
        break;
      case "con.war":
        console.warn("Worker " + this._id + ":\n", ...event.data.data);
        break;
      case "con.err":
        console.error("Worker " + this._id + ":\n", ...event.data.data);
        break;
      default:
        break;
    }
  }
  sendMessage(type, data) {
    this._worker.postMessage({type: type, data: data});
  }
}

var FlashBack = (function() {
  var WorkerApps = [];

  function parseSite() {
    console.log("Parsing site for .swf files");
    // get all <embed> elements
    let flashApps = document.getElementsByTagName("embed");
    // if there are no <embed> elements, nothing is left to do
    if (flashApps.length == 0) return;
    // remove all <embed> elements whose src attribute doesn't end with .swf
    let FA = [];
    for (let i = 0; i < flashApps.length; i++) {
      let split = flashApps[i].src.split(".");
      if (split[split.length - 1].substr(0, 3) == "swf") FA[FA.length] = flashApps[i];
    }

    if (FA.length == 0) return;
    console.log(FA.length + " flash file(s) found");

    for (let i = 0; i < FA.length; i++) {
      let cur = FA[i];

      let workVM = new WorkerApp(cur.src, i);
      

      WorkerApps.push(workVM);

      /*loadBinFile(cur.src).then((byteArray) => {
        //console.log(byteArray);
        rebuildSWF(byteArray);
      }).catch((e) => {
        console.log("Error loading .swf file", e);
      });*/
    }
    return true;
  }

  /*function rebuildSWF(byteArray) {
    var stringArray = (new TextDecoder("utf-8").decode(byteArray.subarray(0, 3))).split("");
    if (stringArray[1] != "W" && stringArray[2] != "S") return console.log("Signature bytes are not correct");

    var size = (byteArray[7] << 24 | byteArray[6] << 16 | byteArray[5] << 8 | byteArray[4]);

    var plain = new Uint8Array(size);
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

    console.log(plain);
    console.log("Size: " + size);
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
  }*/

  return parseSite();
})();


/*var Zlib = (function() {
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
})();*/