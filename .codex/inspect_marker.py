from pathlib import Path
text = Path('src/middleware/validation.ts').read_text(encoding='utf-8')
marker = '// 更新文件'
idx = text.find(marker)
print(idx)
print(text[idx:idx+20])
