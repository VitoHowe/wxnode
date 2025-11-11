from pathlib import Path
text = Path('src/services/wordBookService.ts').read_text(encoding='utf-8').splitlines()
for i in range(360, 430):
    print(f"{i+1}: {text[i]}")
