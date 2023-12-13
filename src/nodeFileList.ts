import {defaultIgnoreFiles,defaultIgnoreExt,defaultIgnoreFolders} from './utils'

export type FileListOption ={
    subfolder?: boolean ;
    includedExt?: string[];
    excludedExt?: string[];
    ignoreFiles?: string[];
    ignoreFolder?: string[];
    detail?:boolean;
}

async function innerProcess(_rootPath:string,_path: string, subfolder: boolean = false, includedExt?: string[], excludedExt?: string[],ignoreFiles?: string[],ignoreFolder?: string[],detail:boolean=false): Promise<string[]> {
    const fs = await import('node:fs');
    const path = await import('node:path');

    if(!fs.existsSync(_path)){
        throw new Error('folder not found');
    }

    let paths:string[]=[]
    const files = fs.readdirSync(_path);
    for(let file of files){
        const fp=path.resolve(_path,file);

        const is_dir=fs.lstatSync(fp).isDirectory()
        if(is_dir){
            if(subfolder && !ignoreFolder?.includes(file) && !defaultIgnoreFolders.includes(file)){
                const subpaths=await innerProcess(_rootPath,fp,true,includedExt,excludedExt,ignoreFiles,ignoreFolder,detail);
                for(let subpath of subpaths){
                    paths.push(subpath);
                }
            }
        }else{
            const relativePath=path.relative(_rootPath,fp)
            const info=path.parse(fp);
            const ext=info.ext.substring(1);

            if(includedExt && !includedExt.includes(ext)){
                continue;
            }else if(excludedExt?.includes(ext)){
                continue;
            }else if(ignoreFiles?.includes(file)){
                continue;
            }else if(defaultIgnoreExt.includes(ext)){
                continue;
            }else if(defaultIgnoreFiles.includes(file)){
                continue;
            }


            let output:string=relativePath.replace(/\\/g,'/');
            if(detail){
                const info2=fs.statSync(fp)
                const [filesize,filedate]=[info2.size,Math.floor(info2.mtimeMs/1000)]
                output=`${output}	${filesize}	${filedate}`
            }
            paths.push(output);
        }
    }
    return paths;
}


export const getFileList_node=async function(_path: string, option:FileListOption): Promise<string[]> {
    const {subfolder=true,includedExt,excludedExt,ignoreFiles,ignoreFolder,detail=false}=option;
    return innerProcess(_path,_path,subfolder,includedExt,excludedExt,ignoreFiles,ignoreFolder,detail);
}