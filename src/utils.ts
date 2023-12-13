export const isBrowser =typeof window !== "undefined" && typeof window.document !== "undefined";
export const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

export const defaultIgnoreExt:string[]=['fla','psd','ai'];
export const defaultIgnoreFiles:string[]=['files.txt','desktop.ini','.DS_Store','thumb.db'];
export const defaultIgnoreFolders:string[]=['temp','.git','.svn','__MACOSX'];