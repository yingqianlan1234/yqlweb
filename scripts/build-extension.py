"""把网站资源复制到独立扩展目录，并生成可手动安装的 ZIP。"""
from pathlib import Path
import shutil
import zipfile
import hashlib
import re

root = Path(__file__).resolve().parents[1]
source = root / 'dist'
target = root / 'browser-extension'
files = ['index.html', 'style.css', 'app.js', 'search-assist.js', 'dashboard.js', 'third-party-notices.txt']
for name in files:
    shutil.copy2(source / name, target / name)
# 手机滚动修复仅属于网页版，扩展保留自己的固定入口。
css_path = target / 'style.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* 手机网页版的边栏入口随文档滚动，避免覆盖正文。 */'
if marker in css:
    start = css.index(marker)
    end = css.index('\n}', start) + 2
    css_path.write_text(css[:start] + css[end:], encoding='utf-8')
index_path = target / 'index.html'
index = index_path.read_text(encoding='utf-8')
version = hashlib.sha256(css_path.read_bytes()).hexdigest()[:12]
index_path.write_text(re.sub(r'style\.css\?v=[a-f0-9]+', 'style.css?v=' + version, index), encoding='utf-8')
shutil.copytree(source / 'icons', target / 'icons', dirs_exist_ok=True)
archive = source / 'downloads' / 'qidian-newtab.zip'
archive.parent.mkdir(parents=True, exist_ok=True)
entries = [target / name for name in files + ['manifest.json', 'README.md']]
entries += [path for folder in ['icons', 'assets'] for path in (target / folder).rglob('*') if path.is_file()]
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
    for path in sorted(entries):
        package.write(path, path.relative_to(target).as_posix())
print(f'{archive}: {len(entries)} files, {archive.stat().st_size} bytes')
