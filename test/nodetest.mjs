import webdirlist from '../dist/webdirlist.cjs.js';
import path from 'node:path';
import fs from 'node:fs';

(async()=>{

//console.log(webdirlist.getFileList_node)
//webdirlist.getInstance().loadDir('/')

//const p=path.resolve('node_modules/esbuild');
//console.log(path.parse(p))
//webdirlist.getFileList_node(p,true,null,['ts','js'])

    const folderPath='node_modules/esbuild';
    let re=await webdirlist.getInstance().getFileList(folderPath,true)
    //console.log(re,fs.existsSync(re[0]),re[0],fs.existsSync(path.join(folderPath,re[0])))

    re=await webdirlist.getInstance().getFileList('node_modules/esbuild',true,null,['ts','js'])//work
    console.log(re[0])
    re=await webdirlist.getInstance().getFileList('./node_modules/esbuild',true,null,['ts','js'])//work
    console.log(re[0])
    //'node_modules/esbuild/bin/esbuild'

    re=await webdirlist.getInstance().getFileList(path.parse(import.meta.url).dir.replace('file:///',''),true)//work
    console.log(re[0],re)
    //  D:/dev/node_dev/webdirlist/test/files.txt

    re=await webdirlist.getInstance().getFileList(path.resolve('node_modules/esbuild'),true)
    console.log(re[0])
    //console.log(re[0],fs.existsSync(re[0]))
    //  'D:/dev\\node_dev\\webdirlist\\node_modules\\esbuild/install.js'      

})()