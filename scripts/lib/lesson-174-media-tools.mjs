// Use the pinned Remotion toolchain on local machines and clean Actions runners.
import path from 'node:path';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../..');
const require=createRequire(root+'/remotion/package.json');
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const executable=type=>getExecutablePath({indent:false,logLevel:'error',type,binariesDirectory:null});
export const ffmpeg=executable('ffmpeg');
export const ffprobe=executable('ffprobe');
