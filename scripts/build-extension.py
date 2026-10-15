"""把网站资源复制到独立扩展目录，并生成可手动安装的 ZIP。"""
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
source = root / 'dist'
target = root / 'browser-extension'
files = ['index.html', 'style.css', 'app.js', 'search-assist.js', 'third-party-notices.txt']
for name in files:
    shutil.copy2(source / name, target / name)
shutil.copytree(source / 'icons', target / 'icons', dirs_exist_ok=True)
archive = source / 'downloads' / 'qidian-newtab.zip'
archive.parent.mkdir(parents=True, exist_ok=True)
entries = [target / name for name in files + ['manifest.json', 'README.md']]
entries += [path for folder in ['icons', 'assets'] for path in (target / folder).rglob('*') if path.is_file()]
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
    for path in sorted(entries):
        package.write(path, path.relative_to(target).as_posix())
print(f'{archive}: {len(entries)} files, {archive.stat().st_size} bytes')
