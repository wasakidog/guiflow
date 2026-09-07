import { packager } from '@electron/packager';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const platforms = process.argv.slice(2);
if (!platforms.length) platforms.push(process.platform);
try {
    for (const platform of platforms) {
        if (!['win32', 'linux', 'darwin'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
        const paths = await packager({
            dir: root, name: 'guiflow', platform, arch: 'x64',
            electronVersion: '44.2.0', out: path.join(root, 'package'),
            overwrite: true, asar: true, prune: true,
            icon: platform === 'win32' ? path.join(root, 'icon/guiflow.ico') : undefined,
            ignore: [/^\/(?:package|test|scripts|\.git)(?:\/|$)/],
        });
        for (const output of paths) {
            const resources = platform === 'darwin' ? path.join(output, 'guiflow.app/Contents/Resources') : path.join(output, 'resources');
            await fs.access(path.join(resources, 'app.asar'));
            console.log(`Packaged: ${output}`);
        }
    }
} catch (error) { console.error(error); process.exitCode = 1; }
