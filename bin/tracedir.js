#! /usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
));
/*!
 * webdirlist - v1.0.1
 * By Hocti
 * Compiled Wed, 13 Dec 2023 19:31:30 UTC
 *
 * webdirlist is licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license
 */
var fs = require("node:fs");
function _interopNamespaceDefault(e) {
  var n = /* @__PURE__ */ Object.create(null);
  return e && Object.keys(e).forEach(function(k) {
    if (k !== "default") {
      var d = Object.getOwnPropertyDescriptor(e, k);
      Object.defineProperty(n, k, d.get ? d : {
        enumerable: !0,
        get: function() {
          return e[k];
        }
      });
    }
  }), n.default = e, Object.freeze(n);
}
var fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
typeof process < "u" && process.versions != null && process.versions.node != null;
const defaultIgnoreExt = ["fla", "psd", "ai"], defaultIgnoreFiles = ["files.txt", "desktop.ini", ".DS_Store", "thumb.db"], defaultIgnoreFolders = ["temp", ".git", ".svn", "__MACOSX"];
async function innerProcess(_rootPath, _path, subfolder = !1, includedExt, excludedExt, ignoreFiles, ignoreFolder, detail = !1) {
  const fs2 = await import("node:fs"), path = await import("node:path");
  if (!fs2.existsSync(_path))
    throw new Error("folder not found");
  let paths = [];
  const files = fs2.readdirSync(_path);
  for (let file of files) {
    const fp = path.resolve(_path, file);
    if (fs2.lstatSync(fp).isDirectory()) {
      if (subfolder && !ignoreFolder?.includes(file) && !defaultIgnoreFolders.includes(file)) {
        const subpaths = await innerProcess(_rootPath, fp, !0, includedExt, excludedExt, ignoreFiles, ignoreFolder, detail);
        for (let subpath of subpaths)
          paths.push(subpath);
      }
    } else {
      const relativePath = path.relative(_rootPath, fp), ext = path.parse(fp).ext.substring(1);
      if (includedExt && !includedExt.includes(ext) || excludedExt?.includes(ext) || ignoreFiles?.includes(file) || defaultIgnoreExt.includes(ext) || defaultIgnoreFiles.includes(file))
        continue;
      let output = relativePath.replace(/\\/g, "/");
      if (detail) {
        const info2 = fs2.statSync(fp), [filesize, filedate] = [info2.size, Math.floor(info2.mtimeMs / 1e3)];
        output = `${output}	${filesize}	${filedate}`;
      }
      paths.push(output);
    }
  }
  return paths;
}
const getFileList_node = async function(_path, option) {
  const { subfolder = !0, includedExt, excludedExt, ignoreFiles, ignoreFolder, detail = !1 } = option;
  return innerProcess(_path, _path, subfolder, includedExt, excludedExt, ignoreFiles, ignoreFolder, detail);
};
(async () => {
  let currPath = process.argv[2] ? process.argv[2] : process.cwd();
  const content = (await getFileList_node(currPath, { subfolder: !0, detail: !0 })).join(`
`);
  let filename = currPath + "/files.txt";
  process.argv[3] && (filename = process.argv[3]), fs__namespace.writeFile(filename, content, (e) => !0);
})();
