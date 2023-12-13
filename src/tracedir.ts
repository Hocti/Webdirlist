import * as fs from 'node:fs';
import {getFileList_node} from './nodeFileList'

(async()=>{
    let currPath=process.argv[2]?process.argv[2]:process.cwd();

    const lines = await getFileList_node(currPath, {subfolder:true,detail:true})
    const content=lines.join('\n');

    let filename = currPath + '/files.txt';
    
    if (process.argv[3]) {
        filename = process.argv[3];
    }
    
    fs.writeFile(filename, content, e => true);
})()