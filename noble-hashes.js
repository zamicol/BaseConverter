(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@noble/hashes/crypto')) :
    typeof define === 'function' && define.amd ? define(['exports', '@noble/hashes/crypto'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.nobleHashes = {}, global.crypto));
})(this, (function (exports, crypto) { 'use strict';

    /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    // Cast array to different type
    const u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
    // Cast array to view
    const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    // The rotate right (circular right shift) operation for uint32
    const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
    const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
    // There is almost no big endian hardware, but js typed arrays uses platform specific endianess.
    // So, just to be sure not to corrupt anything.
    if (!isLE)
        throw new Error('Non little-endian hardware is not supported');
    const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
    /**
     * @example bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
     */
    function bytesToHex(uint8a) {
        // pre-caching improves the speed 6x
        let hex = '';
        for (let i = 0; i < uint8a.length; i++) {
            hex += hexes[uint8a[i]];
        }
        return hex;
    }
    // Currently avoid insertion of polyfills with packers (browserify/webpack/etc)
    // But setTimeout is pretty slow, maybe worth to investigate howto do minimal polyfill here
    const nextTick = (() => {
        const nodeRequire = typeof module !== 'undefined' &&
            typeof module.require === 'function' &&
            module.require.bind(module);
        try {
            if (nodeRequire) {
                const { setImmediate } = nodeRequire('timers');
                return () => new Promise((resolve) => setImmediate(resolve));
            }
        }
        catch (e) { }
        return () => new Promise((resolve) => setTimeout(resolve, 0));
    })();
    // Returns control to thread each 'tick' ms to avoid blocking
    async function asyncLoop(iters, tick, cb) {
        let ts = Date.now();
        for (let i = 0; i < iters; i++) {
            cb(i);
            // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
            const diff = Date.now() - ts;
            if (diff >= 0 && diff < tick)
                continue;
            await nextTick();
            ts += diff;
        }
    }
    function utf8ToBytes(str) {
        if (typeof str !== 'string') {
            throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
        }
        return new TextEncoder().encode(str);
    }
    function toBytes(data) {
        if (typeof data === 'string')
            data = utf8ToBytes(data);
        if (!(data instanceof Uint8Array))
            throw new TypeError(`Expected input type is Uint8Array (got ${typeof data})`);
        return data;
    }
    function assertNumber(n) {
        if (!Number.isSafeInteger(n) || n < 0)
            throw new Error(`Wrong positive integer: ${n}`);
    }
    function assertBytes(bytes, ...lengths) {
        if (bytes instanceof Uint8Array && (!lengths.length || lengths.includes(bytes.length))) {
            return;
        }
        throw new TypeError(`Expected ${lengths} bytes, not ${typeof bytes} with length=${bytes.length}`);
    }
    function assertHash(hash) {
        if (typeof hash !== 'function' || typeof hash.create !== 'function')
            throw new Error('Hash should be wrapped by utils.wrapConstructor');
        assertNumber(hash.outputLen);
        assertNumber(hash.blockLen);
    }
    // For runtime check if class implements interface
    class Hash {
        // Safe version that clones internal state
        clone() {
            return this._cloneInto();
        }
    }
    // Check if object doens't have custom constructor (like Uint8Array/Array)
    const isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
    function checkOpts(def, _opts) {
        if (_opts !== undefined && (typeof _opts !== 'object' || !isPlainObject(_opts)))
            throw new TypeError('Options should be object or undefined');
        const opts = Object.assign(def, _opts);
        return opts;
    }
    function wrapConstructor(hashConstructor) {
        const hashC = (message) => hashConstructor().update(toBytes(message)).digest();
        const tmp = hashConstructor();
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = () => hashConstructor();
        return hashC;
    }
    function wrapConstructorWithOpts(hashCons) {
        const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
        const tmp = hashCons({});
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = (opts) => hashCons(opts);
        return hashC;
    }
    /**
     * Secure PRNG
     */
    function randomBytes(bytesLength = 32) {
        if (crypto.crypto.web) {
            return crypto.crypto.web.getRandomValues(new Uint8Array(bytesLength));
        }
        else if (crypto.crypto.node) {
            return new Uint8Array(crypto.crypto.node.randomBytes(bytesLength).buffer);
        }
        else {
            throw new Error("The environment doesn't have randomBytes function");
        }
    }

    // prettier-ignore
    const SIGMA$1 = new Uint8Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
        11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
        7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
        9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
        2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
        12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
        13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
        6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
        10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
        // For BLAKE2b, the two extra permutations for rounds 10 and 11 are SIGMA[10..11] = SIGMA[0..1].
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    ]);
    class BLAKE2 extends Hash {
        constructor(blockLen, outputLen, opts = {}, keyLen, saltLen, persLen) {
            super();
            this.blockLen = blockLen;
            this.outputLen = outputLen;
            this.length = 0;
            this.pos = 0;
            this.finished = false;
            this.destroyed = false;
            assertNumber(blockLen);
            assertNumber(outputLen);
            assertNumber(keyLen);
            if (outputLen < 0 || outputLen > keyLen)
                throw new Error('Blake2: outputLen bigger than keyLen');
            if (opts.key !== undefined && (opts.key.length < 1 || opts.key.length > keyLen))
                throw new Error(`Key should be up 1..${keyLen} byte long or undefined`);
            if (opts.salt !== undefined && opts.salt.length !== saltLen)
                throw new Error(`Salt should be ${saltLen} byte long or undefined`);
            if (opts.personalization !== undefined && opts.personalization.length !== persLen)
                throw new Error(`Personalization should be ${persLen} byte long or undefined`);
            this.buffer32 = u32((this.buffer = new Uint8Array(blockLen)));
        }
        update(data) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            // Main difference with other hashes: there is flag for last block,
            // so we cannot process current block before we know that there
            // is the next one. This significantly complicates logic and reduces ability
            // to do zero-copy processing
            const { finished, blockLen, buffer, buffer32 } = this;
            if (finished)
                throw new Error('digest() was already called');
            data = toBytes(data);
            const len = data.length;
            for (let pos = 0; pos < len;) {
                // If buffer is full and we still have input (don't process last block, same as blake2s)
                if (this.pos === blockLen) {
                    this.compress(buffer32, 0, false);
                    this.pos = 0;
                }
                const take = Math.min(blockLen - this.pos, len - pos);
                const dataOffset = data.byteOffset + pos;
                // full block && aligned to 4 bytes && not last in input
                if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
                    const data32 = new Uint32Array(data.buffer, dataOffset, Math.floor((len - pos) / 4));
                    for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
                        this.length += blockLen;
                        this.compress(data32, pos32, false);
                    }
                    continue;
                }
                buffer.set(data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                this.length += take;
                pos += take;
            }
            return this;
        }
        digestInto(out) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            if (!(out instanceof Uint8Array) || out.length < this.outputLen)
                throw new Error('_Blake2: Invalid output buffer');
            const { finished, pos, buffer32 } = this;
            if (finished)
                throw new Error('digest() was already called');
            this.finished = true;
            // Padding
            this.buffer.subarray(pos).fill(0);
            this.compress(buffer32, 0, true);
            const out32 = u32(out);
            this.get().forEach((v, i) => (out32[i] = v));
        }
        digest() {
            const { buffer, outputLen } = this;
            this.digestInto(buffer);
            const res = buffer.slice(0, outputLen);
            this.destroy();
            return res;
        }
        _cloneInto(to) {
            const { buffer, length, finished, destroyed, outputLen, pos } = this;
            to || (to = new this.constructor({ dkLen: outputLen }));
            to.set(...this.get());
            to.length = length;
            to.finished = finished;
            to.destroyed = destroyed;
            to.outputLen = outputLen;
            to.buffer.set(buffer);
            to.pos = pos;
            return to;
        }
    }

    const U32_MASK64 = BigInt(2 ** 32 - 1);
    const _32n = BigInt(32);
    function fromBig(n, le = false) {
        if (le)
            return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
        return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
    }
    function split(lst, le = false) {
        let Ah = new Uint32Array(lst.length);
        let Al = new Uint32Array(lst.length);
        for (let i = 0; i < lst.length; i++) {
            const { h, l } = fromBig(lst[i], le);
            [Ah[i], Al[i]] = [h, l];
        }
        return [Ah, Al];
    }
    // for Shift in [0, 32)
    const shrSH = (h, l, s) => h >>> s;
    const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
    // Right rotate for Shift in [1, 32)
    const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
    const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
    // Right rotate for Shift in (32, 64), NOTE: 32 is special case.
    const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
    const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
    // Right rotate for shift===32 (just swaps l&h)
    const rotr32H = (h, l) => l;
    const rotr32L = (h, l) => h;
    // Left rotate for Shift in [1, 32)
    const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
    const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
    // Left rotate for Shift in (32, 64), NOTE: 32 is special case.
    const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
    const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
    // JS uses 32-bit signed integers for bitwise operations which means we cannot
    // simple take carry out of low bit sum by shift, we need to use division.
    function add(Ah, Al, Bh, Bl) {
        const l = (Al >>> 0) + (Bl >>> 0);
        return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
    }
    // Addition with more than 2 elements
    const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
    const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
    const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
    const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
    const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
    const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;

    // Same as SHA-512 but LE
    // prettier-ignore
    const IV$2 = new Uint32Array([
        0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
        0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19
    ]);
    // Temporary buffer
    const BUF$1 = new Uint32Array(32);
    // Mixing function G splitted in two halfs
    function G1$1(a, b, c, d, msg, x) {
        // NOTE: V is LE here
        const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
        let Al = BUF$1[2 * a], Ah = BUF$1[2 * a + 1]; // prettier-ignore
        let Bl = BUF$1[2 * b], Bh = BUF$1[2 * b + 1]; // prettier-ignore
        let Cl = BUF$1[2 * c], Ch = BUF$1[2 * c + 1]; // prettier-ignore
        let Dl = BUF$1[2 * d], Dh = BUF$1[2 * d + 1]; // prettier-ignore
        // v[a] = (v[a] + v[b] + x) | 0;
        let ll = add3L(Al, Bl, Xl);
        Ah = add3H(ll, Ah, Bh, Xh);
        Al = ll | 0;
        // v[d] = rotr(v[d] ^ v[a], 32)
        ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
        ({ Dh, Dl } = { Dh: rotr32H(Dh, Dl), Dl: rotr32L(Dh) });
        // v[c] = (v[c] + v[d]) | 0;
        ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
        // v[b] = rotr(v[b] ^ v[c], 24)
        ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
        ({ Bh, Bl } = { Bh: rotrSH(Bh, Bl, 24), Bl: rotrSL(Bh, Bl, 24) });
        (BUF$1[2 * a] = Al), (BUF$1[2 * a + 1] = Ah);
        (BUF$1[2 * b] = Bl), (BUF$1[2 * b + 1] = Bh);
        (BUF$1[2 * c] = Cl), (BUF$1[2 * c + 1] = Ch);
        (BUF$1[2 * d] = Dl), (BUF$1[2 * d + 1] = Dh);
    }
    function G2$1(a, b, c, d, msg, x) {
        // NOTE: V is LE here
        const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
        let Al = BUF$1[2 * a], Ah = BUF$1[2 * a + 1]; // prettier-ignore
        let Bl = BUF$1[2 * b], Bh = BUF$1[2 * b + 1]; // prettier-ignore
        let Cl = BUF$1[2 * c], Ch = BUF$1[2 * c + 1]; // prettier-ignore
        let Dl = BUF$1[2 * d], Dh = BUF$1[2 * d + 1]; // prettier-ignore
        // v[a] = (v[a] + v[b] + x) | 0;
        let ll = add3L(Al, Bl, Xl);
        Ah = add3H(ll, Ah, Bh, Xh);
        Al = ll | 0;
        // v[d] = rotr(v[d] ^ v[a], 16)
        ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
        ({ Dh, Dl } = { Dh: rotrSH(Dh, Dl, 16), Dl: rotrSL(Dh, Dl, 16) });
        // v[c] = (v[c] + v[d]) | 0;
        ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
        // v[b] = rotr(v[b] ^ v[c], 63)
        ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
        ({ Bh, Bl } = { Bh: rotrBH(Bh, Bl, 63), Bl: rotrBL(Bh, Bl, 63) });
        (BUF$1[2 * a] = Al), (BUF$1[2 * a + 1] = Ah);
        (BUF$1[2 * b] = Bl), (BUF$1[2 * b + 1] = Bh);
        (BUF$1[2 * c] = Cl), (BUF$1[2 * c + 1] = Ch);
        (BUF$1[2 * d] = Dl), (BUF$1[2 * d + 1] = Dh);
    }
    class BLAKE2b extends BLAKE2 {
        constructor(opts = {}) {
            super(128, opts.dkLen === undefined ? 64 : opts.dkLen, opts, 64, 16, 16);
            // Same as SHA-512, but LE
            this.v0l = IV$2[0] | 0;
            this.v0h = IV$2[1] | 0;
            this.v1l = IV$2[2] | 0;
            this.v1h = IV$2[3] | 0;
            this.v2l = IV$2[4] | 0;
            this.v2h = IV$2[5] | 0;
            this.v3l = IV$2[6] | 0;
            this.v3h = IV$2[7] | 0;
            this.v4l = IV$2[8] | 0;
            this.v4h = IV$2[9] | 0;
            this.v5l = IV$2[10] | 0;
            this.v5h = IV$2[11] | 0;
            this.v6l = IV$2[12] | 0;
            this.v6h = IV$2[13] | 0;
            this.v7l = IV$2[14] | 0;
            this.v7h = IV$2[15] | 0;
            const keyLength = opts.key ? opts.key.length : 0;
            this.v0l ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
            if (opts.salt) {
                const salt = u32(toBytes(opts.salt));
                this.v4l ^= salt[0];
                this.v4h ^= salt[1];
                this.v5l ^= salt[2];
                this.v5h ^= salt[3];
            }
            if (opts.personalization) {
                const pers = u32(toBytes(opts.personalization));
                this.v6l ^= pers[0];
                this.v6h ^= pers[1];
                this.v7l ^= pers[2];
                this.v7h ^= pers[3];
            }
            if (opts.key) {
                // Pad to blockLen and update
                const tmp = new Uint8Array(this.blockLen);
                tmp.set(toBytes(opts.key));
                this.update(tmp);
            }
        }
        // prettier-ignore
        get() {
            let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
            return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
        }
        // prettier-ignore
        set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
            this.v0l = v0l | 0;
            this.v0h = v0h | 0;
            this.v1l = v1l | 0;
            this.v1h = v1h | 0;
            this.v2l = v2l | 0;
            this.v2h = v2h | 0;
            this.v3l = v3l | 0;
            this.v3h = v3h | 0;
            this.v4l = v4l | 0;
            this.v4h = v4h | 0;
            this.v5l = v5l | 0;
            this.v5h = v5h | 0;
            this.v6l = v6l | 0;
            this.v6h = v6h | 0;
            this.v7l = v7l | 0;
            this.v7h = v7h | 0;
        }
        compress(msg, offset, isLast) {
            this.get().forEach((v, i) => (BUF$1[i] = v)); // First half from state.
            BUF$1.set(IV$2, 16); // Second half from IV.
            let { h, l } = fromBig(BigInt(this.length));
            BUF$1[24] = IV$2[8] ^ l; // Low word of the offset.
            BUF$1[25] = IV$2[9] ^ h; // High word.
            // Invert all bits for last block
            if (isLast) {
                BUF$1[28] = ~BUF$1[28];
                BUF$1[29] = ~BUF$1[29];
            }
            let j = 0;
            const s = SIGMA$1;
            for (let i = 0; i < 12; i++) {
                G1$1(0, 4, 8, 12, msg, offset + 2 * s[j++]);
                G2$1(0, 4, 8, 12, msg, offset + 2 * s[j++]);
                G1$1(1, 5, 9, 13, msg, offset + 2 * s[j++]);
                G2$1(1, 5, 9, 13, msg, offset + 2 * s[j++]);
                G1$1(2, 6, 10, 14, msg, offset + 2 * s[j++]);
                G2$1(2, 6, 10, 14, msg, offset + 2 * s[j++]);
                G1$1(3, 7, 11, 15, msg, offset + 2 * s[j++]);
                G2$1(3, 7, 11, 15, msg, offset + 2 * s[j++]);
                G1$1(0, 5, 10, 15, msg, offset + 2 * s[j++]);
                G2$1(0, 5, 10, 15, msg, offset + 2 * s[j++]);
                G1$1(1, 6, 11, 12, msg, offset + 2 * s[j++]);
                G2$1(1, 6, 11, 12, msg, offset + 2 * s[j++]);
                G1$1(2, 7, 8, 13, msg, offset + 2 * s[j++]);
                G2$1(2, 7, 8, 13, msg, offset + 2 * s[j++]);
                G1$1(3, 4, 9, 14, msg, offset + 2 * s[j++]);
                G2$1(3, 4, 9, 14, msg, offset + 2 * s[j++]);
            }
            this.v0l ^= BUF$1[0] ^ BUF$1[16];
            this.v0h ^= BUF$1[1] ^ BUF$1[17];
            this.v1l ^= BUF$1[2] ^ BUF$1[18];
            this.v1h ^= BUF$1[3] ^ BUF$1[19];
            this.v2l ^= BUF$1[4] ^ BUF$1[20];
            this.v2h ^= BUF$1[5] ^ BUF$1[21];
            this.v3l ^= BUF$1[6] ^ BUF$1[22];
            this.v3h ^= BUF$1[7] ^ BUF$1[23];
            this.v4l ^= BUF$1[8] ^ BUF$1[24];
            this.v4h ^= BUF$1[9] ^ BUF$1[25];
            this.v5l ^= BUF$1[10] ^ BUF$1[26];
            this.v5h ^= BUF$1[11] ^ BUF$1[27];
            this.v6l ^= BUF$1[12] ^ BUF$1[28];
            this.v6h ^= BUF$1[13] ^ BUF$1[29];
            this.v7l ^= BUF$1[14] ^ BUF$1[30];
            this.v7h ^= BUF$1[15] ^ BUF$1[31];
            BUF$1.fill(0);
        }
        destroy() {
            this.destroyed = true;
            this.buffer32.fill(0);
            this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    /**
     * BLAKE2b - optimized for 64-bit platforms. JS doesn't have uint64, so it's slower than BLAKE2s.
     * @param msg - message that would be hashed
     * @param opts - dkLen, key, salt, personalization
     */
    const blake2b = wrapConstructorWithOpts((opts) => new BLAKE2b(opts));

    // Initial state:
    // first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19)
    // same as SHA-256
    // prettier-ignore
    const IV$1 = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    // Mixing function G splitted in two halfs
    function G1(a, b, c, d, x) {
        a = (a + b + x) | 0;
        d = rotr(d ^ a, 16);
        c = (c + d) | 0;
        b = rotr(b ^ c, 12);
        return { a, b, c, d };
    }
    function G2(a, b, c, d, x) {
        a = (a + b + x) | 0;
        d = rotr(d ^ a, 8);
        c = (c + d) | 0;
        b = rotr(b ^ c, 7);
        return { a, b, c, d };
    }
    // prettier-ignore
    function compress(s, offset, msg, rounds, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15) {
        let j = 0;
        for (let i = 0; i < rounds; i++) {
            ({ a: v0, b: v4, c: v8, d: v12 } = G1(v0, v4, v8, v12, msg[offset + s[j++]]));
            ({ a: v0, b: v4, c: v8, d: v12 } = G2(v0, v4, v8, v12, msg[offset + s[j++]]));
            ({ a: v1, b: v5, c: v9, d: v13 } = G1(v1, v5, v9, v13, msg[offset + s[j++]]));
            ({ a: v1, b: v5, c: v9, d: v13 } = G2(v1, v5, v9, v13, msg[offset + s[j++]]));
            ({ a: v2, b: v6, c: v10, d: v14 } = G1(v2, v6, v10, v14, msg[offset + s[j++]]));
            ({ a: v2, b: v6, c: v10, d: v14 } = G2(v2, v6, v10, v14, msg[offset + s[j++]]));
            ({ a: v3, b: v7, c: v11, d: v15 } = G1(v3, v7, v11, v15, msg[offset + s[j++]]));
            ({ a: v3, b: v7, c: v11, d: v15 } = G2(v3, v7, v11, v15, msg[offset + s[j++]]));
            ({ a: v0, b: v5, c: v10, d: v15 } = G1(v0, v5, v10, v15, msg[offset + s[j++]]));
            ({ a: v0, b: v5, c: v10, d: v15 } = G2(v0, v5, v10, v15, msg[offset + s[j++]]));
            ({ a: v1, b: v6, c: v11, d: v12 } = G1(v1, v6, v11, v12, msg[offset + s[j++]]));
            ({ a: v1, b: v6, c: v11, d: v12 } = G2(v1, v6, v11, v12, msg[offset + s[j++]]));
            ({ a: v2, b: v7, c: v8, d: v13 } = G1(v2, v7, v8, v13, msg[offset + s[j++]]));
            ({ a: v2, b: v7, c: v8, d: v13 } = G2(v2, v7, v8, v13, msg[offset + s[j++]]));
            ({ a: v3, b: v4, c: v9, d: v14 } = G1(v3, v4, v9, v14, msg[offset + s[j++]]));
            ({ a: v3, b: v4, c: v9, d: v14 } = G2(v3, v4, v9, v14, msg[offset + s[j++]]));
        }
        return { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 };
    }
    class BLAKE2s extends BLAKE2 {
        constructor(opts = {}) {
            super(64, opts.dkLen === undefined ? 32 : opts.dkLen, opts, 32, 8, 8);
            // Internal state, same as SHA-256
            this.v0 = IV$1[0] | 0;
            this.v1 = IV$1[1] | 0;
            this.v2 = IV$1[2] | 0;
            this.v3 = IV$1[3] | 0;
            this.v4 = IV$1[4] | 0;
            this.v5 = IV$1[5] | 0;
            this.v6 = IV$1[6] | 0;
            this.v7 = IV$1[7] | 0;
            const keyLength = opts.key ? opts.key.length : 0;
            this.v0 ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
            if (opts.salt) {
                const salt = u32(toBytes(opts.salt));
                this.v4 ^= salt[0];
                this.v5 ^= salt[1];
            }
            if (opts.personalization) {
                const pers = u32(toBytes(opts.personalization));
                this.v6 ^= pers[0];
                this.v7 ^= pers[1];
            }
            if (opts.key) {
                // Pad to blockLen and update
                const tmp = new Uint8Array(this.blockLen);
                tmp.set(toBytes(opts.key));
                this.update(tmp);
            }
        }
        get() {
            const { v0, v1, v2, v3, v4, v5, v6, v7 } = this;
            return [v0, v1, v2, v3, v4, v5, v6, v7];
        }
        // prettier-ignore
        set(v0, v1, v2, v3, v4, v5, v6, v7) {
            this.v0 = v0 | 0;
            this.v1 = v1 | 0;
            this.v2 = v2 | 0;
            this.v3 = v3 | 0;
            this.v4 = v4 | 0;
            this.v5 = v5 | 0;
            this.v6 = v6 | 0;
            this.v7 = v7 | 0;
        }
        compress(msg, offset, isLast) {
            const { h, l } = fromBig(BigInt(this.length));
            // prettier-ignore
            const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(SIGMA$1, offset, msg, 10, this.v0, this.v1, this.v2, this.v3, this.v4, this.v5, this.v6, this.v7, IV$1[0], IV$1[1], IV$1[2], IV$1[3], l ^ IV$1[4], h ^ IV$1[5], isLast ? ~IV$1[6] : IV$1[6], IV$1[7]);
            this.v0 ^= v0 ^ v8;
            this.v1 ^= v1 ^ v9;
            this.v2 ^= v2 ^ v10;
            this.v3 ^= v3 ^ v11;
            this.v4 ^= v4 ^ v12;
            this.v5 ^= v5 ^ v13;
            this.v6 ^= v6 ^ v14;
            this.v7 ^= v7 ^ v15;
        }
        destroy() {
            this.destroyed = true;
            this.buffer32.fill(0);
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    /**
     * BLAKE2s - optimized for 32-bit platforms. JS doesn't have uint64, so it's faster than BLAKE2b.
     * @param msg - message that would be hashed
     * @param opts - dkLen, key, salt, personalization
     */
    const blake2s = wrapConstructorWithOpts((opts) => new BLAKE2s(opts));

    // Flag bitset
    var Flags;
    (function (Flags) {
        Flags[Flags["CHUNK_START"] = 1] = "CHUNK_START";
        Flags[Flags["CHUNK_END"] = 2] = "CHUNK_END";
        Flags[Flags["PARENT"] = 4] = "PARENT";
        Flags[Flags["ROOT"] = 8] = "ROOT";
        Flags[Flags["KEYED_HASH"] = 16] = "KEYED_HASH";
        Flags[Flags["DERIVE_KEY_CONTEXT"] = 32] = "DERIVE_KEY_CONTEXT";
        Flags[Flags["DERIVE_KEY_MATERIAL"] = 64] = "DERIVE_KEY_MATERIAL";
    })(Flags || (Flags = {}));
    const SIGMA = (() => {
        const Id = Array.from({ length: 16 }, (_, i) => i);
        const permute = (arr) => [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8].map((i) => arr[i]);
        const res = [];
        for (let i = 0, v = Id; i < 7; i++, v = permute(v))
            res.push(...v);
        return Uint8Array.from(res);
    })();
    // Why is this so slow? It should be 6x faster than blake2b.
    // - There is only 30% reduction in number of rounds from blake2s
    // - This function uses tree mode to achive parallelisation via SIMD and threading,
    //   however in JS we don't have threads and SIMD, so we get only overhead from tree structure
    // - It is possible to speed it up via Web Workers, hovewer it will make code singnificantly more
    //   complicated, which we are trying to avoid, since this library is intended to be used
    //   for cryptographic purposes. Also, parallelization happens only on chunk level (1024 bytes),
    //   which won't really benefit small inputs.
    class BLAKE3 extends BLAKE2 {
        constructor(opts = {}, flags = 0) {
            super(64, opts.dkLen === undefined ? 32 : opts.dkLen, {}, Number.MAX_SAFE_INTEGER, 0, 0);
            this.flags = 0 | 0;
            this.chunkPos = 0; // Position of current block in chunk
            this.chunksDone = 0; // How many chunks we already have
            this.stack = [];
            // Output
            this.posOut = 0;
            this.bufferOut32 = new Uint32Array(16);
            this.chunkOut = 0; // index of output chunk
            this.enableXOF = true;
            this.outputLen = opts.dkLen === undefined ? 32 : opts.dkLen;
            assertNumber(this.outputLen);
            if (opts.key !== undefined && opts.context !== undefined)
                throw new Error('Blake3: only key or context can be specified at same time');
            else if (opts.key !== undefined) {
                const key = toBytes(opts.key);
                if (key.length !== 32)
                    throw new Error('Blake3: key should be 32 byte');
                this.IV = u32(key);
                this.flags = flags | Flags.KEYED_HASH;
            }
            else if (opts.context !== undefined) {
                const context_key = new BLAKE3({ dkLen: 32 }, Flags.DERIVE_KEY_CONTEXT)
                    .update(opts.context)
                    .digest();
                this.IV = u32(context_key);
                this.flags = flags | Flags.DERIVE_KEY_MATERIAL;
            }
            else {
                this.IV = IV$1.slice();
                this.flags = flags;
            }
            this.state = this.IV.slice();
            this.bufferOut = u8(this.bufferOut32);
        }
        // Unused
        get() {
            return [];
        }
        set() { }
        b2Compress(counter, flags, buf, bufPos = 0) {
            const { state, pos } = this;
            const { h, l } = fromBig(BigInt(counter), true);
            // prettier-ignore
            const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(SIGMA, bufPos, buf, 7, state[0], state[1], state[2], state[3], state[4], state[5], state[6], state[7], IV$1[0], IV$1[1], IV$1[2], IV$1[3], h, l, pos, flags);
            state[0] = v0 ^ v8;
            state[1] = v1 ^ v9;
            state[2] = v2 ^ v10;
            state[3] = v3 ^ v11;
            state[4] = v4 ^ v12;
            state[5] = v5 ^ v13;
            state[6] = v6 ^ v14;
            state[7] = v7 ^ v15;
        }
        compress(buf, bufPos = 0, isLast = false) {
            // Compress last block
            let flags = this.flags;
            if (!this.chunkPos)
                flags |= Flags.CHUNK_START;
            if (this.chunkPos === 15 || isLast)
                flags |= Flags.CHUNK_END;
            if (!isLast)
                this.pos = this.blockLen;
            this.b2Compress(this.chunksDone, flags, buf, bufPos);
            this.chunkPos += 1;
            // If current block is last in chunk (16 blocks), then compress chunks
            if (this.chunkPos === 16 || isLast) {
                let chunk = this.state;
                this.state = this.IV.slice();
                // If not the last one, compress only when there are trailing zeros in chunk counter
                // chunks used as binary tree where current stack is path. Zero means current leaf is finished and can be compressed.
                // 1 (001) - leaf not finished (just push current chunk to stack)
                // 2 (010) - leaf finished at depth=1 (merge with last elm on stack and push back)
                // 3 (011) - last leaf not finished
                // 4 (100) - leafs finished at depth=1 and depth=2
                for (let last, chunks = this.chunksDone + 1; isLast || !(chunks & 1); chunks >>= 1) {
                    if (!(last = this.stack.pop()))
                        break;
                    this.buffer32.set(last, 0);
                    this.buffer32.set(chunk, 8);
                    this.pos = this.blockLen;
                    this.b2Compress(0, this.flags | Flags.PARENT, this.buffer32, 0);
                    chunk = this.state;
                    this.state = this.IV.slice();
                }
                this.chunksDone++;
                this.chunkPos = 0;
                this.stack.push(chunk);
            }
            this.pos = 0;
        }
        _cloneInto(to) {
            to = super._cloneInto(to);
            const { IV, flags, state, chunkPos, posOut, chunkOut, stack, chunksDone } = this;
            to.state.set(state.slice());
            to.stack = stack.map((i) => Uint32Array.from(i));
            to.IV.set(IV);
            to.flags = flags;
            to.chunkPos = chunkPos;
            to.chunksDone = chunksDone;
            to.posOut = posOut;
            to.chunkOut = chunkOut;
            to.enableXOF = this.enableXOF;
            to.bufferOut32.set(this.bufferOut32);
            return to;
        }
        destroy() {
            this.destroyed = true;
            this.state.fill(0);
            this.buffer32.fill(0);
            this.IV.fill(0);
            this.bufferOut32.fill(0);
            for (let i of this.stack)
                i.fill(0);
        }
        // Same as b2Compress, but doesn't modify state and returns 16 u32 array (instead of 8)
        b2CompressOut() {
            const { state, pos, flags, buffer32, bufferOut32 } = this;
            const { h, l } = fromBig(BigInt(this.chunkOut++));
            // prettier-ignore
            const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(SIGMA, 0, buffer32, 7, state[0], state[1], state[2], state[3], state[4], state[5], state[6], state[7], IV$1[0], IV$1[1], IV$1[2], IV$1[3], l, h, pos, flags);
            bufferOut32[0] = v0 ^ v8;
            bufferOut32[1] = v1 ^ v9;
            bufferOut32[2] = v2 ^ v10;
            bufferOut32[3] = v3 ^ v11;
            bufferOut32[4] = v4 ^ v12;
            bufferOut32[5] = v5 ^ v13;
            bufferOut32[6] = v6 ^ v14;
            bufferOut32[7] = v7 ^ v15;
            bufferOut32[8] = state[0] ^ v8;
            bufferOut32[9] = state[1] ^ v9;
            bufferOut32[10] = state[2] ^ v10;
            bufferOut32[11] = state[3] ^ v11;
            bufferOut32[12] = state[4] ^ v12;
            bufferOut32[13] = state[5] ^ v13;
            bufferOut32[14] = state[6] ^ v14;
            bufferOut32[15] = state[7] ^ v15;
            this.posOut = 0;
        }
        finish() {
            if (this.finished)
                return;
            this.finished = true;
            // Padding
            this.buffer.fill(0, this.pos);
            // Process last chunk
            let flags = this.flags | Flags.ROOT;
            if (this.stack.length) {
                flags |= Flags.PARENT;
                this.compress(this.buffer32, 0, true);
                this.chunksDone = 0;
                this.pos = this.blockLen;
            }
            else {
                flags |= (!this.chunkPos ? Flags.CHUNK_START : 0) | Flags.CHUNK_END;
            }
            this.flags = flags;
            this.b2CompressOut();
        }
        writeInto(out) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            if (!(out instanceof Uint8Array))
                throw new Error('Blake3: Invalid output buffer');
            this.finish();
            const { blockLen, bufferOut } = this;
            for (let pos = 0, len = out.length; pos < len;) {
                if (this.posOut >= blockLen)
                    this.b2CompressOut();
                const take = Math.min(this.blockLen - this.posOut, len - pos);
                out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
                this.posOut += take;
                pos += take;
            }
            return out;
        }
        xofInto(out) {
            if (!this.enableXOF)
                throw new Error('XOF impossible after digest call');
            return this.writeInto(out);
        }
        xof(bytes) {
            assertNumber(bytes);
            return this.xofInto(new Uint8Array(bytes));
        }
        digestInto(out) {
            if (out.length < this.outputLen)
                throw new Error('Blake3: Invalid output buffer');
            if (this.finished)
                throw new Error('digest() was already called');
            this.enableXOF = false;
            this.writeInto(out);
            this.destroy();
            return out;
        }
        digest() {
            return this.digestInto(new Uint8Array(this.outputLen));
        }
    }
    /**
     * BLAKE3 hash function.
     * @param msg - message that would be hashed
     * @param opts - dkLen, key, context
     */
    const blake3 = wrapConstructorWithOpts((opts) => new BLAKE3(opts));

    // HMAC (RFC 2104)
    class HMAC extends Hash {
        constructor(hash, _key) {
            super();
            this.finished = false;
            this.destroyed = false;
            assertHash(hash);
            const key = toBytes(_key);
            this.iHash = hash.create();
            if (!(this.iHash instanceof Hash))
                throw new TypeError('Expected instance of class which extends utils.Hash');
            const blockLen = (this.blockLen = this.iHash.blockLen);
            this.outputLen = this.iHash.outputLen;
            const pad = new Uint8Array(blockLen);
            // blockLen can be bigger than outputLen
            pad.set(key.length > this.iHash.blockLen ? hash.create().update(key).digest() : key);
            for (let i = 0; i < pad.length; i++)
                pad[i] ^= 0x36;
            this.iHash.update(pad);
            // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
            this.oHash = hash.create();
            // Undo internal XOR && apply outer XOR
            for (let i = 0; i < pad.length; i++)
                pad[i] ^= 0x36 ^ 0x5c;
            this.oHash.update(pad);
            pad.fill(0);
        }
        update(buf) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            this.iHash.update(buf);
            return this;
        }
        digestInto(out) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            if (!(out instanceof Uint8Array) || out.length !== this.outputLen)
                throw new Error('HMAC: Invalid output buffer');
            if (this.finished)
                throw new Error('digest() was already called');
            this.finished = true;
            this.iHash.digestInto(out);
            this.oHash.update(out);
            this.oHash.digestInto(out);
            this.destroy();
        }
        digest() {
            const out = new Uint8Array(this.oHash.outputLen);
            this.digestInto(out);
            return out;
        }
        _cloneInto(to) {
            // Create new instance without calling constructor since key already in state and we don't know it.
            to || (to = Object.create(Object.getPrototypeOf(this), {}));
            const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
            to = to;
            to.finished = finished;
            to.destroyed = destroyed;
            to.blockLen = blockLen;
            to.outputLen = outputLen;
            to.oHash = oHash._cloneInto(to.oHash);
            to.iHash = iHash._cloneInto(to.iHash);
            return to;
        }
        destroy() {
            this.destroyed = true;
            this.oHash.destroy();
            this.iHash.destroy();
        }
    }
    /**
     * HMAC: RFC2104 message authentication code.
     * @param hash - function that would be used e.g. sha256
     * @param key - message key
     * @param message - message data
     */
    const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
    hmac.create = (hash, key) => new HMAC(hash, key);

    // HKDF (RFC 5869)
    // https://soatok.blog/2021/11/17/understanding-hkdf/
    /**
     * HKDF-Extract(IKM, salt) -> PRK
     * Arguments position differs from spec (IKM is first one, since it is not optional)
     * @param hash
     * @param ikm
     * @param salt
     * @returns
     */
    function extract(hash, ikm, salt) {
        assertHash(hash);
        // NOTE: some libraries treat zero-length array as 'not provided';
        // we don't, since we have undefined as 'not provided'
        // https://github.com/RustCrypto/KDFs/issues/15
        if (salt === undefined)
            salt = new Uint8Array(hash.outputLen); // if not provided, it is set to a string of HashLen zeros
        return hmac(hash, toBytes(salt), toBytes(ikm));
    }
    // HKDF-Expand(PRK, info, L) -> OKM
    const HKDF_COUNTER = new Uint8Array([0]);
    const EMPTY_BUFFER = new Uint8Array();
    /**
     * HKDF-expand from the spec.
     * @param prk - a pseudorandom key of at least HashLen octets (usually, the output from the extract step)
     * @param info - optional context and application specific information (can be a zero-length string)
     * @param length - length of output keying material in octets
     */
    function expand(hash, prk, info, length = 32) {
        assertHash(hash);
        assertNumber(length);
        if (length > 255 * hash.outputLen)
            throw new Error('Length should be <= 255*HashLen');
        const blocks = Math.ceil(length / hash.outputLen);
        if (info === undefined)
            info = EMPTY_BUFFER;
        // first L(ength) octets of T
        const okm = new Uint8Array(blocks * hash.outputLen);
        // Re-use HMAC instance between blocks
        const HMAC = hmac.create(hash, prk);
        const HMACTmp = HMAC._cloneInto();
        const T = new Uint8Array(HMAC.outputLen);
        for (let counter = 0; counter < blocks; counter++) {
            HKDF_COUNTER[0] = counter + 1;
            // T(0) = empty string (zero length)
            // T(N) = HMAC-Hash(PRK, T(N-1) | info | N)
            HMACTmp.update(counter === 0 ? EMPTY_BUFFER : T)
                .update(info)
                .update(HKDF_COUNTER)
                .digestInto(T);
            okm.set(T, hash.outputLen * counter);
            HMAC._cloneInto(HMACTmp);
        }
        HMAC.destroy();
        HMACTmp.destroy();
        T.fill(0);
        HKDF_COUNTER.fill(0);
        return okm.slice(0, length);
    }
    /**
     * HKDF (RFC 5869): extract + expand in one step.
     * @param hash - hash function that would be used (e.g. sha256)
     * @param ikm - input keying material, the initial key
     * @param salt - optional salt value (a non-secret random value)
     * @param info - optional context and application specific information
     * @param length - length of output keying material in octets
     */
    const hkdf = (hash, ikm, salt, info, length) => expand(hash, extract(hash, ikm, salt), info, length);

    // Common prologue and epilogue for sync/async functions
    function pbkdf2Init(hash, _password, _salt, _opts) {
        assertHash(hash);
        const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
        const { c, dkLen, asyncTick } = opts;
        assertNumber(c);
        assertNumber(dkLen);
        assertNumber(asyncTick);
        if (c < 1)
            throw new Error('PBKDF2: iterations (c) should be >= 1');
        const password = toBytes(_password);
        const salt = toBytes(_salt);
        // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
        const DK = new Uint8Array(dkLen);
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        const PRF = hmac.create(hash, password);
        const PRFSalt = PRF._cloneInto().update(salt);
        return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
    }
    function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
        PRF.destroy();
        PRFSalt.destroy();
        if (prfW)
            prfW.destroy();
        u.fill(0);
        return DK;
    }
    /**
     * PBKDF2-HMAC: RFC 2898 key derivation function
     * @param hash - hash function that would be used e.g. sha256
     * @param password - password from which a derived key is generated
     * @param salt - cryptographic salt
     * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
     */
    function pbkdf2$1(hash, password, salt, opts) {
        const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
        let prfW; // Working copy
        const arr = new Uint8Array(4);
        const view = createView(arr);
        const u = new Uint8Array(PRF.outputLen);
        // DK = T1 + T2 + ⋯ + Tdklen/hlen
        for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
            // Ti = F(Password, Salt, c, i)
            const Ti = DK.subarray(pos, pos + PRF.outputLen);
            view.setInt32(0, ti, false);
            // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
            // U1 = PRF(Password, Salt + INT_32_BE(i))
            (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
            Ti.set(u.subarray(0, Ti.length));
            for (let ui = 1; ui < c; ui++) {
                // Uc = PRF(Password, Uc−1)
                PRF._cloneInto(prfW).update(u).digestInto(u);
                for (let i = 0; i < Ti.length; i++)
                    Ti[i] ^= u[i];
            }
        }
        return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
    }
    async function pbkdf2Async(hash, password, salt, opts) {
        const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
        let prfW; // Working copy
        const arr = new Uint8Array(4);
        const view = createView(arr);
        const u = new Uint8Array(PRF.outputLen);
        // DK = T1 + T2 + ⋯ + Tdklen/hlen
        for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
            // Ti = F(Password, Salt, c, i)
            const Ti = DK.subarray(pos, pos + PRF.outputLen);
            view.setInt32(0, ti, false);
            // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
            // U1 = PRF(Password, Salt + INT_32_BE(i))
            (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
            Ti.set(u.subarray(0, Ti.length));
            await asyncLoop(c - 1, asyncTick, (i) => {
                // Uc = PRF(Password, Uc−1)
                PRF._cloneInto(prfW).update(u).digestInto(u);
                for (let i = 0; i < Ti.length; i++)
                    Ti[i] ^= u[i];
            });
        }
        return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
    }

    // Polyfill for Safari 14
    function setBigUint64(view, byteOffset, value, isLE) {
        if (typeof view.setBigUint64 === 'function')
            return view.setBigUint64(byteOffset, value, isLE);
        const _32n = BigInt(32);
        const _u32_max = BigInt(0xffffffff);
        const wh = Number((value >> _32n) & _u32_max);
        const wl = Number(value & _u32_max);
        const h = isLE ? 4 : 0;
        const l = isLE ? 0 : 4;
        view.setUint32(byteOffset + h, wh, isLE);
        view.setUint32(byteOffset + l, wl, isLE);
    }
    // Base SHA2 class (RFC 6234)
    class SHA2 extends Hash {
        constructor(blockLen, outputLen, padOffset, isLE) {
            super();
            this.blockLen = blockLen;
            this.outputLen = outputLen;
            this.padOffset = padOffset;
            this.isLE = isLE;
            this.finished = false;
            this.length = 0;
            this.pos = 0;
            this.destroyed = false;
            this.buffer = new Uint8Array(blockLen);
            this.view = createView(this.buffer);
        }
        update(data) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            const { view, buffer, blockLen, finished } = this;
            if (finished)
                throw new Error('digest() was already called');
            data = toBytes(data);
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                // Fast path: we have at least one block in input, cast it to view and process
                if (take === blockLen) {
                    const dataView = createView(data);
                    for (; blockLen <= len - pos; pos += blockLen)
                        this.process(dataView, pos);
                    continue;
                }
                buffer.set(data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                pos += take;
                if (this.pos === blockLen) {
                    this.process(view, 0);
                    this.pos = 0;
                }
            }
            this.length += data.length;
            this.roundClean();
            return this;
        }
        digestInto(out) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            if (!(out instanceof Uint8Array) || out.length < this.outputLen)
                throw new Error('_Sha2: Invalid output buffer');
            if (this.finished)
                throw new Error('digest() was already called');
            this.finished = true;
            // Padding
            // We can avoid allocation of buffer for padding completely if it
            // was previously not allocated here. But it won't change performance.
            const { buffer, view, blockLen, isLE } = this;
            let { pos } = this;
            // append the bit '1' to the message
            buffer[pos++] = 0b10000000;
            this.buffer.subarray(pos).fill(0);
            // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
            if (this.padOffset > blockLen - pos) {
                this.process(view, 0);
                pos = 0;
            }
            // Pad until full block byte with zeros
            for (let i = pos; i < blockLen; i++)
                buffer[i] = 0;
            // NOTE: sha512 requires length to be 128bit integer, but length in JS will overflow before that
            // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
            // So we just write lowest 64bit of that value.
            setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
            this.process(view, 0);
            const oview = createView(out);
            this.get().forEach((v, i) => oview.setUint32(4 * i, v, isLE));
        }
        digest() {
            const { buffer, outputLen } = this;
            this.digestInto(buffer);
            const res = buffer.slice(0, outputLen);
            this.destroy();
            return res;
        }
        _cloneInto(to) {
            to || (to = new this.constructor());
            to.set(...this.get());
            const { blockLen, buffer, length, finished, destroyed, pos } = this;
            to.length = length;
            to.pos = pos;
            to.finished = finished;
            to.destroyed = destroyed;
            if (length % blockLen)
                to.buffer.set(buffer);
            return to;
        }
    }

    // https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
    // https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
    const Rho = new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]);
    const Id = Uint8Array.from({ length: 16 }, (_, i) => i);
    const Pi = Id.map((i) => (9 * i + 5) % 16);
    let idxL = [Id];
    let idxR = [Pi];
    for (let i = 0; i < 4; i++)
        for (let j of [idxL, idxR])
            j.push(j[i].map((k) => Rho[k]));
    const shifts = [
        [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
        [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
        [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
        [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
        [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
    ].map((i) => new Uint8Array(i));
    const shiftsL = idxL.map((idx, i) => idx.map((j) => shifts[i][j]));
    const shiftsR = idxR.map((idx, i) => idx.map((j) => shifts[i][j]));
    const Kl = new Uint32Array([0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e]);
    const Kr = new Uint32Array([0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000]);
    // The rotate left (circular left shift) operation for uint32
    const rotl$1 = (word, shift) => (word << shift) | (word >>> (32 - shift));
    // It's called f() in spec.
    function f(group, x, y, z) {
        if (group === 0)
            return x ^ y ^ z;
        else if (group === 1)
            return (x & y) | (~x & z);
        else if (group === 2)
            return (x | ~y) ^ z;
        else if (group === 3)
            return (x & z) | (y & ~z);
        else
            return x ^ (y | ~z);
    }
    // Temporary buffer, not used to store anything between runs
    const BUF = new Uint32Array(16);
    class RIPEMD160 extends SHA2 {
        constructor() {
            super(64, 20, 8, true);
            this.h0 = 0x67452301 | 0;
            this.h1 = 0xefcdab89 | 0;
            this.h2 = 0x98badcfe | 0;
            this.h3 = 0x10325476 | 0;
            this.h4 = 0xc3d2e1f0 | 0;
        }
        get() {
            const { h0, h1, h2, h3, h4 } = this;
            return [h0, h1, h2, h3, h4];
        }
        set(h0, h1, h2, h3, h4) {
            this.h0 = h0 | 0;
            this.h1 = h1 | 0;
            this.h2 = h2 | 0;
            this.h3 = h3 | 0;
            this.h4 = h4 | 0;
        }
        process(view, offset) {
            for (let i = 0; i < 16; i++, offset += 4)
                BUF[i] = view.getUint32(offset, true);
            // prettier-ignore
            let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
            // Instead of iterating 0 to 80, we split it into 5 groups
            // And use the groups in constants, functions, etc. Much simpler
            for (let group = 0; group < 5; group++) {
                const rGroup = 4 - group;
                const hbl = Kl[group], hbr = Kr[group]; // prettier-ignore
                const rl = idxL[group], rr = idxR[group]; // prettier-ignore
                const sl = shiftsL[group], sr = shiftsR[group]; // prettier-ignore
                for (let i = 0; i < 16; i++) {
                    const tl = (rotl$1(al + f(group, bl, cl, dl) + BUF[rl[i]] + hbl, sl[i]) + el) | 0;
                    al = el, el = dl, dl = rotl$1(cl, 10) | 0, cl = bl, bl = tl; // prettier-ignore
                }
                // 2 loops are 10% faster
                for (let i = 0; i < 16; i++) {
                    const tr = (rotl$1(ar + f(rGroup, br, cr, dr) + BUF[rr[i]] + hbr, sr[i]) + er) | 0;
                    ar = er, er = dr, dr = rotl$1(cr, 10) | 0, cr = br, br = tr; // prettier-ignore
                }
            }
            // Add the compressed chunk to the current hash value
            this.set((this.h1 + cl + dr) | 0, (this.h2 + dl + er) | 0, (this.h3 + el + ar) | 0, (this.h4 + al + br) | 0, (this.h0 + bl + cr) | 0);
        }
        roundClean() {
            BUF.fill(0);
        }
        destroy() {
            this.destroyed = true;
            this.buffer.fill(0);
            this.set(0, 0, 0, 0, 0);
        }
    }
    /**
     * RIPEMD-160 - a hash function from 1990s.
     * @param message - msg that would be hashed
     */
    const ripemd160 = wrapConstructor(() => new RIPEMD160());

    // Choice: a ? b : c
    const Chi = (a, b, c) => (a & b) ^ (~a & c);
    // Majority function, true if any two inpust is true
    const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
    // Round constants:
    // first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
    // prettier-ignore
    const SHA256_K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
    // prettier-ignore
    const IV = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    // Temporary buffer, not used to store anything between runs
    // Named this way because it matches specification.
    const SHA256_W = new Uint32Array(64);
    class SHA256 extends SHA2 {
        constructor() {
            super(64, 32, 8, false);
            // We cannot use array here since array allows indexing by variable
            // which means optimizer/compiler cannot use registers.
            this.A = IV[0] | 0;
            this.B = IV[1] | 0;
            this.C = IV[2] | 0;
            this.D = IV[3] | 0;
            this.E = IV[4] | 0;
            this.F = IV[5] | 0;
            this.G = IV[6] | 0;
            this.H = IV[7] | 0;
        }
        get() {
            const { A, B, C, D, E, F, G, H } = this;
            return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
            this.A = A | 0;
            this.B = B | 0;
            this.C = C | 0;
            this.D = D | 0;
            this.E = E | 0;
            this.F = F | 0;
            this.G = G | 0;
            this.H = H | 0;
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4)
                SHA256_W[i] = view.getUint32(offset, false);
            for (let i = 16; i < 64; i++) {
                const W15 = SHA256_W[i - 15];
                const W2 = SHA256_W[i - 2];
                const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
                const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
            }
            // Compression function main loop, 64 rounds
            let { A, B, C, D, E, F, G, H } = this;
            for (let i = 0; i < 64; i++) {
                const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
                const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
                const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
                const T2 = (sigma0 + Maj(A, B, C)) | 0;
                H = G;
                G = F;
                F = E;
                E = (D + T1) | 0;
                D = C;
                C = B;
                B = A;
                A = (T1 + T2) | 0;
            }
            // Add the compressed chunk to the current hash value
            A = (A + this.A) | 0;
            B = (B + this.B) | 0;
            C = (C + this.C) | 0;
            D = (D + this.D) | 0;
            E = (E + this.E) | 0;
            F = (F + this.F) | 0;
            G = (G + this.G) | 0;
            H = (H + this.H) | 0;
            this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
            SHA256_W.fill(0);
        }
        destroy() {
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
            this.buffer.fill(0);
        }
    }
    /**
     * SHA2-256 hash function
     * @param message - data that would be hashed
     */
    const sha256 = wrapConstructor(() => new SHA256());

    // RFC 7914 Scrypt KDF
    // Left rotate for uint32
    const rotl = (a, b) => (a << b) | (a >>> (32 - b));
    // The main Scrypt loop: uses Salsa extensively.
    // Six versions of the function were tried, this is the fastest one.
    // prettier-ignore
    function XorAndSalsa(prev, pi, input, ii, out, oi) {
        // Based on https://cr.yp.to/salsa20.html
        // Xor blocks
        let y00 = prev[pi++] ^ input[ii++], y01 = prev[pi++] ^ input[ii++];
        let y02 = prev[pi++] ^ input[ii++], y03 = prev[pi++] ^ input[ii++];
        let y04 = prev[pi++] ^ input[ii++], y05 = prev[pi++] ^ input[ii++];
        let y06 = prev[pi++] ^ input[ii++], y07 = prev[pi++] ^ input[ii++];
        let y08 = prev[pi++] ^ input[ii++], y09 = prev[pi++] ^ input[ii++];
        let y10 = prev[pi++] ^ input[ii++], y11 = prev[pi++] ^ input[ii++];
        let y12 = prev[pi++] ^ input[ii++], y13 = prev[pi++] ^ input[ii++];
        let y14 = prev[pi++] ^ input[ii++], y15 = prev[pi++] ^ input[ii++];
        // Save state to temporary variables (salsa)
        let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
        // Main loop (salsa)
        for (let i = 0; i < 8; i += 2) {
            x04 ^= rotl(x00 + x12 | 0, 7);
            x08 ^= rotl(x04 + x00 | 0, 9);
            x12 ^= rotl(x08 + x04 | 0, 13);
            x00 ^= rotl(x12 + x08 | 0, 18);
            x09 ^= rotl(x05 + x01 | 0, 7);
            x13 ^= rotl(x09 + x05 | 0, 9);
            x01 ^= rotl(x13 + x09 | 0, 13);
            x05 ^= rotl(x01 + x13 | 0, 18);
            x14 ^= rotl(x10 + x06 | 0, 7);
            x02 ^= rotl(x14 + x10 | 0, 9);
            x06 ^= rotl(x02 + x14 | 0, 13);
            x10 ^= rotl(x06 + x02 | 0, 18);
            x03 ^= rotl(x15 + x11 | 0, 7);
            x07 ^= rotl(x03 + x15 | 0, 9);
            x11 ^= rotl(x07 + x03 | 0, 13);
            x15 ^= rotl(x11 + x07 | 0, 18);
            x01 ^= rotl(x00 + x03 | 0, 7);
            x02 ^= rotl(x01 + x00 | 0, 9);
            x03 ^= rotl(x02 + x01 | 0, 13);
            x00 ^= rotl(x03 + x02 | 0, 18);
            x06 ^= rotl(x05 + x04 | 0, 7);
            x07 ^= rotl(x06 + x05 | 0, 9);
            x04 ^= rotl(x07 + x06 | 0, 13);
            x05 ^= rotl(x04 + x07 | 0, 18);
            x11 ^= rotl(x10 + x09 | 0, 7);
            x08 ^= rotl(x11 + x10 | 0, 9);
            x09 ^= rotl(x08 + x11 | 0, 13);
            x10 ^= rotl(x09 + x08 | 0, 18);
            x12 ^= rotl(x15 + x14 | 0, 7);
            x13 ^= rotl(x12 + x15 | 0, 9);
            x14 ^= rotl(x13 + x12 | 0, 13);
            x15 ^= rotl(x14 + x13 | 0, 18);
        }
        // Write output (salsa)
        out[oi++] = (y00 + x00) | 0;
        out[oi++] = (y01 + x01) | 0;
        out[oi++] = (y02 + x02) | 0;
        out[oi++] = (y03 + x03) | 0;
        out[oi++] = (y04 + x04) | 0;
        out[oi++] = (y05 + x05) | 0;
        out[oi++] = (y06 + x06) | 0;
        out[oi++] = (y07 + x07) | 0;
        out[oi++] = (y08 + x08) | 0;
        out[oi++] = (y09 + x09) | 0;
        out[oi++] = (y10 + x10) | 0;
        out[oi++] = (y11 + x11) | 0;
        out[oi++] = (y12 + x12) | 0;
        out[oi++] = (y13 + x13) | 0;
        out[oi++] = (y14 + x14) | 0;
        out[oi++] = (y15 + x15) | 0;
    }
    function BlockMix(input, ii, out, oi, r) {
        // The block B is r 128-byte chunks (which is equivalent of 2r 64-byte chunks)
        let head = oi + 0;
        let tail = oi + 16 * r;
        for (let i = 0; i < 16; i++)
            out[tail + i] = input[ii + (2 * r - 1) * 16 + i]; // X ← B[2r−1]
        for (let i = 0; i < r; i++, head += 16, ii += 16) {
            // We write odd & even Yi at same time. Even: 0bXXXXX0 Odd:  0bXXXXX1
            XorAndSalsa(out, tail, input, ii, out, head); // head[i] = Salsa(blockIn[2*i] ^ tail[i-1])
            if (i > 0)
                tail += 16; // First iteration overwrites tmp value in tail
            XorAndSalsa(out, head, input, (ii += 16), out, tail); // tail[i] = Salsa(blockIn[2*i+1] ^ head[i])
        }
    }
    // Common prologue and epilogue for sync/async functions
    function scryptInit(password, salt, _opts) {
        // Maxmem - 1GB+1KB by default
        const opts = checkOpts({
            dkLen: 32,
            asyncTick: 10,
            maxmem: 1024 ** 3 + 1024,
        }, _opts);
        const { N, r, p, dkLen, asyncTick, maxmem, onProgress } = opts;
        assertNumber(N);
        assertNumber(r);
        assertNumber(p);
        assertNumber(dkLen);
        assertNumber(asyncTick);
        assertNumber(maxmem);
        if (onProgress !== undefined && typeof onProgress !== 'function')
            throw new Error('progressCb should be function');
        const blockSize = 128 * r;
        const blockSize32 = blockSize / 4;
        if (N <= 1 || (N & (N - 1)) !== 0 || N >= 2 ** (blockSize / 8) || N > 2 ** 32) {
            // NOTE: we limit N to be less than 2**32 because of 32 bit variant of Integrify function
            // There is no JS engines that allows alocate more than 4GB per single Uint8Array for now, but can change in future.
            throw new Error('Scrypt: N must be larger than 1, a power of 2, less than 2^(128 * r / 8) and less than 2^32');
        }
        if (p < 0 || p > ((2 ** 32 - 1) * 32) / blockSize) {
            throw new Error('Scrypt: p must be a positive integer less than or equal to ((2^32 - 1) * 32) / (128 * r)');
        }
        if (dkLen < 0 || dkLen > (2 ** 32 - 1) * 32) {
            throw new Error('Scrypt: dkLen should be positive integer less than or equal to (2^32 - 1) * 32');
        }
        const memUsed = blockSize * (N + p);
        if (memUsed > maxmem) {
            throw new Error(`Scrypt: parameters too large, ${memUsed} (128 * r * (N + p)) > ${maxmem} (maxmem)`);
        }
        // [B0...Bp−1] ← PBKDF2HMAC-SHA256(Passphrase, Salt, 1, blockSize*ParallelizationFactor)
        // Since it has only one iteration there is no reason to use async variant
        const B = pbkdf2$1(sha256, password, salt, { c: 1, dkLen: blockSize * p });
        const B32 = u32(B);
        // Re-used between parallel iterations. Array(iterations) of B
        const V = u32(new Uint8Array(blockSize * N));
        const tmp = u32(new Uint8Array(blockSize));
        let blockMixCb = () => { };
        if (onProgress) {
            const totalBlockMix = 2 * N * p;
            // Invoke callback if progress changes from 10.01 to 10.02
            // Allows to draw smooth progress bar on up to 8K screen
            const callbackPer = Math.max(Math.floor(totalBlockMix / 10000), 1);
            let blockMixCnt = 0;
            blockMixCb = () => {
                blockMixCnt++;
                if (onProgress && (!(blockMixCnt % callbackPer) || blockMixCnt === totalBlockMix))
                    onProgress(blockMixCnt / totalBlockMix);
            };
        }
        return { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick };
    }
    function scryptOutput(password, dkLen, B, V, tmp) {
        const res = pbkdf2$1(sha256, password, B, { c: 1, dkLen });
        B.fill(0);
        V.fill(0);
        tmp.fill(0);
        return res;
    }
    /**
     * Scrypt KDF from RFC 7914.
     * @param password - pass
     * @param salt - salt
     * @param opts - parameters
     * - `N` is cpu/mem work factor (power of 2 e.g. 2**18)
     * - `r` is block size (8 is common), fine-tunes sequential memory read size and performance
     * - `p` is parallelization factor (1 is common)
     * - `dkLen` is output key length in bytes e.g. 32.
     * - `asyncTick` - (default: 10) max time in ms for which async function can block execution
     * - `maxmem` - (default: `1024 ** 3 + 1024` aka 1GB+1KB). A limit that the app could use for scrypt
     * - `onProgress` - callback function that would be executed for progress report
     * @returns Derived key
     */
    function scrypt$1(password, salt, opts) {
        const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb } = scryptInit(password, salt, opts);
        for (let pi = 0; pi < p; pi++) {
            const Pi = blockSize32 * pi;
            for (let i = 0; i < blockSize32; i++)
                V[i] = B32[Pi + i]; // V[0] = B[i]
            for (let i = 0, pos = 0; i < N - 1; i++) {
                BlockMix(V, pos, V, (pos += blockSize32), r); // V[i] = BlockMix(V[i-1]);
                blockMixCb();
            }
            BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element
            blockMixCb();
            for (let i = 0; i < N; i++) {
                // First u32 of the last 64-byte block (u32 is LE)
                const j = B32[Pi + blockSize32 - 16] % N; // j = Integrify(X) % iterations
                for (let k = 0; k < blockSize32; k++)
                    tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k]; // tmp = B ^ V[j]
                BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])
                blockMixCb();
            }
        }
        return scryptOutput(password, dkLen, B, V, tmp);
    }
    /**
     * Scrypt KDF from RFC 7914.
     */
    async function scryptAsync(password, salt, opts) {
        const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick } = scryptInit(password, salt, opts);
        for (let pi = 0; pi < p; pi++) {
            const Pi = blockSize32 * pi;
            for (let i = 0; i < blockSize32; i++)
                V[i] = B32[Pi + i]; // V[0] = B[i]
            let pos = 0;
            await asyncLoop(N - 1, asyncTick, (i) => {
                BlockMix(V, pos, V, (pos += blockSize32), r); // V[i] = BlockMix(V[i-1]);
                blockMixCb();
            });
            BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element
            blockMixCb();
            await asyncLoop(N, asyncTick, (i) => {
                // First u32 of the last 64-byte block (u32 is LE)
                const j = B32[Pi + blockSize32 - 16] % N; // j = Integrify(X) % iterations
                for (let k = 0; k < blockSize32; k++)
                    tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k]; // tmp = B ^ V[j]
                BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])
                blockMixCb();
            });
        }
        return scryptOutput(password, dkLen, B, V, tmp);
    }

    // Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
    // prettier-ignore
    const [SHA512_Kh, SHA512_Kl] = split([
        '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
        '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
        '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
        '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
        '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
        '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
        '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
        '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
        '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
        '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
        '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
        '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
        '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
        '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
        '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
        '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
        '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
        '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
        '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
        '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
    ].map(n => BigInt(n)));
    // Temporary buffer, not used to store anything between runs
    const SHA512_W_H = new Uint32Array(80);
    const SHA512_W_L = new Uint32Array(80);
    class SHA512 extends SHA2 {
        constructor() {
            super(128, 64, 16, false);
            // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
            // Also looks cleaner and easier to verify with spec.
            // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
            // h -- high 32 bits, l -- low 32 bits
            this.Ah = 0x6a09e667 | 0;
            this.Al = 0xf3bcc908 | 0;
            this.Bh = 0xbb67ae85 | 0;
            this.Bl = 0x84caa73b | 0;
            this.Ch = 0x3c6ef372 | 0;
            this.Cl = 0xfe94f82b | 0;
            this.Dh = 0xa54ff53a | 0;
            this.Dl = 0x5f1d36f1 | 0;
            this.Eh = 0x510e527f | 0;
            this.El = 0xade682d1 | 0;
            this.Fh = 0x9b05688c | 0;
            this.Fl = 0x2b3e6c1f | 0;
            this.Gh = 0x1f83d9ab | 0;
            this.Gl = 0xfb41bd6b | 0;
            this.Hh = 0x5be0cd19 | 0;
            this.Hl = 0x137e2179 | 0;
        }
        // prettier-ignore
        get() {
            const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
            return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
        }
        // prettier-ignore
        set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
            this.Ah = Ah | 0;
            this.Al = Al | 0;
            this.Bh = Bh | 0;
            this.Bl = Bl | 0;
            this.Ch = Ch | 0;
            this.Cl = Cl | 0;
            this.Dh = Dh | 0;
            this.Dl = Dl | 0;
            this.Eh = Eh | 0;
            this.El = El | 0;
            this.Fh = Fh | 0;
            this.Fl = Fl | 0;
            this.Gh = Gh | 0;
            this.Gl = Gl | 0;
            this.Hh = Hh | 0;
            this.Hl = Hl | 0;
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4) {
                SHA512_W_H[i] = view.getUint32(offset);
                SHA512_W_L[i] = view.getUint32((offset += 4));
            }
            for (let i = 16; i < 80; i++) {
                // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
                const W15h = SHA512_W_H[i - 15] | 0;
                const W15l = SHA512_W_L[i - 15] | 0;
                const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
                const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
                // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
                const W2h = SHA512_W_H[i - 2] | 0;
                const W2l = SHA512_W_L[i - 2] | 0;
                const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
                const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
                // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
                const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
                const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
                SHA512_W_H[i] = SUMh | 0;
                SHA512_W_L[i] = SUMl | 0;
            }
            let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
            // Compression function main loop, 80 rounds
            for (let i = 0; i < 80; i++) {
                // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
                const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
                const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
                //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
                const CHIh = (Eh & Fh) ^ (~Eh & Gh);
                const CHIl = (El & Fl) ^ (~El & Gl);
                // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
                // prettier-ignore
                const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
                const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
                const T1l = T1ll | 0;
                // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
                const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
                const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
                const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
                const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
                Hh = Gh | 0;
                Hl = Gl | 0;
                Gh = Fh | 0;
                Gl = Fl | 0;
                Fh = Eh | 0;
                Fl = El | 0;
                ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
                Dh = Ch | 0;
                Dl = Cl | 0;
                Ch = Bh | 0;
                Cl = Bl | 0;
                Bh = Ah | 0;
                Bl = Al | 0;
                const All = add3L(T1l, sigma0l, MAJl);
                Ah = add3H(All, T1h, sigma0h, MAJh);
                Al = All | 0;
            }
            // Add the compressed chunk to the current hash value
            ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
            ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
            ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
            ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
            ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
            ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
            ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
            ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
            this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
        }
        roundClean() {
            SHA512_W_H.fill(0);
            SHA512_W_L.fill(0);
        }
        destroy() {
            this.buffer.fill(0);
            this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    class SHA512_256 extends SHA512 {
        constructor() {
            super();
            // h -- high 32 bits, l -- low 32 bits
            this.Ah = 0x22312194 | 0;
            this.Al = 0xfc2bf72c | 0;
            this.Bh = 0x9f555fa3 | 0;
            this.Bl = 0xc84c64c2 | 0;
            this.Ch = 0x2393b86b | 0;
            this.Cl = 0x6f53b151 | 0;
            this.Dh = 0x96387719 | 0;
            this.Dl = 0x5940eabd | 0;
            this.Eh = 0x96283ee2 | 0;
            this.El = 0xa88effe3 | 0;
            this.Fh = 0xbe5e1e25 | 0;
            this.Fl = 0x53863992 | 0;
            this.Gh = 0x2b0199fc | 0;
            this.Gl = 0x2c85b8aa | 0;
            this.Hh = 0x0eb72ddc | 0;
            this.Hl = 0x81c52ca2 | 0;
            this.outputLen = 32;
        }
    }
    class SHA384 extends SHA512 {
        constructor() {
            super();
            // h -- high 32 bits, l -- low 32 bits
            this.Ah = 0xcbbb9d5d | 0;
            this.Al = 0xc1059ed8 | 0;
            this.Bh = 0x629a292a | 0;
            this.Bl = 0x367cd507 | 0;
            this.Ch = 0x9159015a | 0;
            this.Cl = 0x3070dd17 | 0;
            this.Dh = 0x152fecd8 | 0;
            this.Dl = 0xf70e5939 | 0;
            this.Eh = 0x67332667 | 0;
            this.El = 0xffc00b31 | 0;
            this.Fh = 0x8eb44a87 | 0;
            this.Fl = 0x68581511 | 0;
            this.Gh = 0xdb0c2e0d | 0;
            this.Gl = 0x64f98fa7 | 0;
            this.Hh = 0x47b5481d | 0;
            this.Hl = 0xbefa4fa4 | 0;
            this.outputLen = 48;
        }
    }
    const sha512 = wrapConstructor(() => new SHA512());
    wrapConstructor(() => new SHA512_256());
    wrapConstructor(() => new SHA384());

    // Various per round constants calculations
    const [SHA3_PI, SHA3_ROTL, _SHA3_IOTA] = [[], [], []];
    const _0n = BigInt(0);
    const _1n = BigInt(1);
    const _2n = BigInt(2);
    const _7n = BigInt(7);
    const _256n = BigInt(256);
    const _0x71n = BigInt(0x71);
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
        // Pi
        [x, y] = [y, (2 * x + 3 * y) % 5];
        SHA3_PI.push(2 * (5 * y + x));
        // Rotational
        SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
        // Iota
        let t = _0n;
        for (let j = 0; j < 7; j++) {
            R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
            if (R & _2n)
                t ^= _1n << ((_1n << BigInt(j)) - _1n);
        }
        _SHA3_IOTA.push(t);
    }
    const [SHA3_IOTA_H, SHA3_IOTA_L] = split(_SHA3_IOTA, true);
    // Left rotation (without 0, 32, 64)
    const rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    const rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    // Same as keccakf1600, but allows to skip some rounds
    function keccakP(s, rounds = 24) {
        const B = new Uint32Array(5 * 2);
        // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
        for (let round = 24 - rounds; round < 24; round++) {
            // Theta θ
            for (let x = 0; x < 10; x++)
                B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
            for (let x = 0; x < 10; x += 2) {
                const idx1 = (x + 8) % 10;
                const idx0 = (x + 2) % 10;
                const B0 = B[idx0];
                const B1 = B[idx0 + 1];
                const Th = rotlH(B0, B1, 1) ^ B[idx1];
                const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
                for (let y = 0; y < 50; y += 10) {
                    s[x + y] ^= Th;
                    s[x + y + 1] ^= Tl;
                }
            }
            // Rho (ρ) and Pi (π)
            let curH = s[2];
            let curL = s[3];
            for (let t = 0; t < 24; t++) {
                const shift = SHA3_ROTL[t];
                const Th = rotlH(curH, curL, shift);
                const Tl = rotlL(curH, curL, shift);
                const PI = SHA3_PI[t];
                curH = s[PI];
                curL = s[PI + 1];
                s[PI] = Th;
                s[PI + 1] = Tl;
            }
            // Chi (χ)
            for (let y = 0; y < 50; y += 10) {
                for (let x = 0; x < 10; x++)
                    B[x] = s[y + x];
                for (let x = 0; x < 10; x++)
                    s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
            }
            // Iota (ι)
            s[0] ^= SHA3_IOTA_H[round];
            s[1] ^= SHA3_IOTA_L[round];
        }
        B.fill(0);
    }
    class Keccak extends Hash {
        // NOTE: we accept arguments in bytes instead of bits here.
        constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
            super();
            this.blockLen = blockLen;
            this.suffix = suffix;
            this.outputLen = outputLen;
            this.enableXOF = enableXOF;
            this.rounds = rounds;
            this.pos = 0;
            this.posOut = 0;
            this.finished = false;
            this.destroyed = false;
            // Can be passed from user as dkLen
            assertNumber(outputLen);
            // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
            if (0 >= this.blockLen || this.blockLen >= 200)
                throw new Error('Sha3 supports only keccak-f1600 function');
            this.state = new Uint8Array(200);
            this.state32 = u32(this.state);
        }
        keccak() {
            keccakP(this.state32, this.rounds);
            this.posOut = 0;
            this.pos = 0;
        }
        update(data) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            if (this.finished)
                throw new Error('digest() was already called');
            const { blockLen, state } = this;
            data = toBytes(data);
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                for (let i = 0; i < take; i++)
                    state[this.pos++] ^= data[pos++];
                if (this.pos === blockLen)
                    this.keccak();
            }
            return this;
        }
        finish() {
            if (this.finished)
                return;
            this.finished = true;
            const { state, suffix, pos, blockLen } = this;
            // Do the padding
            state[pos] ^= suffix;
            if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
                this.keccak();
            state[blockLen - 1] ^= 0x80;
            this.keccak();
        }
        writeInto(out) {
            if (this.destroyed)
                throw new Error('instance is destroyed');
            if (!(out instanceof Uint8Array))
                throw new Error('Keccak: invalid output buffer');
            this.finish();
            for (let pos = 0, len = out.length; pos < len;) {
                if (this.posOut >= this.blockLen)
                    this.keccak();
                const take = Math.min(this.blockLen - this.posOut, len - pos);
                out.set(this.state.subarray(this.posOut, this.posOut + take), pos);
                this.posOut += take;
                pos += take;
            }
            return out;
        }
        xofInto(out) {
            // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
            if (!this.enableXOF)
                throw new Error('XOF is not possible for this instance');
            return this.writeInto(out);
        }
        xof(bytes) {
            assertNumber(bytes);
            return this.xofInto(new Uint8Array(bytes));
        }
        digestInto(out) {
            if (out.length < this.outputLen)
                throw new Error('Keccak: invalid output buffer');
            if (this.finished)
                throw new Error('digest() was already called');
            this.finish();
            this.writeInto(out);
            this.destroy();
            return out;
        }
        digest() {
            return this.digestInto(new Uint8Array(this.outputLen));
        }
        destroy() {
            this.destroyed = true;
            this.state.fill(0);
        }
        _cloneInto(to) {
            const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
            to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
            to.state32.set(this.state32);
            to.pos = this.pos;
            to.posOut = this.posOut;
            to.finished = this.finished;
            to.rounds = rounds;
            // Suffix can change in cSHAKE
            to.suffix = suffix;
            to.outputLen = outputLen;
            to.enableXOF = enableXOF;
            to.destroyed = this.destroyed;
            return to;
        }
    }
    const gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
    const sha3_224 = gen(0x06, 144, 224 / 8);
    /**
     * SHA3-256 hash function
     * @param message - that would be hashed
     */
    const sha3_256 = gen(0x06, 136, 256 / 8);
    const sha3_384 = gen(0x06, 104, 384 / 8);
    const sha3_512 = gen(0x06, 72, 512 / 8);
    const keccak_224 = gen(0x01, 144, 224 / 8);
    /**
     * keccak-256 hash function. Different from SHA3-256.
     * @param message - that would be hashed
     */
    const keccak_256 = gen(0x01, 136, 256 / 8);
    const keccak_384 = gen(0x01, 104, 384 / 8);
    const keccak_512 = gen(0x01, 72, 512 / 8);
    const genShake = (suffix, blockLen, outputLen) => wrapConstructorWithOpts((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen !== undefined ? opts.dkLen : outputLen, true));
    genShake(0x1f, 168, 128 / 8);
    genShake(0x1f, 136, 256 / 8);

    // cSHAKE && KMAC (NIST SP800-185)
    function leftEncode(n) {
        const res = [n & 0xff];
        n >>= 8;
        for (; n > 0; n >>= 8)
            res.unshift(n & 0xff);
        res.unshift(res.length);
        return new Uint8Array(res);
    }
    function rightEncode(n) {
        const res = [n & 0xff];
        n >>= 8;
        for (; n > 0; n >>= 8)
            res.unshift(n & 0xff);
        res.push(res.length);
        return new Uint8Array(res);
    }
    const toBytesOptional = (buf) => (buf !== undefined ? toBytes(buf) : new Uint8Array([]));
    // NOTE: second modulo is necessary since we don't need to add padding if current element takes whole block
    const getPadding = (len, block) => new Uint8Array((block - (len % block)) % block);
    // Personalization
    function cshakePers(hash, opts = {}) {
        if (!opts || (!opts.personalization && !opts.NISTfn))
            return hash;
        // Encode and pad inplace to avoid unneccesary memory copies/slices (so we don't need to zero them later)
        // bytepad(encode_string(N) || encode_string(S), 168)
        const blockLenBytes = leftEncode(hash.blockLen);
        const fn = toBytesOptional(opts.NISTfn);
        const fnLen = leftEncode(8 * fn.length); // length in bits
        const pers = toBytesOptional(opts.personalization);
        const persLen = leftEncode(8 * pers.length); // length in bits
        if (!fn.length && !pers.length)
            return hash;
        hash.suffix = 0x04;
        hash.update(blockLenBytes).update(fnLen).update(fn).update(persLen).update(pers);
        let totalLen = blockLenBytes.length + fnLen.length + fn.length + persLen.length + pers.length;
        hash.update(getPadding(totalLen, hash.blockLen));
        return hash;
    }
    const gencShake = (suffix, blockLen, outputLen) => wrapConstructorWithOpts((opts = {}) => cshakePers(new Keccak(blockLen, suffix, opts.dkLen !== undefined ? opts.dkLen : outputLen, true), opts));
    const cshake128 = gencShake(0x1f, 168, 128 / 8);
    const cshake256 = gencShake(0x1f, 136, 256 / 8);
    class KMAC extends Keccak {
        constructor(blockLen, outputLen, enableXOF, key, opts = {}) {
            super(blockLen, 0x1f, outputLen, enableXOF);
            cshakePers(this, { NISTfn: 'KMAC', personalization: opts.personalization });
            key = toBytes(key);
            // 1. newX = bytepad(encode_string(K), 168) || X || right_encode(L).
            const blockLenBytes = leftEncode(this.blockLen);
            const keyLen = leftEncode(8 * key.length);
            this.update(blockLenBytes).update(keyLen).update(key);
            const totalLen = blockLenBytes.length + keyLen.length + key.length;
            this.update(getPadding(totalLen, this.blockLen));
        }
        finish() {
            if (!this.finished)
                this.update(rightEncode(this.enableXOF ? 0 : this.outputLen * 8)); // outputLen in bits
            super.finish();
        }
        _cloneInto(to) {
            // Create new instance without calling constructor since key already in state and we don't know it.
            // Force "to" to be instance of KMAC instead of Sha3.
            if (!to) {
                to = Object.create(Object.getPrototypeOf(this), {});
                to.state = this.state.slice();
                to.blockLen = this.blockLen;
                to.state32 = u32(to.state);
            }
            return super._cloneInto(to);
        }
        clone() {
            return this._cloneInto();
        }
    }
    function genKmac(blockLen, outputLen, xof = false) {
        const kmac = (key, message, opts) => kmac.create(key, opts).update(message).digest();
        kmac.create = (key, opts = {}) => new KMAC(blockLen, opts.dkLen !== undefined ? opts.dkLen : outputLen, xof, key, opts);
        return kmac;
    }
    const kmac128 = genKmac(168, 128 / 8);
    const kmac256 = genKmac(136, 256 / 8);
    genKmac(168, 128 / 8, true);
    genKmac(136, 256 / 8, true);
    // Kangaroo
    // Same as NIST rightEncode, but returns [0] for zero string
    function rightEncodeK12(n) {
        const res = [];
        for (; n > 0; n >>= 8)
            res.unshift(n & 0xff);
        res.push(res.length);
        return new Uint8Array(res);
    }
    const EMPTY = new Uint8Array([]);
    class KangarooTwelve extends Keccak {
        constructor(blockLen, leafLen, outputLen, rounds, opts) {
            super(blockLen, 0x07, outputLen, true, rounds);
            this.leafLen = leafLen;
            this.chunkLen = 8192;
            this.chunkPos = 0; // Position of current block in chunk
            this.chunksDone = 0; // How many chunks we already have
            const { personalization } = opts;
            this.personalization = toBytesOptional(personalization);
        }
        update(data) {
            data = toBytes(data);
            const { chunkLen, blockLen, leafLen, rounds } = this;
            for (let pos = 0, len = data.length; pos < len;) {
                if (this.chunkPos == chunkLen) {
                    if (this.leafHash)
                        super.update(this.leafHash.digest());
                    else {
                        this.suffix = 0x06; // Its safe to change suffix here since its used only in digest()
                        super.update(new Uint8Array([3, 0, 0, 0, 0, 0, 0, 0]));
                    }
                    this.leafHash = new Keccak(blockLen, 0x0b, leafLen, false, rounds);
                    this.chunksDone++;
                    this.chunkPos = 0;
                }
                const take = Math.min(chunkLen - this.chunkPos, len - pos);
                const chunk = data.subarray(pos, pos + take);
                if (this.leafHash)
                    this.leafHash.update(chunk);
                else
                    super.update(chunk);
                this.chunkPos += take;
                pos += take;
            }
            return this;
        }
        finish() {
            if (this.finished)
                return;
            const { personalization } = this;
            this.update(personalization).update(rightEncodeK12(personalization.length));
            // Leaf hash
            if (this.leafHash) {
                super.update(this.leafHash.digest());
                super.update(rightEncodeK12(this.chunksDone));
                super.update(new Uint8Array([0xff, 0xff]));
            }
            super.finish.call(this);
        }
        destroy() {
            super.destroy.call(this);
            if (this.leafHash)
                this.leafHash.destroy();
            // We cannot zero personalization buffer since it is user provided and we don't want to mutate user input
            this.personalization = EMPTY;
        }
        _cloneInto(to) {
            const { blockLen, leafLen, leafHash, outputLen, rounds } = this;
            to || (to = new KangarooTwelve(blockLen, leafLen, outputLen, rounds, {}));
            super._cloneInto(to);
            if (leafHash)
                to.leafHash = leafHash._cloneInto(to.leafHash);
            to.personalization.set(this.personalization);
            to.leafLen = this.leafLen;
            to.chunkPos = this.chunkPos;
            to.chunksDone = this.chunksDone;
            return to;
        }
        clone() {
            return this._cloneInto();
        }
    }
    // Default to 32 bytes, so it can be used without opts
    const k12 = wrapConstructorWithOpts((opts = {}) => new KangarooTwelve(168, 32, opts.dkLen !== undefined ? opts.dkLen : 32, 12, opts));
    // MarsupilamiFourteen
    const m14 = wrapConstructorWithOpts((opts = {}) => new KangarooTwelve(136, 64, opts.dkLen !== undefined ? opts.dkLen : 64, 14, opts));

    // A tiny KDF for various applications like AES key-gen
    const SCRYPT_FACTOR = 2 ** 19;
    const PBKDF2_FACTOR = 2 ** 17;
    const PROTOCOLS_ALLOWING_STR = ['ssh', 'tor', 'file'];
    function strHasLength(str, min, max) {
        return typeof str === 'string' && str.length >= min && str.length <= max;
    }
    // Scrypt KDF
    function scrypt(password, salt) {
        return scrypt$1(password, salt, { N: SCRYPT_FACTOR, r: 8, p: 1, dkLen: 32 });
    }
    // PBKDF2-HMAC-SHA256
    function pbkdf2(password, salt) {
        return pbkdf2$1(sha256, password, salt, { c: PBKDF2_FACTOR, dkLen: 32 });
    }
    // Combines two 32-byte byte arrays
    function xor32(a, b) {
        assertBytes(a, 32);
        assertBytes(b, 32);
        const arr = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            arr[i] = a[i] ^ b[i];
        }
        return arr;
    }
    /**
     * Derives main seed. Takes a lot of time.
     * Prefer `eskdf` method instead.
     */
    function deriveMainSeed(username, password) {
        if (!strHasLength(username, 8, 255))
            throw new Error('invalid username');
        if (!strHasLength(password, 8, 255))
            throw new Error('invalid password');
        const scr = scrypt(password + '\u{1}', username + '\u{1}');
        const pbk = pbkdf2(password + '\u{2}', username + '\u{2}');
        const res = xor32(scr, pbk);
        scr.fill(0);
        pbk.fill(0);
        return res;
    }
    /**
     * Derives a child key. Prefer `eskdf` method instead.
     * @example deriveChildKey(seed, 'aes', 0)
     */
    function deriveChildKey(seed, protocol, accountId = 0, keyLength = 32) {
        assertBytes(seed, 32);
        // Note that length here also repeats two lines below
        // We do an additional length check here to reduce the scope of DoS attacks
        if (!(strHasLength(protocol, 3, 15) && /^[a-z0-9]{3,15}$/.test(protocol))) {
            throw new Error('invalid protocol');
        }
        const allowsStr = PROTOCOLS_ALLOWING_STR.includes(protocol);
        let salt; // Extract salt. Default is undefined.
        if (typeof accountId === 'string') {
            if (!allowsStr)
                throw new Error('accountId must be a number');
            if (!strHasLength(accountId, 1, 255))
                throw new Error('accountId must be valid string');
            salt = toBytes(accountId);
        }
        else if (Number.isSafeInteger(accountId)) {
            if (accountId < 0 || accountId > 2 ** 32 - 1)
                throw new Error('invalid accountId');
            // Convert to Big Endian Uint32
            salt = new Uint8Array(4);
            createView(salt).setUint32(0, accountId, false);
        }
        else {
            throw new Error(`accountId must be a number${allowsStr ? ' or string' : ''}`);
        }
        const info = toBytes(protocol);
        return hkdf(sha256, seed, salt, info, keyLength);
    }
    /**
     * ESKDF
     * @param username - username, email, or identifier, min: 8 characters, should have enough entropy
     * @param password - password, min: 8 characters, should have enough entropy
     * @example
     * const kdf = await eskdf('example-university', 'beginning-new-example');
     * const key = kdf.deriveChildKey('aes', 0);
     * console.log(kdf.fingerprint);
     * kdf.expire();
     */
    async function eskdf(username, password) {
        // We are using closure + object instead of class because
        // we want to make `seed` non-accessible for any external function.
        let seed = await deriveMainSeed(username, password);
        function derive(protocol, accountId = 0) {
            assertBytes(seed, 32);
            return deriveChildKey(seed, protocol, accountId);
        }
        function expire() {
            if (seed)
                seed.fill(1);
            seed = undefined;
        }
        // prettier-ignore
        const fingerprint = Array.from(derive('fingerprint', 0))
            .slice(0, 6)
            .map((char) => char.toString(16).padStart(2, '0').toUpperCase())
            .join(':');
        return Object.freeze({ deriveChildKey: derive, expire, fingerprint });
    }

    const utils = { bytesToHex, randomBytes };

    exports.blake2b = blake2b;
    exports.blake2s = blake2s;
    exports.blake3 = blake3;
    exports.cshake128 = cshake128;
    exports.cshake256 = cshake256;
    exports.eskdf = eskdf;
    exports.hkdf = hkdf;
    exports.hmac = hmac;
    exports.k12 = k12;
    exports.keccak_224 = keccak_224;
    exports.keccak_256 = keccak_256;
    exports.keccak_384 = keccak_384;
    exports.keccak_512 = keccak_512;
    exports.kmac128 = kmac128;
    exports.kmac256 = kmac256;
    exports.m14 = m14;
    exports.pbkdf2 = pbkdf2$1;
    exports.pbkdf2Async = pbkdf2Async;
    exports.ripemd160 = ripemd160;
    exports.scrypt = scrypt$1;
    exports.scryptAsync = scryptAsync;
    exports.sha256 = sha256;
    exports.sha3_224 = sha3_224;
    exports.sha3_256 = sha3_256;
    exports.sha3_384 = sha3_384;
    exports.sha3_512 = sha3_512;
    exports.sha512 = sha512;
    exports.utils = utils;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
