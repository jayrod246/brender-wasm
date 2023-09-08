// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const osType = (()=>{
    const { Deno: Deno1  } = globalThis;
    if (typeof Deno1?.build?.os === "string") {
        return Deno1.build.os;
    }
    const { navigator  } = globalThis;
    if (navigator?.appVersion?.includes?.("Win")) {
        return "windows";
    }
    return "linux";
})();
const isWindows = osType === "windows";
const CHAR_FORWARD_SLASH = 47;
function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
    }
}
function isPosixPathSeparator(code) {
    return code === 47;
}
function isPathSeparator(code) {
    return isPosixPathSeparator(code) || code === 92;
}
function isWindowsDeviceRoot(code) {
    return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for(let i = 0, len = path.length; i <= len; ++i){
        if (i < len) code = path.charCodeAt(i);
        else if (isPathSeparator(code)) break;
        else code = CHAR_FORWARD_SLASH;
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {} else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === 46 && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir) return base;
    if (dir === pathObject.root) return dir + base;
    return dir + sep + base;
}
const WHITESPACE_ENCODINGS = {
    "\u0009": "%09",
    "\u000A": "%0A",
    "\u000B": "%0B",
    "\u000C": "%0C",
    "\u000D": "%0D",
    "\u0020": "%20"
};
function encodeWhitespace(string) {
    return string.replaceAll(/[\s]/g, (c)=>{
        return WHITESPACE_ENCODINGS[c] ?? c;
    });
}
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
const sep = "\\";
const delimiter = ";";
function resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        const { Deno: Deno1  } = globalThis;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (typeof Deno1?.cwd !== "function") {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno1.cwd();
        } else {
            if (typeof Deno1?.env?.get !== "function" || typeof Deno1?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno1.cwd();
            if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
                path = `${resolvedDevice}\\`;
            }
        }
        assertPath(path);
        const len = path.length;
        if (len === 0) continue;
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        if (len > 1) {
            if (isPathSeparator(code)) {
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    let j = 2;
                    let last = j;
                    for(; j < len; ++j){
                        if (isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        last = j;
                        for(; j < len; ++j){
                            if (!isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j < len && j !== last) {
                            last = j;
                            for(; j < len; ++j){
                                if (isPathSeparator(path.charCodeAt(j))) break;
                            }
                            if (j === len) {
                                device = `\\\\${firstPart}\\${path.slice(last)}`;
                                rootEnd = j;
                            } else if (j !== last) {
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                } else {
                    rootEnd = 1;
                }
            } else if (isWindowsDeviceRoot(code)) {
                if (path.charCodeAt(1) === 58) {
                    device = path.slice(0, 2);
                    rootEnd = 2;
                    if (len > 2) {
                        if (isPathSeparator(path.charCodeAt(2))) {
                            isAbsolute = true;
                            rootEnd = 3;
                        }
                    }
                }
            }
        } else if (isPathSeparator(code)) {
            rootEnd = 1;
            isAbsolute = true;
        }
        if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
            resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) break;
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
function normalize(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        } else if (tail.length > 0) {
            return tail;
        } else {
            return "";
        }
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    } else if (tail.length > 0) {
        return device + tail;
    } else {
        return device;
    }
}
function isAbsolute(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return false;
    const code = path.charCodeAt(0);
    if (isPathSeparator(code)) {
        return true;
    } else if (isWindowsDeviceRoot(code)) {
        if (len > 2 && path.charCodeAt(1) === 58) {
            if (isPathSeparator(path.charCodeAt(2))) return true;
        }
    }
    return false;
}
function join(...paths) {
    const pathsCount = paths.length;
    if (pathsCount === 0) return ".";
    let joined;
    let firstPart = null;
    for(let i = 0; i < pathsCount; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (joined === undefined) joined = firstPart = path;
            else joined += `\\${path}`;
        }
    }
    if (joined === undefined) return ".";
    let needsReplace = true;
    let slashCount = 0;
    assert(firstPart != null);
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        needsReplace = false;
                    }
                }
            }
        }
    }
    if (needsReplace) {
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize(joined);
}
function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    const fromOrig = resolve(from);
    const toOrig = resolve(to);
    if (fromOrig === toOrig) return "";
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) return "";
    let fromStart = 0;
    let fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 92) break;
    }
    for(; fromEnd - 1 > fromStart; --fromEnd){
        if (from.charCodeAt(fromEnd - 1) !== 92) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    let toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 92) break;
    }
    for(; toEnd - 1 > toStart; --toEnd){
        if (to.charCodeAt(toEnd - 1) !== 92) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 92) {
                    return toOrig.slice(toStart + i + 1);
                } else if (i === 2) {
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 92) {
                    lastCommonSep = i;
                } else if (i === 2) {
                    lastCommonSep = 3;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 92) lastCommonSep = i;
    }
    if (i !== length && lastCommonSep === -1) {
        return toOrig;
    }
    let out = "";
    if (lastCommonSep === -1) lastCommonSep = 0;
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 92) {
            if (out.length === 0) out += "..";
            else out += "\\..";
        }
    }
    if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
    } else {
        toStart += lastCommonSep;
        if (toOrig.charCodeAt(toStart) === 92) ++toStart;
        return toOrig.slice(toStart, toEnd);
    }
}
function toNamespacedPath(path) {
    if (typeof path !== "string") return path;
    if (path.length === 0) return "";
    const resolvedPath = resolve(path);
    if (resolvedPath.length >= 3) {
        if (resolvedPath.charCodeAt(0) === 92) {
            if (resolvedPath.charCodeAt(1) === 92) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== 63 && code !== 46) {
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
            if (resolvedPath.charCodeAt(1) === 58 && resolvedPath.charCodeAt(2) === 92) {
                return `\\\\?\\${resolvedPath}`;
            }
        }
    }
    return path;
}
function dirname(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return path;
                        }
                        if (j !== last) {
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
    return path.slice(0, end);
}
function basename(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (isWindowsDeviceRoot(drive)) {
            if (path.charCodeAt(1) === 58) start = 2;
        }
    }
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= start; --i){
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= start; --i){
            if (isPathSeparator(path.charCodeAt(i))) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname(path) {
    assertPath(path);
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === 58 && isWindowsDeviceRoot(path.charCodeAt(0))) {
        start = startPart = 2;
    }
    for(let i = path.length - 1; i >= start; --i){
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("\\", pathObject);
}
function parse(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    const len = path.length;
    if (len === 0) return ret;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            rootEnd = j;
                        } else if (j !== last) {
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        if (len === 3) {
                            ret.root = ret.dir = path;
                            return ret;
                        }
                        rootEnd = 3;
                    }
                } else {
                    ret.root = ret.dir = path;
                    return ret;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
    }
    if (rootEnd > 0) ret.root = path.slice(0, rootEnd);
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= rootEnd; --i){
        code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            ret.base = ret.name = path.slice(startPart, end);
        }
    } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0 && startPart !== rootEnd) {
        ret.dir = path.slice(0, startPart - 1);
    } else ret.dir = ret.root;
    return ret;
}
function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
    if (url.hostname != "") {
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
function toFileUrl(path) {
    if (!isAbsolute(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const [, hostname, pathname] = path.match(/^(?:[/\\]{2}([^/\\]+)(?=[/\\](?:[^/\\]|$)))?(.*)/);
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(pathname.replace(/%/g, "%25"));
    if (hostname != null && hostname != "localhost") {
        url.hostname = hostname;
        if (!url.hostname) {
            throw new TypeError("Invalid hostname.");
        }
    }
    return url;
}
const mod = {
    sep: sep,
    delimiter: delimiter,
    resolve: resolve,
    normalize: normalize,
    isAbsolute: isAbsolute,
    join: join,
    relative: relative,
    toNamespacedPath: toNamespacedPath,
    dirname: dirname,
    basename: basename,
    extname: extname,
    format: format,
    parse: parse,
    fromFileUrl: fromFileUrl,
    toFileUrl: toFileUrl
};
const sep1 = "/";
const delimiter1 = ":";
function resolve1(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--){
        let path;
        if (i >= 0) path = pathSegments[i];
        else {
            const { Deno: Deno1  } = globalThis;
            if (typeof Deno1?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno1.cwd();
        }
        assertPath(path);
        if (path.length === 0) {
            continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
        if (resolvedPath.length > 0) return `/${resolvedPath}`;
        else return "/";
    } else if (resolvedPath.length > 0) return resolvedPath;
    else return ".";
}
function normalize1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const isAbsolute = path.charCodeAt(0) === 47;
    const trailingSeparator = path.charCodeAt(path.length - 1) === 47;
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute) return `/${path}`;
    return path;
}
function isAbsolute1(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47;
}
function join1(...paths) {
    if (paths.length === 0) return ".";
    let joined;
    for(let i = 0, len = paths.length; i < len; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `/${path}`;
        }
    }
    if (!joined) return ".";
    return normalize1(joined);
}
function relative1(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    from = resolve1(from);
    to = resolve1(to);
    if (from === to) return "";
    let fromStart = 1;
    const fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 47) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 1;
    const toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 47) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 47) {
                    return to.slice(toStart + i + 1);
                } else if (i === 0) {
                    return to.slice(toStart + i);
                }
            } else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 47) {
                    lastCommonSep = i;
                } else if (i === 0) {
                    lastCommonSep = 0;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 47) lastCommonSep = i;
    }
    let out = "";
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0) out += "..";
            else out += "/..";
        }
    }
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
    else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === 47) ++toStart;
        return to.slice(toStart);
    }
}
function toNamespacedPath1(path) {
    return path;
}
function dirname1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const hasRoot = path.charCodeAt(0) === 47;
    let end = -1;
    let matchedSlash = true;
    for(let i = path.length - 1; i >= 1; --i){
        if (path.charCodeAt(i) === 47) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) return hasRoot ? "/" : ".";
    if (hasRoot && end === 1) return "//";
    return path.slice(0, end);
}
function basename1(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= 0; --i){
            const code = path.charCodeAt(i);
            if (code === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= 0; --i){
            if (path.charCodeAt(i) === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname1(path) {
    assertPath(path);
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for(let i = path.length - 1; i >= 0; --i){
        const code = path.charCodeAt(i);
        if (code === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format1(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("/", pathObject);
}
function parse1(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    if (path.length === 0) return ret;
    const isAbsolute = path.charCodeAt(0) === 47;
    let start;
    if (isAbsolute) {
        ret.root = "/";
        start = 1;
    } else {
        start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= start; --i){
        const code = path.charCodeAt(i);
        if (code === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            if (startPart === 0 && isAbsolute) {
                ret.base = ret.name = path.slice(1, end);
            } else {
                ret.base = ret.name = path.slice(startPart, end);
            }
        }
    } else {
        if (startPart === 0 && isAbsolute) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
        } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute) ret.dir = "/";
    return ret;
}
function fromFileUrl1(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
function toFileUrl1(path) {
    if (!isAbsolute1(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(path.replace(/%/g, "%25").replace(/\\/g, "%5C"));
    return url;
}
const mod1 = {
    sep: sep1,
    delimiter: delimiter1,
    resolve: resolve1,
    normalize: normalize1,
    isAbsolute: isAbsolute1,
    join: join1,
    relative: relative1,
    toNamespacedPath: toNamespacedPath1,
    dirname: dirname1,
    basename: basename1,
    extname: extname1,
    format: format1,
    parse: parse1,
    fromFileUrl: fromFileUrl1,
    toFileUrl: toFileUrl1
};
const path = isWindows ? mod : mod1;
const { join: join2 , normalize: normalize2  } = path;
const path1 = isWindows ? mod : mod1;
const { basename: basename2 , delimiter: delimiter2 , dirname: dirname2 , extname: extname2 , format: format2 , fromFileUrl: fromFileUrl2 , isAbsolute: isAbsolute2 , join: join3 , normalize: normalize3 , parse: parse2 , relative: relative2 , resolve: resolve2 , sep: sep2 , toFileUrl: toFileUrl2 , toNamespacedPath: toNamespacedPath2  } = path1;
const CLOCKID_REALTIME = 0;
const CLOCKID_MONOTONIC = 1;
const CLOCKID_PROCESS_CPUTIME_ID = 2;
const CLOCKID_THREAD_CPUTIME_ID = 3;
const ERRNO_SUCCESS = 0;
const ERRNO_BADF = 8;
const ERRNO_INVAL = 28;
const ERRNO_NOSYS = 52;
const ERRNO_NOTDIR = 54;
const ERRNO_NOTCAPABLE = 76;
const RIGHTS_FD_DATASYNC = 0x0000000000000001n;
const RIGHTS_FD_READ = 0x0000000000000002n;
const RIGHTS_FD_WRITE = 0x0000000000000040n;
const RIGHTS_FD_ALLOCATE = 0x0000000000000100n;
const RIGHTS_FD_READDIR = 0x0000000000004000n;
const RIGHTS_FD_FILESTAT_SET_SIZE = 0x0000000000400000n;
const FILETYPE_UNKNOWN = 0;
const FILETYPE_CHARACTER_DEVICE = 2;
const FILETYPE_DIRECTORY = 3;
const FILETYPE_REGULAR_FILE = 4;
const FILETYPE_SYMBOLIC_LINK = 7;
const FDFLAGS_APPEND = 0x0001;
const FDFLAGS_DSYNC = 0x0002;
const FDFLAGS_NONBLOCK = 0x0004;
const FDFLAGS_RSYNC = 0x0008;
const FDFLAGS_SYNC = 0x0010;
const FSTFLAGS_ATIM_NOW = 0x0002;
const FSTFLAGS_MTIM_NOW = 0x0008;
const LOOKUPFLAGS_SYMLINK_FOLLOW = 0x0001;
const OFLAGS_CREAT = 0x0001;
const OFLAGS_DIRECTORY = 0x0002;
const OFLAGS_EXCL = 0x0004;
const OFLAGS_TRUNC = 0x0008;
const PREOPENTYPE_DIR = 0;
function syscall(target) {
    return function(...args) {
        try {
            return target(...args);
        } catch (err) {
            if (err instanceof ExitStatus) {
                throw err;
            }
            if (!(err instanceof Error)) {
                return 28;
            }
            switch(err.name){
                case "NotFound":
                    return 44;
                case "PermissionDenied":
                    return 2;
                case "ConnectionRefused":
                    return 14;
                case "ConnectionReset":
                    return 15;
                case "ConnectionAborted":
                    return 13;
                case "NotConnected":
                    return 53;
                case "AddrInUse":
                    return 3;
                case "AddrNotAvailable":
                    return 4;
                case "BrokenPipe":
                    return 64;
                case "InvalidData":
                    return 28;
                case "TimedOut":
                    return 73;
                case "Interrupted":
                    return 27;
                case "BadResource":
                    return 8;
                case "Busy":
                    return 10;
                default:
                    return 28;
            }
        }
    };
}
class ExitStatus {
    code;
    constructor(code){
        this.code = code;
    }
}
class Context {
    #args;
    #env;
    #exitOnReturn;
    #memory;
    #fds;
    #started;
    exports;
    constructor(options = {}){
        this.#args = options.args ?? [];
        this.#env = options.env ?? {};
        this.#exitOnReturn = options.exitOnReturn ?? true;
        this.#memory = null;
        this.#fds = [
            {
                rid: options.stdin ?? Deno.stdin.rid,
                type: FILETYPE_CHARACTER_DEVICE,
                flags: FDFLAGS_APPEND
            },
            {
                rid: options.stdout ?? Deno.stdout.rid,
                type: FILETYPE_CHARACTER_DEVICE,
                flags: FDFLAGS_APPEND
            },
            {
                rid: options.stderr ?? Deno.stderr.rid,
                type: FILETYPE_CHARACTER_DEVICE,
                flags: FDFLAGS_APPEND
            }
        ];
        if (options.preopens) {
            for (const [vpath, path] of Object.entries(options.preopens)){
                const entries = Array.from(Deno.readDirSync(path));
                const entry = {
                    type: 3,
                    entries,
                    path,
                    vpath
                };
                this.#fds.push(entry);
            }
        }
        this.exports = {
            "args_get": syscall((argvOffset, argvBufferOffset)=>{
                const args = this.#args;
                const textEncoder = new TextEncoder();
                const memoryData = new Uint8Array(this.#memory.buffer);
                const memoryView = new DataView(this.#memory.buffer);
                for (const arg of args){
                    memoryView.setUint32(argvOffset, argvBufferOffset, true);
                    argvOffset += 4;
                    const data = textEncoder.encode(`${arg}\0`);
                    memoryData.set(data, argvBufferOffset);
                    argvBufferOffset += data.length;
                }
                return ERRNO_SUCCESS;
            }),
            "args_sizes_get": syscall((argcOffset, argvBufferSizeOffset)=>{
                const args = this.#args;
                const textEncoder = new TextEncoder();
                const memoryView = new DataView(this.#memory.buffer);
                memoryView.setUint32(argcOffset, args.length, true);
                memoryView.setUint32(argvBufferSizeOffset, args.reduce(function(acc, arg) {
                    return acc + textEncoder.encode(`${arg}\0`).length;
                }, 0), true);
                return ERRNO_SUCCESS;
            }),
            "environ_get": syscall((environOffset, environBufferOffset)=>{
                const entries = Object.entries(this.#env);
                const textEncoder = new TextEncoder();
                const memoryData = new Uint8Array(this.#memory.buffer);
                const memoryView = new DataView(this.#memory.buffer);
                for (const [key, value] of entries){
                    memoryView.setUint32(environOffset, environBufferOffset, true);
                    environOffset += 4;
                    const data = textEncoder.encode(`${key}=${value}\0`);
                    memoryData.set(data, environBufferOffset);
                    environBufferOffset += data.length;
                }
                return ERRNO_SUCCESS;
            }),
            "environ_sizes_get": syscall((environcOffset, environBufferSizeOffset)=>{
                const entries = Object.entries(this.#env);
                const textEncoder = new TextEncoder();
                const memoryView = new DataView(this.#memory.buffer);
                memoryView.setUint32(environcOffset, entries.length, true);
                memoryView.setUint32(environBufferSizeOffset, entries.reduce(function(acc, [key, value]) {
                    return acc + textEncoder.encode(`${key}=${value}\0`).length;
                }, 0), true);
                return ERRNO_SUCCESS;
            }),
            "clock_res_get": syscall((id, resolutionOffset)=>{
                const memoryView = new DataView(this.#memory.buffer);
                switch(id){
                    case CLOCKID_REALTIME:
                        {
                            const resolution = BigInt(1e6);
                            memoryView.setBigUint64(resolutionOffset, resolution, true);
                            break;
                        }
                    case CLOCKID_MONOTONIC:
                    case CLOCKID_PROCESS_CPUTIME_ID:
                    case CLOCKID_THREAD_CPUTIME_ID:
                        {
                            const resolution1 = BigInt(1e3);
                            memoryView.setBigUint64(resolutionOffset, resolution1, true);
                            break;
                        }
                    default:
                        return ERRNO_INVAL;
                }
                return ERRNO_SUCCESS;
            }),
            "clock_time_get": syscall((id, precision, timeOffset)=>{
                const memoryView = new DataView(this.#memory.buffer);
                switch(id){
                    case CLOCKID_REALTIME:
                        {
                            const time = BigInt(Date.now()) * BigInt(1e6);
                            memoryView.setBigUint64(timeOffset, time, true);
                            break;
                        }
                    case CLOCKID_MONOTONIC:
                    case CLOCKID_PROCESS_CPUTIME_ID:
                    case CLOCKID_THREAD_CPUTIME_ID:
                        {
                            const t = performance.now();
                            const s = Math.trunc(t);
                            const ms = Math.floor((t - s) * 1e3);
                            const time1 = BigInt(s) * BigInt(1e9) + BigInt(ms) * BigInt(1e6);
                            memoryView.setBigUint64(timeOffset, time1, true);
                            break;
                        }
                    default:
                        return ERRNO_INVAL;
                }
                return ERRNO_SUCCESS;
            }),
            "fd_advise": syscall((_fd, _offset, _length, _advice)=>{
                return ERRNO_NOSYS;
            }),
            "fd_allocate": syscall((_fd, _offset, _length)=>{
                return ERRNO_NOSYS;
            }),
            "fd_close": syscall((fd)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (entry.rid) {
                    Deno.close(entry.rid);
                }
                delete this.#fds[fd];
                return ERRNO_SUCCESS;
            }),
            "fd_datasync": syscall((fd)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                Deno.fdatasyncSync(entry.rid);
                return ERRNO_SUCCESS;
            }),
            "fd_fdstat_get": syscall((fd, offset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                memoryView.setUint8(offset, entry.type);
                memoryView.setUint16(offset + 2, entry.flags, true);
                memoryView.setBigUint64(offset + 8, 0n, true);
                memoryView.setBigUint64(offset + 16, 0n, true);
                return ERRNO_SUCCESS;
            }),
            "fd_fdstat_set_flags": syscall((_fd, _flags)=>{
                return ERRNO_NOSYS;
            }),
            "fd_fdstat_set_rights": syscall((_fd, _rightsBase, _rightsInheriting)=>{
                return ERRNO_NOSYS;
            }),
            "fd_filestat_get": syscall((fd, offset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                const info = Deno.fstatSync(entry.rid);
                if (entry.type === undefined) {
                    switch(true){
                        case info.isFile:
                            entry.type = FILETYPE_REGULAR_FILE;
                            break;
                        case info.isDirectory:
                            entry.type = FILETYPE_DIRECTORY;
                            break;
                        case info.isSymlink:
                            entry.type = FILETYPE_SYMBOLIC_LINK;
                            break;
                        default:
                            entry.type = FILETYPE_UNKNOWN;
                            break;
                    }
                }
                memoryView.setBigUint64(offset, BigInt(info.dev ? info.dev : 0), true);
                offset += 8;
                memoryView.setBigUint64(offset, BigInt(info.ino ? info.ino : 0), true);
                offset += 8;
                memoryView.setUint8(offset, entry.type);
                offset += 8;
                memoryView.setUint32(offset, Number(info.nlink), true);
                offset += 8;
                memoryView.setBigUint64(offset, BigInt(info.size), true);
                offset += 8;
                memoryView.setBigUint64(offset, BigInt(info.atime ? info.atime.getTime() * 1e6 : 0), true);
                offset += 8;
                memoryView.setBigUint64(offset, BigInt(info.mtime ? info.mtime.getTime() * 1e6 : 0), true);
                offset += 8;
                memoryView.setBigUint64(offset, BigInt(info.birthtime ? info.birthtime.getTime() * 1e6 : 0), true);
                offset += 8;
                return ERRNO_SUCCESS;
            }),
            "fd_filestat_set_size": syscall((fd, size)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                Deno.ftruncateSync(entry.rid, Number(size));
                return ERRNO_SUCCESS;
            }),
            "fd_filestat_set_times": syscall((fd, atim, mtim, flags)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                if ((flags & FSTFLAGS_ATIM_NOW) == FSTFLAGS_ATIM_NOW) {
                    atim = BigInt(Date.now() * 1e6);
                }
                if ((flags & FSTFLAGS_MTIM_NOW) == FSTFLAGS_MTIM_NOW) {
                    mtim = BigInt(Date.now() * 1e6);
                }
                Deno.utimeSync(entry.path, Number(atim), Number(mtim));
                return ERRNO_SUCCESS;
            }),
            "fd_pread": syscall((fd, iovsOffset, iovsLength, offset, nreadOffset)=>{
                const entry = this.#fds[fd];
                if (entry == null) {
                    return ERRNO_BADF;
                }
                const seek = Deno.seekSync(entry.rid, 0, Deno.SeekMode.Current);
                const memoryView = new DataView(this.#memory.buffer);
                let nread = 0;
                for(let i = 0; i < iovsLength; i++){
                    const dataOffset = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const dataLength = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const data = new Uint8Array(this.#memory.buffer, dataOffset, dataLength);
                    nread += Deno.readSync(entry.rid, data);
                }
                Deno.seekSync(entry.rid, seek, Deno.SeekMode.Start);
                memoryView.setUint32(nreadOffset, nread, true);
                return ERRNO_SUCCESS;
            }),
            "fd_prestat_get": syscall((fd, prestatOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.vpath) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                memoryView.setUint8(prestatOffset, PREOPENTYPE_DIR);
                memoryView.setUint32(prestatOffset + 4, new TextEncoder().encode(entry.vpath).byteLength, true);
                return ERRNO_SUCCESS;
            }),
            "fd_prestat_dir_name": syscall((fd, pathOffset, pathLength)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.vpath) {
                    return ERRNO_BADF;
                }
                const data = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                data.set(new TextEncoder().encode(entry.vpath));
                return ERRNO_SUCCESS;
            }),
            "fd_pwrite": syscall((fd, iovsOffset, iovsLength, offset, nwrittenOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const seek = Deno.seekSync(entry.rid, 0, Deno.SeekMode.Current);
                const memoryView = new DataView(this.#memory.buffer);
                let nwritten = 0;
                for(let i = 0; i < iovsLength; i++){
                    const dataOffset = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const dataLength = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const data = new Uint8Array(this.#memory.buffer, dataOffset, dataLength);
                    nwritten += Deno.writeSync(entry.rid, data);
                }
                Deno.seekSync(entry.rid, seek, Deno.SeekMode.Start);
                memoryView.setUint32(nwrittenOffset, nwritten, true);
                return ERRNO_SUCCESS;
            }),
            "fd_read": syscall((fd, iovsOffset, iovsLength, nreadOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                let nread = 0;
                for(let i = 0; i < iovsLength; i++){
                    const dataOffset = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const dataLength = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const data = new Uint8Array(this.#memory.buffer, dataOffset, dataLength);
                    nread += Deno.readSync(entry.rid, data);
                }
                memoryView.setUint32(nreadOffset, nread, true);
                return ERRNO_SUCCESS;
            }),
            "fd_readdir": syscall((fd, bufferOffset, bufferLength, cookie, bufferUsedOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryData = new Uint8Array(this.#memory.buffer);
                const memoryView = new DataView(this.#memory.buffer);
                let bufferUsed = 0;
                const entries = Array.from(Deno.readDirSync(entry.path));
                for(let i = Number(cookie); i < entries.length; i++){
                    const nameData = new TextEncoder().encode(entries[i].name);
                    const entryInfo = Deno.statSync(resolve2(entry.path, entries[i].name));
                    const entryData = new Uint8Array(24 + nameData.byteLength);
                    const entryView = new DataView(entryData.buffer);
                    entryView.setBigUint64(0, BigInt(i + 1), true);
                    entryView.setBigUint64(8, BigInt(entryInfo.ino ? entryInfo.ino : 0), true);
                    entryView.setUint32(16, nameData.byteLength, true);
                    let type;
                    switch(true){
                        case entries[i].isFile:
                            type = FILETYPE_REGULAR_FILE;
                            break;
                        case entries[i].isDirectory:
                            type = FILETYPE_REGULAR_FILE;
                            break;
                        case entries[i].isSymlink:
                            type = FILETYPE_SYMBOLIC_LINK;
                            break;
                        default:
                            type = FILETYPE_REGULAR_FILE;
                            break;
                    }
                    entryView.setUint8(20, type);
                    entryData.set(nameData, 24);
                    const data = entryData.slice(0, Math.min(entryData.length, bufferLength - bufferUsed));
                    memoryData.set(data, bufferOffset + bufferUsed);
                    bufferUsed += data.byteLength;
                }
                memoryView.setUint32(bufferUsedOffset, bufferUsed, true);
                return ERRNO_SUCCESS;
            }),
            "fd_renumber": syscall((fd, to)=>{
                if (!this.#fds[fd]) {
                    return ERRNO_BADF;
                }
                if (!this.#fds[to]) {
                    return ERRNO_BADF;
                }
                if (this.#fds[to].rid) {
                    Deno.close(this.#fds[to].rid);
                }
                this.#fds[to] = this.#fds[fd];
                delete this.#fds[fd];
                return ERRNO_SUCCESS;
            }),
            "fd_seek": syscall((fd, offset, whence, newOffsetOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                const newOffset = Deno.seekSync(entry.rid, Number(offset), whence);
                memoryView.setBigUint64(newOffsetOffset, BigInt(newOffset), true);
                return ERRNO_SUCCESS;
            }),
            "fd_sync": syscall((fd)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                Deno.fsyncSync(entry.rid);
                return ERRNO_SUCCESS;
            }),
            "fd_tell": syscall((fd, offsetOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                const offset = Deno.seekSync(entry.rid, 0, Deno.SeekMode.Current);
                memoryView.setBigUint64(offsetOffset, BigInt(offset), true);
                return ERRNO_SUCCESS;
            }),
            "fd_write": syscall((fd, iovsOffset, iovsLength, nwrittenOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                const memoryView = new DataView(this.#memory.buffer);
                let nwritten = 0;
                for(let i = 0; i < iovsLength; i++){
                    const dataOffset = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const dataLength = memoryView.getUint32(iovsOffset, true);
                    iovsOffset += 4;
                    const data = new Uint8Array(this.#memory.buffer, dataOffset, dataLength);
                    nwritten += Deno.writeSync(entry.rid, data);
                }
                memoryView.setUint32(nwrittenOffset, nwritten, true);
                return ERRNO_SUCCESS;
            }),
            "path_create_directory": syscall((fd, pathOffset, pathLength)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const data = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const path = resolve2(entry.path, textDecoder.decode(data));
                Deno.mkdirSync(path);
                return ERRNO_SUCCESS;
            }),
            "path_filestat_get": syscall((fd, flags, pathOffset, pathLength, bufferOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const data = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const path = resolve2(entry.path, textDecoder.decode(data));
                const memoryView = new DataView(this.#memory.buffer);
                const info = (flags & LOOKUPFLAGS_SYMLINK_FOLLOW) != 0 ? Deno.statSync(path) : Deno.lstatSync(path);
                memoryView.setBigUint64(bufferOffset, BigInt(info.dev ? info.dev : 0), true);
                bufferOffset += 8;
                memoryView.setBigUint64(bufferOffset, BigInt(info.ino ? info.ino : 0), true);
                bufferOffset += 8;
                switch(true){
                    case info.isFile:
                        memoryView.setUint8(bufferOffset, FILETYPE_REGULAR_FILE);
                        bufferOffset += 8;
                        break;
                    case info.isDirectory:
                        memoryView.setUint8(bufferOffset, FILETYPE_DIRECTORY);
                        bufferOffset += 8;
                        break;
                    case info.isSymlink:
                        memoryView.setUint8(bufferOffset, FILETYPE_SYMBOLIC_LINK);
                        bufferOffset += 8;
                        break;
                    default:
                        memoryView.setUint8(bufferOffset, FILETYPE_UNKNOWN);
                        bufferOffset += 8;
                        break;
                }
                memoryView.setUint32(bufferOffset, Number(info.nlink), true);
                bufferOffset += 8;
                memoryView.setBigUint64(bufferOffset, BigInt(info.size), true);
                bufferOffset += 8;
                memoryView.setBigUint64(bufferOffset, BigInt(info.atime ? info.atime.getTime() * 1e6 : 0), true);
                bufferOffset += 8;
                memoryView.setBigUint64(bufferOffset, BigInt(info.mtime ? info.mtime.getTime() * 1e6 : 0), true);
                bufferOffset += 8;
                memoryView.setBigUint64(bufferOffset, BigInt(info.birthtime ? info.birthtime.getTime() * 1e6 : 0), true);
                bufferOffset += 8;
                return ERRNO_SUCCESS;
            }),
            "path_filestat_set_times": syscall((fd, flags, pathOffset, pathLength, atim, mtim, fstflags)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const data = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const path = resolve2(entry.path, textDecoder.decode(data));
                if ((fstflags & FSTFLAGS_ATIM_NOW) == FSTFLAGS_ATIM_NOW) {
                    atim = BigInt(Date.now()) * BigInt(1e6);
                }
                if ((fstflags & FSTFLAGS_MTIM_NOW) == FSTFLAGS_MTIM_NOW) {
                    mtim = BigInt(Date.now()) * BigInt(1e6);
                }
                Deno.utimeSync(path, Number(atim), Number(mtim));
                return ERRNO_SUCCESS;
            }),
            "path_link": syscall((oldFd, oldFlags, oldPathOffset, oldPathLength, newFd, newPathOffset, newPathLength)=>{
                const oldEntry = this.#fds[oldFd];
                const newEntry = this.#fds[newFd];
                if (!oldEntry || !newEntry) {
                    return ERRNO_BADF;
                }
                if (!oldEntry.path || !newEntry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const oldData = new Uint8Array(this.#memory.buffer, oldPathOffset, oldPathLength);
                const oldPath = resolve2(oldEntry.path, textDecoder.decode(oldData));
                const newData = new Uint8Array(this.#memory.buffer, newPathOffset, newPathLength);
                const newPath = resolve2(newEntry.path, textDecoder.decode(newData));
                Deno.linkSync(oldPath, newPath);
                return ERRNO_SUCCESS;
            }),
            "path_open": syscall((fd, dirflags, pathOffset, pathLength, oflags, rightsBase, rightsInheriting, fdflags, openedFdOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const pathData = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const resolvedPath = resolve2(entry.path, textDecoder.decode(pathData));
                if (relative2(entry.path, resolvedPath).startsWith("..")) {
                    return ERRNO_NOTCAPABLE;
                }
                let path;
                if ((dirflags & LOOKUPFLAGS_SYMLINK_FOLLOW) == LOOKUPFLAGS_SYMLINK_FOLLOW) {
                    try {
                        path = Deno.realPathSync(resolvedPath);
                        if (relative2(entry.path, path).startsWith("..")) {
                            return ERRNO_NOTCAPABLE;
                        }
                    } catch (_err) {
                        path = resolvedPath;
                    }
                } else {
                    path = resolvedPath;
                }
                if ((oflags & OFLAGS_DIRECTORY) !== 0) {
                    const entries = Array.from(Deno.readDirSync(path));
                    const openedFd = this.#fds.push({
                        flags: fdflags,
                        path,
                        entries
                    }) - 1;
                    const memoryView = new DataView(this.#memory.buffer);
                    memoryView.setUint32(openedFdOffset, openedFd, true);
                    return ERRNO_SUCCESS;
                }
                const options = {
                    read: false,
                    write: false,
                    append: false,
                    truncate: false,
                    create: false,
                    createNew: false
                };
                if ((oflags & OFLAGS_CREAT) !== 0) {
                    options.create = true;
                    options.write = true;
                }
                if ((oflags & OFLAGS_EXCL) !== 0) {
                    options.createNew = true;
                }
                if ((oflags & OFLAGS_TRUNC) !== 0) {
                    options.truncate = true;
                    options.write = true;
                }
                const read = RIGHTS_FD_READ | RIGHTS_FD_READDIR;
                if ((rightsBase & read) != 0n) {
                    options.read = true;
                }
                const write = RIGHTS_FD_DATASYNC | RIGHTS_FD_WRITE | RIGHTS_FD_ALLOCATE | RIGHTS_FD_FILESTAT_SET_SIZE;
                if ((rightsBase & write) != 0n) {
                    options.write = true;
                }
                if ((fdflags & FDFLAGS_APPEND) != 0) {
                    options.append = true;
                }
                if ((fdflags & FDFLAGS_DSYNC) != 0) {}
                if ((fdflags & FDFLAGS_NONBLOCK) != 0) {}
                if ((fdflags & FDFLAGS_RSYNC) != 0) {}
                if ((fdflags & FDFLAGS_SYNC) != 0) {}
                if (!options.read && !options.write && !options.truncate) {
                    options.read = true;
                }
                const { rid  } = Deno.openSync(path, options);
                const openedFd1 = this.#fds.push({
                    rid,
                    flags: fdflags,
                    path
                }) - 1;
                const memoryView1 = new DataView(this.#memory.buffer);
                memoryView1.setUint32(openedFdOffset, openedFd1, true);
                return ERRNO_SUCCESS;
            }),
            "path_readlink": syscall((fd, pathOffset, pathLength, bufferOffset, bufferLength, bufferUsedOffset)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const memoryData = new Uint8Array(this.#memory.buffer);
                const memoryView = new DataView(this.#memory.buffer);
                const pathData = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const path = resolve2(entry.path, new TextDecoder().decode(pathData));
                const link = Deno.readLinkSync(path);
                const linkData = new TextEncoder().encode(link);
                memoryData.set(new Uint8Array(linkData, 0, bufferLength), bufferOffset);
                const bufferUsed = Math.min(linkData.byteLength, bufferLength);
                memoryView.setUint32(bufferUsedOffset, bufferUsed, true);
                return ERRNO_SUCCESS;
            }),
            "path_remove_directory": syscall((fd, pathOffset, pathLength)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const data = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const path = resolve2(entry.path, textDecoder.decode(data));
                if (!Deno.statSync(path).isDirectory) {
                    return ERRNO_NOTDIR;
                }
                Deno.removeSync(path);
                return ERRNO_SUCCESS;
            }),
            "path_rename": syscall((fd, oldPathOffset, oldPathLength, newFd, newPathOffset, newPathLength)=>{
                const oldEntry = this.#fds[fd];
                const newEntry = this.#fds[newFd];
                if (!oldEntry || !newEntry) {
                    return ERRNO_BADF;
                }
                if (!oldEntry.path || !newEntry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const oldData = new Uint8Array(this.#memory.buffer, oldPathOffset, oldPathLength);
                const oldPath = resolve2(oldEntry.path, textDecoder.decode(oldData));
                const newData = new Uint8Array(this.#memory.buffer, newPathOffset, newPathLength);
                const newPath = resolve2(newEntry.path, textDecoder.decode(newData));
                Deno.renameSync(oldPath, newPath);
                return ERRNO_SUCCESS;
            }),
            "path_symlink": syscall((oldPathOffset, oldPathLength, fd, newPathOffset, newPathLength)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const oldData = new Uint8Array(this.#memory.buffer, oldPathOffset, oldPathLength);
                const oldPath = textDecoder.decode(oldData);
                const newData = new Uint8Array(this.#memory.buffer, newPathOffset, newPathLength);
                const newPath = resolve2(entry.path, textDecoder.decode(newData));
                Deno.symlinkSync(oldPath, newPath);
                return ERRNO_SUCCESS;
            }),
            "path_unlink_file": syscall((fd, pathOffset, pathLength)=>{
                const entry = this.#fds[fd];
                if (!entry) {
                    return ERRNO_BADF;
                }
                if (!entry.path) {
                    return ERRNO_INVAL;
                }
                const textDecoder = new TextDecoder();
                const data = new Uint8Array(this.#memory.buffer, pathOffset, pathLength);
                const path = resolve2(entry.path, textDecoder.decode(data));
                Deno.removeSync(path);
                return ERRNO_SUCCESS;
            }),
            "poll_oneoff": syscall((_inOffset, _outOffset, _nsubscriptions, _neventsOffset)=>{
                return ERRNO_NOSYS;
            }),
            "proc_exit": syscall((rval)=>{
                if (this.#exitOnReturn) {
                    Deno.exit(rval);
                }
                throw new ExitStatus(rval);
            }),
            "proc_raise": syscall((_sig)=>{
                return ERRNO_NOSYS;
            }),
            "sched_yield": syscall(()=>{
                return ERRNO_SUCCESS;
            }),
            "random_get": syscall((bufferOffset, bufferLength)=>{
                const buffer = new Uint8Array(this.#memory.buffer, bufferOffset, bufferLength);
                crypto.getRandomValues(buffer);
                return ERRNO_SUCCESS;
            }),
            "sock_recv": syscall((_fd, _riDataOffset, _riDataLength, _riFlags, _roDataLengthOffset, _roFlagsOffset)=>{
                return ERRNO_NOSYS;
            }),
            "sock_send": syscall((_fd, _siDataOffset, _siDataLength, _siFlags, _soDataLengthOffset)=>{
                return ERRNO_NOSYS;
            }),
            "sock_shutdown": syscall((_fd, _how)=>{
                return ERRNO_NOSYS;
            })
        };
        this.#started = false;
    }
    start(instance) {
        if (this.#started) {
            throw new Error("WebAssembly.Instance has already started");
        }
        this.#started = true;
        const { _start , _initialize , memory  } = instance.exports;
        if (!(memory instanceof WebAssembly.Memory)) {
            throw new TypeError("WebAsembly.instance must provide a memory export");
        }
        this.#memory = memory;
        if (typeof _initialize == "function") {
            throw new TypeError("WebAsembly.instance export _initialize must not be a function");
        }
        if (typeof _start != "function") {
            throw new TypeError("WebAssembly.Instance export _start must be a function");
        }
        try {
            _start();
        } catch (err) {
            if (err instanceof ExitStatus) {
                return err.code;
            }
            throw err;
        }
        return null;
    }
    initialize(instance) {
        if (this.#started) {
            throw new Error("WebAssembly.Instance has already started");
        }
        this.#started = true;
        const { _start , _initialize , memory  } = instance.exports;
        if (!(memory instanceof WebAssembly.Memory)) {
            throw new TypeError("WebAsembly.instance must provide a memory export");
        }
        this.#memory = memory;
        if (typeof _start == "function") {
            throw new TypeError("WebAssembly.Instance export _start must not be a function");
        }
        if (_initialize && typeof _initialize != "function") {
            throw new TypeError("WebAssembly.Instance export _initialize must be a function or not be defined");
        }
        _initialize?.();
    }
}
const fps = 1.0 / 60.0;
const context = new Context({
    stdin: 0,
    stdout: 1,
    stderr: 2,
    args: [],
    env: {}
});
const memory = new WebAssembly.Memory({
    initial: 128,
    maximum: 128
});
const importObject = {
    wasi_snapshot_preview1: context.exports,
    env: {
        consoleLog: (pointer, length)=>{
            console.log(decodeString(pointer, length));
        },
        memory: memory
    }
};
const decodeString = (pointer, length)=>{
    const slice = new Uint8Array(memory.buffer, pointer, length);
    return new TextDecoder().decode(slice);
};
WebAssembly.instantiateStreaming(fetch("./zig-out/lib/teapot.wasm"), importObject).then((result)=>{
    const wasmMemoryArray = new Uint8Array(memory.buffer);
    const canvas = document.getElementById("teapot");
    const context2d = canvas.getContext("2d");
    const imageData = context2d.createImageData(canvas.width, canvas.height);
    context2d.clearRect(0, 0, canvas.width, canvas.height);
    result.instance.exports.main();
    const drawImage = ()=>{
        result.instance.exports.updateImage(fps);
        const bufferOffset = result.instance.exports.getImagePointer();
        const imageDataArray = wasmMemoryArray.slice(bufferOffset, bufferOffset + canvas.width * canvas.height * 4);
        imageData.data.set(imageDataArray);
        context2d.clearRect(0, 0, canvas.width, canvas.height);
        context2d.putImageData(imageData, 0, 0);
    };
    drawImage();
    console.log(memory.buffer);
    setInterval(()=>{
        drawImage();
    }, fps * 1000);
});
