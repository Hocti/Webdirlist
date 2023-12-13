import path from 'path';
import fs from 'fs';

//import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
//import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';

import repo from "./package.json" assert { type: 'json' };

const isProduction = process.env.NODE_ENV === 'production';

const esbuildConfig = {
    target: 'es2020',
    minifySyntax: true,
    define: {
        'process.env.VERSION': `'${repo.version}'`,
        'process.env.DEBUG': isProduction?'false':'true',
    },
    treeShaking: true,
    minify: isProduction,
    tsconfigRaw: '{"compilerOptions":{"useDefineForClassFields":false}}'
}

const plugins = [
    esbuild(esbuildConfig),
];
const compiled = (new Date()).toUTCString().replace(/GMT/g, "UTC");

const banner = `#! /usr/bin/env node
/*!
 * ${repo.name} - v${repo.version}
 * By Hocti
 * Compiled ${compiled}
 *
 * ${repo.name} is licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license
 */`;


async function main() {
    const results=[];
    
    results.push(
    {
        input: "src/tracedir.ts",
        external: ['node:fs','node:path'],
        output: [
            {
                banner,
                format: "cjs",
                file: repo.bin.tracedir
            }
        ],
        plugins
    });      
    return results;
}


export default main();