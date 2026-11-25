#!/usr/bin/env node
// Build standalone Windows installer.exe for AGY Claude Style (agy-claude-style).
// Zero external npm dependencies: uses built-in Node zlib + Windows .NET Framework csc.exe.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT_DIR,
  cdp,
  VALIDATORS,
  normalizeVersion,
  getArtifactNames,
  createManifest,
  resolveActiveConfigFile,
  buildMultiResIco,
  buildZip,
} from './build-common.mjs';

const __filename = fileURLToPath(import.meta.url);

function findCsc() {
  const winDir = process.env.WINDIR || 'C:\\Windows';
  const candidates = [
    path.join(winDir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(winDir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('csc.exe (.NET Framework 4.x) not found');
}

function buildInstaller({ outputPath, configPath, version = cdp.PLUGIN_VERSION } = {}) {
  const cleanVersion = normalizeVersion(version);
  const resolvedOut = outputPath || path.join(ROOT_DIR, getArtifactNames(cleanVersion).windowsInstaller);
  const csc = findCsc();
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-cs-build-'));

  try {
    const icoPath = path.join(stageDir, 'app.ico');
    fs.writeFileSync(icoPath, buildMultiResIco());

    const manifest = createManifest(cleanVersion);
    const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
    fs.writeFileSync(path.join(stageDir, 'manifest.json'), manifestJson, 'utf8');

    const watcherOut = path.join(stageDir, 'agy-pet-watcher.exe');
    const watcherManifest = path.join(ROOT_DIR, 'installer', 'watcher', 'app.manifest');
    const commonMiniJson = path.join(ROOT_DIR, 'installer', 'common', 'MiniJson.cs');
    const commonCdpClient = path.join(ROOT_DIR, 'installer', 'common', 'CdpClient.cs');
    const commonAgyFast = path.join(ROOT_DIR, 'installer', 'common', 'AgyFastHelper.cs');
    const watcherMain = path.join(ROOT_DIR, 'installer', 'watcher', 'Program.cs');
    const watcherDesktopNeko = path.join(ROOT_DIR, 'installer', 'watcher', 'DesktopNeko.cs');

    execFileSync(csc, [
      '/nologo',
      '/utf8output',
      '/codepage:65001',
      '/platform:x64',
      '/target:winexe',
      '/optimize+',
      `/win32icon:${icoPath}`,
      `/win32manifest:${watcherManifest}`,
      `/out:${watcherOut}`,
      '/r:System.dll',
      '/r:System.Core.dll',
      '/r:System.Drawing.dll',
      '/r:System.Management.dll',
      '/r:System.Net.Http.dll',
      '/r:System.Windows.Forms.dll',
      commonMiniJson,
      commonCdpClient,
      commonAgyFast,
      watcherMain,
      watcherDesktopNeko,
    ], { stdio: 'inherit' });

    const activeConfigFile = resolveActiveConfigFile(configPath);

    const payloadFiles = [
      { name: 'agy-pet-watcher.exe', data: fs.readFileSync(watcherOut) },
      { name: 'WebView2Loader.dll', data: fs.readFileSync(path.join(ROOT_DIR, 'installer', 'watcher', 'WebView2Loader.dll')) },
      { name: 'pet-ui.html', data: fs.readFileSync(path.join(ROOT_DIR, 'installer', 'watcher', 'pet-ui.html')) },
      { name: 'manifest.json', data: Buffer.from(manifestJson, 'utf8') },
      { name: 'style.css', data: fs.readFileSync(path.join(ROOT_DIR, 'style.css')) },
      { name: 'config.json', data: fs.readFileSync(activeConfigFile) },
      { name: 'config.example.json', data: fs.readFileSync(path.join(ROOT_DIR, 'config.example.json')) },
      ...cdp.RUNTIME_PARTS.map((part) => ({
        name: part,
        data: fs.readFileSync(path.join(ROOT_DIR, part)),
      })),
    ];

    const watcherAssetsDir = path.join(ROOT_DIR, 'installer', 'watcher', 'assets');
    if (fs.existsSync(watcherAssetsDir)) {
      for (const fname of fs.readdirSync(watcherAssetsDir)) {
        const full = path.join(watcherAssetsDir, fname);
        if (fs.statSync(full).isFile()) {
          payloadFiles.push({
            name: `assets/${fname}`,
            data: fs.readFileSync(full),
          });
        }
      }
    }

    const webmOptDir = path.join(ROOT_DIR, 'neko-studio', 'webm-opt');
    if (fs.existsSync(webmOptDir)) {
      for (const fname of fs.readdirSync(webmOptDir)) {
        if (/\.webm$/i.test(fname)) {
          payloadFiles.push({
            name: `anims/webm/${fname}`,
            data: fs.readFileSync(path.join(webmOptDir, fname)),
          });
        }
      }
    }

    const agyFastSrcDir = path.join(ROOT_DIR, 'plugins', 'agy-fast');
    if (fs.existsSync(agyFastSrcDir)) {
      const walkPluginFiles = (dir, relBase) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
          if (ent.isDirectory()) {
            walkPluginFiles(full, rel);
          } else if (ent.isFile()) {
            payloadFiles.push({
              name: `plugins/agy-fast/${rel}`,
              data: fs.readFileSync(full),
            });
          }
        }
      };
      walkPluginFiles(agyFastSrcDir, '');
    }

    const payloadZip = path.join(stageDir, 'payload.zip');
    fs.writeFileSync(payloadZip, buildZip(payloadFiles));

    const setupManifest = path.join(ROOT_DIR, 'installer', 'setup', 'app.manifest');
    const setupMain = path.join(ROOT_DIR, 'installer', 'setup', 'Program.cs');
    const tempOut = path.join(stageDir, 'installer.exe');

    execFileSync(csc, [
      '/nologo',
      '/utf8output',
      '/codepage:65001',
      '/target:winexe',
      '/optimize+',
      `/win32icon:${icoPath}`,
      `/win32manifest:${setupManifest}`,
      `/resource:${payloadZip},AGY_PAYLOAD.zip`,
      `/out:${tempOut}`,
      '/r:System.dll',
      '/r:System.Core.dll',
      '/r:System.Drawing.dll',
      '/r:System.IO.Compression.dll',
      '/r:System.IO.Compression.FileSystem.dll',
      '/r:System.Management.dll',
      '/r:System.Net.Http.dll',
      '/r:System.Windows.Forms.dll',
      commonMiniJson,
      commonCdpClient,
      commonAgyFast,
      setupMain,
    ], { stdio: 'inherit' });

    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.copyFileSync(tempOut, resolvedOut);
    const stat = fs.statSync(resolvedOut);
    return {
      outputPath: resolvedOut,
      sizeBytes: stat.size,
      watcherSizeBytes: fs.statSync(watcherOut).size,
      payloadZipBytes: fs.statSync(payloadZip).size,
      fileCount: payloadFiles.length,
    };
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  let outputPath;
  let version = cdp.PLUGIN_VERSION;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--out' || args[i] === '-o') && i + 1 < args.length) {
      outputPath = path.resolve(args[++i]);
    } else if (args[i] === '--version' && i + 1 < args.length) {
      version = args[++i];
    }
  }
  const res = buildInstaller({ outputPath, version });
  console.log(
    `[✓] Built ${res.outputPath} (${(res.sizeBytes / 1024).toFixed(1)} KB; ` +
    `payload ${(res.payloadZipBytes / 1024).toFixed(1)} KB, ${res.fileCount} files)`
  );
}

export {
  VALIDATORS,
  getArtifactNames,
  buildInstaller,
  buildZip,
  buildMultiResIco,
};
