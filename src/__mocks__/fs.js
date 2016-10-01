let files = {};

export function readFileSync(filepath) { return files[filepath]; }
export function __setFiles(newFiles) { files = newFiles; }
