// `tracedir` — scan a directory and write the `files.txt` a browser will read.
//
// The command is the build step of the whole library: nothing on the web can list a directory,
// so this is what makes the listing exist. Kept as a thin argument parser over `writeManifest`
// so the same work is one function call from a vite plugin or a script.
import { writeManifest } from './node.js';

const USAGE = `webdirlist — write a files.txt describing a directory tree

  tracedir [dir] [outfile] [options]

  dir       directory to scan          (default: the current directory)
  outfile   where to write the listing (default: <dir>/files.txt)

  --ext a,b       only these extensions
  --not-ext a,b   skip these extensions
  --skip a,b      skip these directory names (on top of the built-in list)
  --flat          do not descend into sub-directories
  -h, --help      this text
`;

function takeList(argv: string[], flag: string): string[] | undefined {
	const i = argv.indexOf(flag);
	if (i < 0) return undefined;
	const value = argv[i + 1];
	argv.splice(i, value === undefined ? 1 : 2);
	return value
		?.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
}

function takeFlag(argv: string[], flag: string): boolean {
	const i = argv.indexOf(flag);
	if (i < 0) return false;
	argv.splice(i, 1);
	return true;
}

/** Run the CLI. Returns the number of files listed; throws on a directory it cannot read. */
export async function tracedir(argv: string[]): Promise<number> {
	const args = [...argv];
	if (takeFlag(args, '-h') || takeFlag(args, '--help')) {
		console.log(USAGE);
		return 0;
	}

	const includeExt = takeList(args, '--ext');
	const excludeExt = takeList(args, '--not-ext');
	const ignoreFolders = takeList(args, '--skip');
	const subfolders = !takeFlag(args, '--flat');

	const [dir = process.cwd(), outfile] = args.filter((a) => !a.startsWith('-'));

	const text = await writeManifest(dir, outfile, { includeExt, excludeExt, ignoreFolders, subfolders });
	const count = text === '' ? 0 : text.split('\n').length;
	console.log(`[tracedir] ${count} files in ${dir}`);
	return count;
}
