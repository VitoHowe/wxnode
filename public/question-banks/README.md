# 题库图片资源目录

## 目录结构

每个题库有独立的图片目录：

```
question-banks/
├── 15/                    # 题库ID为15
│   └── images/
│       ├── xxx.jpg
│       └── yyy.jpg
├── 16/                    # 题库ID为16
│   └── images/
└── README.md              # 本文件
```

## 如何添加图片

### 方法1：手动复制

```bash
# Windows PowerShell
Copy-Item "源图片目录\*.jpg" -Destination "public\question-banks\15\images\"

# Windows CMD
copy "源图片目录\*.jpg" "public\question-banks\15\images\"

# Linux/Mac
cp 源图片目录/*.jpg public/question-banks/15/images/
```

### 方法2：通过API上传（待实现）

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@图片.jpg" \
  http://localhost:3001/api/question-banks/15/images
```

## 图片命名规范

建议使用hash值作为文件名，例如：
- `909c1f56d7d2117316d5d97a0ff576c139cf8d320652e1114e3ce90a77de33f0.jpg`
- `ce4de732109ab9da0bc34a144a5519bcbd34adeb3276b5cdea48eac9b1e2f040.jpg`

## 图片访问URL

图片会通过以下URL访问：
```
http://localhost:3001/api/question-banks/{bankId}/images/{filename}
```

例如：
```
http://localhost:3001/api/question-banks/15/images/909c1f56...jpg
```

## 注意事项

1. ✅ 支持的图片格式：jpg, jpeg, png, gif, webp, svg
2. ✅ 建议图片大小：< 500KB
3. ✅ 建议图片尺寸：宽度 < 1200px
4. ⚠️ 删除题库不会自动删除图片，需手动清理
5. ⚠️ 修改图片文件名会导致题目中的引用失效

## 示例

假设题库15的题目中引用了图片：

```
题目内容中：${images/909c1f56...jpg}
```

需要将图片放在：
```
public/question-banks/15/images/909c1f56...jpg
```

前端会将其解析为：
```
http://localhost:3001/api/question-banks/15/images/909c1f56...jpg
```
