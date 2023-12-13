# Webdirlist[![npm version](https://img.shields.io/npm/v/webdirlist.svg?logo=npm)](https://www.npmjs.com/package/webdirlist)

webdirlist is a versatile library designed to list files in a directory. It can be used in both Node.js and browser environments. In static hosting scenarios, it prepares a comprehensive listing of all files within a directory in a `files.txt` file. 

## Features

- **Tracedir Command**: Generate a `files.txt` file containing information about all files in a specified directory.
- **getFileList Function**: Retrieve a list of files from `files.txt` or directly from the file system in Node.js.

## Installation

Install the package using npm:

```sh
npm install webdirlist -g

then

tracedir <blank for current fodler, or input the fodler path>
```

#### CDN Install

Via jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/webdirlist/dist/webdirlist.js"></script>
or
<script type="module">
    import webdirlist from 'https://cdn.jsdelivr.net/npm/webdirlist/dist/webdirlist.esm.js';
</script>
```

## Usage

#### Generating files.txt

Run the `tracedir` command with npx:

```sh
npx tracedir <folder-path>

e.g.
npx tracedir .\node_modules\esbuild\
```

This will generate a `files.txt` in the specified folder.

```
bin/esbuild	9180	1702310819
install.js	10923	1702310819
lib/main.d.ts	21152	1702310819
lib/main.js	88340	1702310819
LICENSE.md	1069	1702310819
package.json	1260	1702310819
README.md	175	1702310819
```

### In the Browser

```javascript
import webdirlist from 'webdirlist';

//optional, set the current folder, leave blank=auto
webdirlist.getInstance().setCWD();

// Async function to get file list
webdirlist.getInstance().loadDir('node_modules/esbuild').then(async()=>{
    const files=await webdirlist.getInstance().getFileList('node_modules/esbuild/lib',{
        subfolder:true,//optional,default true
        includedExt:['json','png','mp3'],//optional
        excludedExt:['txt'],//optional
        ignoreFiles:['unuse.json'],//optional
        ignoreFolder:['temp'],//optional
    });
    // list of filenames in string array
    //['lib/main.d.ts','lib/main.js']
})
```

### In Node.js

don't need to read **files.txt** in advance , just run **webdirlist.getInstance().getFileList** directly 

## Contributing

Contributions to the project are welcome. Please ensure that your code adheres to the project's coding standards and include tests for new features.

## License

webdirlist is [MIT licensed](./LICENSE).