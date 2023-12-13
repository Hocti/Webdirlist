import {isNode,defaultIgnoreFiles,defaultIgnoreExt,defaultIgnoreFolders} from './utils'
import path from 'path-browserify-esm'
import {getFileList_node,type FileListOption} from './nodeFileList'

export type fileInfo={
	path:string;
	name:string;
	type:string;
	folder:string;
	size:number;
	date:number;
}

export type folderInfo={
	path:string;
	files:fileInfo[];
	subFolders:folderInfo[];
}

export default class webdirlist {

	private static instance: webdirlist;
	
	private constructor() {}

	static getInstance(): webdirlist {
		if (!webdirlist.instance) {
			webdirlist.instance = new webdirlist();
		}
		return webdirlist.instance;
	}

	//==================================================
	
	private allFiles:Record<string,fileInfo>={};
	private allFolder:Record<string,folderInfo>={};

	public setCWD(_path?:string):void{
		if(!_path){
			_path=path.parse(window.location.pathname).dir;
		}
		path.setCWD(_path);
	}

	public getCWD():string{
		return path.process_cwd
	}

	public async loadDir(_path:string=''):Promise<void>{
		const filetextPath:string=path.resolve(_path,'files.txt');
		return fetch(filetextPath).then((response)=>{
			return response.text();
		}).then((text)=>{
			if(text==='Not Found'){
				Promise.reject(filetextPath+' Not Found')
			}
			return this.loadFilesFromText(text,_path);
		}).catch((e)=>{
			//console.error(e)
			Promise.reject(e)
		})
	}

	public async getFileList(_path:string,option:FileListOption={}):Promise<string[]> {
		if(isNode){
			return await getFileList_node(_path,option);
		}else{
			return Promise.resolve(this.getFileList_web(_path,option));
		}
	}

	//data process===================
	
	public loadFilesFromText(text:string,_path:string=''){
		let arr:string[]=text.split("\n");
		for(let v of arr){
			let arr2:string[]=v.split("\t");
			if(arr2.length!==3)continue

			const filepath=path.resolve(_path,arr2[0].replace(/\\/g,'/'));
			const parsedObj=path.parse(filepath);

			const fileInfo:fileInfo={
				path:	filepath,
				name:	parsedObj.base,
				type:	parsedObj.ext.substring(1),
				folder:	parsedObj.dir,
				size:	Number(arr2[1]),
				date:	Number(arr2[2]),
			}

			this.allFiles[fileInfo.path]=fileInfo;
			if(!this.allFolder[parsedObj.dir]){
				this.allFolder[parsedObj.dir]={
					path:	parsedObj.dir,
					files:	[fileInfo],
					subFolders:[]
				}
				this.addtoSubFolder(parsedObj.dir);
			}else{
				this.allFolder[parsedObj.dir].files.push(fileInfo);
			}
		}
	}
	
	private addtoSubFolder(_path:string){
		const parsedObj=path.parse(_path);
		if(!this.allFolder[parsedObj.dir]){
			this.allFolder[parsedObj.dir]={
				path:	parsedObj.dir,
				files:	[],
				subFolders:[]
			}
			this.addtoSubFolder(parsedObj.dir);
		}
		if(parsedObj.dir===_path){
			return;
		}
		if(!this.allFolder[parsedObj.dir].subFolders.includes(this.allFolder[_path])){
			this.allFolder[parsedObj.dir].subFolders.push(this.allFolder[_path]);
		}
	}

	//browser==================================================

	public getFileList_web(_path:string,option:FileListOption={}):string[] {
		const {subfolder=true,includedExt,excludedExt,ignoreFiles,ignoreFolder,detail=false}=option;
		
		const folderPath=path.resolve(_path);
		//console.log(_path,folderPath)
		if(!this.allFolder[folderPath]){
			throw new Error('folder not found');
		}
		return this.getFileList_web_inner(folderPath,folderPath,subfolder,includedExt,excludedExt,ignoreFiles,ignoreFolder,detail);
	}

	private getFileList_web_inner(_rootPath:string,_path:string,subfolder: boolean = false, includedExt?: string[], excludedExt?: string[],ignoreFiles?: string[],ignoreFolder?: string[],detail:boolean=false):string[] {
		let paths:string[]=[]
		if(subfolder && this.allFolder[_path].subFolders.length>0){
			for(let folder of this.allFolder[_path].subFolders){
				const subpaths=this.getFileList_web_inner(_rootPath,folder.path,true,includedExt,excludedExt,ignoreFiles,ignoreFolder,detail);
				for(let subpath of subpaths){
					paths.push(subpath);
				}
			}
		}
		for(let file of this.allFolder[_path].files){
			const ext=file.type
            if(includedExt && !includedExt.includes(ext)){
                continue;
            }else if(excludedExt?.includes(ext)){
                continue;
            }else if(ignoreFiles?.includes(file.name)){
                continue;
            }else if(defaultIgnoreExt.includes(ext)){
                continue;
            }else if(defaultIgnoreFiles.includes(file.name)){
                continue;
            }

			let output:string=path.relative(_rootPath,file.path);
			if(detail){
				output=`${file.path}	${file.size}	${file.date}`
			}
			paths.push(output);
		}
		return paths;
	}

}