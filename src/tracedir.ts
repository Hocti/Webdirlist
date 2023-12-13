import * as fs from 'node:fs';
import {getFileList_node} from './nodeFileList'

if (process.argv[2]) {
    (async()=>{

        const lines = await getFileList_node(process.argv[2], {subfolder:true,detail:true})
        const content=lines.join('\n');

        let filename = process.argv[2] + '/files.txt';
        
        if (process.argv[3]) {
            filename = process.argv[3];
        }
        
        fs.writeFile(filename, content, e => true);
    })()
}