# 寰俊灏忕▼搴忛搴撶鐞嗙郴缁?API 鎺ュ彛鏂囨。

**鐗堟湰**: v1.8.0
**鏈€鍚庢洿鏂?*: 2026-01-27
**鍩虹 URL**: `http://localhost:3001/api`
**鏂囨。鏉ユ簮**: Swagger (/api-docs)锛屾湰鏂囦负鍙戝竷鐗?

## 鏇存柊鏃ュ織

### v1.6.0 (2026-01-16)
- 鉁?鎺ュ彛娓呮礂锛氱Щ闄ゆ湭浣跨敤妯″潡锛坲sers/system/parse-results/word-practice 绛夛級
- 鉁?濂戠害鏀舵暃锛氫繚鐣?auth/棰樺簱/绔犺妭/鍗曡瘝涔?杩涘害/鏂囦欢涓婁紶
- 鉁?Refresh 鍏煎锛歳efreshToken 鏀寔 body 涓?Authorization
- 鉁?鏂囨。娌荤悊锛歋wagger 涓轰簨瀹炴簮锛孧arkdown 涓哄彂甯冪墿

### v1.8.0 (2026-01-27)
- ✅ 新增 Markdown 解析中心接口（文件上传/解析/章节列表/下载）
- ✅ 新增 Markdown 静态资源管理（source.md 与章节文件直连下载）
- ✅ 解析规则优化：仅当 H1 标题包含“第 X 章”时才进行章节拆分

### v1.7.0 (2026-01-20)
- 鉁?鏂板绉戠洰/绔犺妭閰嶇疆鎺ュ彛锛堝惈鍚庡彴绠＄悊锛?- 鉁?鏂板棰樺簱瀵煎叆涓庣珷鑺?JSON 瀵煎叆锛堢粦瀹氱鐩級
- 鉁?鏂板鐪熼缁冧範鎺ュ彛锛堣瘯鍗峰垪琛?閫愰/閿欓锛?
## 閫氱敤绾﹀畾

### 璁よ瘉
- 闄?`/auth/login` 涓?`/auth/refresh` 澶栵紝鍏朵綑鎺ュ彛闇€瑕?`Authorization: Bearer <accessToken>`
- 鍒锋柊浠ょ墝鏀寔涓ょ鏂瑰紡锛?
  - `POST /auth/refresh` body: `{ "refreshToken": "..." }`
  - `Authorization: Bearer <refreshToken>`

### 缁熶竴鍝嶅簲鏍煎紡
```json
{ "code": 200, "message": "ok", "data": {}, "timestamp": "2026-01-16T00:00:00.000Z" }
```


### 甯歌閿欒鐮?
- 400 璇锋眰鍙傛暟楠岃瘉澶辫触
- 401 鏈巿鏉冩垨 Token 澶辨晥
- 403 鏃犳潈闄?
- 404 璧勬簮涓嶅瓨鍦?
- 429 璇锋眰杩囦簬棰戠箒
- 500 鏈嶅姟寮傚父

## 鎺ュ彛鐩綍
- 璁よ瘉: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/profile`, `POST /auth/logout`
- 棰樺簱: `GET /questions/banks`, `GET /questions/banks/:id`
- 绉戠洰: `GET /subjects`, `GET /subjects/:subjectId/banks`, `GET /subjects/:subjectId/chapters`, `POST /subjects/:subjectId/chapters/sync`
- 鍚庡彴棰樺簱閰嶇疆: `GET /admin/question-banks`, `POST /admin/question-banks/import-json`
- 鐪熼: `GET /real-exams`, `GET /real-exams/:paperId/questions`, `POST /real-exams/:paperId/attempts`
- 绔犺妭: `GET /question-banks/:bankId/chapters`, `GET /question-banks/:bankId/chapters/:chapterId/questions`
- 鍗曡瘝涔? `GET /word-books`, `GET /word-books/:id/words`
- 杩涘害: `GET /user-progress/:bankId/chapters`, `GET /user-progress/:bankId/full`, `POST /user-progress/:bankId/chapters/:chapterId`
- 杩涘害: `DELETE /user-progress/:bankId/chapters/:chapterId`, `DELETE /user-progress/:bankId`
- 鏂囦欢: `POST /files/upload`
- 鍋ュ悍妫€鏌? `GET /health`

## 璁よ瘉
### POST /auth/login
璇存槑: 寰俊 code 鎴栨櫘閫氳处鍙峰瘑鐮佺櫥褰?
璇锋眰绀轰緥 (寰俊):
```json
{ "code": "wx_code", "encryptedData": "...", "iv": "...", "signature": "..." }
```
璇锋眰绀轰緥 (璐﹀彿):
```json
{ "username": "demo", "password": "secret" }
```
鍝嶅簲 data: accessToken, refreshToken, expiresIn, user

### POST /auth/refresh
璇存槑: 鐢?refreshToken 鎹㈡柊 accessToken锛屾垚鍔熷悗浼氫笅鍙戞柊鐨?refreshToken
璇锋眰绀轰緥 (body):
```json
{ "refreshToken": "..." }
```
璇锋眰绀轰緥 (header): `Authorization: Bearer <refreshToken>`
鍝嶅簲 data: accessToken, refreshToken, expiresIn

### GET /auth/profile
璇存槑: 鑾峰彇褰撳墠鐢ㄦ埛淇℃伅锛堥渶 Authorization锛?

### POST /auth/logout
璇存槑: 鐧诲嚭骞朵娇褰撳墠 token 澶辨晥锛堥渶 Authorization锛?

## 棰樺簱绠＄悊
### GET /questions/banks
璇存槑: 鑾峰彇棰樺簱鍒楄〃锛堜粎 parse_status=completed锛?
鏌ヨ鍙傛暟: page (榛樿 1), limit (榛樿 20, 鏈€澶?100)
鍝嶅簲 data: { banks: [], total, pagination }

### GET /questions/banks/:id
璇存槑: 鑾峰彇棰樺簱璇︽儏涓庣粺璁′俊鎭?
鍝嶅簲 data: 棰樺簱淇℃伅 + statistics + question_count

## 绔犺妭绠＄悊
### GET /question-banks/:bankId/chapters
璇存槑: 鑾峰彇棰樺簱涓嬬珷鑺傚垪琛?
鍝嶅簲 data: { chapters: [], totalChapters }

### GET /question-banks/:bankId/chapters/:chapterId/questions
### DELETE /question-banks/:bankId/chapters/:chapterId
说明: 删除题库章节并级联删除章节题目（管理员）
说明: 同时清理该章节相关的学习进度记录
响应 data: null

璇存槑: 鑾峰彇绔犺妭棰樼洰鍒楄〃
鏌ヨ鍙傛暟: page (榛樿 1), limit (榛樿 0 = 鍏ㄩ噺, >0 鍒嗛〉)
鍝嶅簲 data: { questions: [], total, pagination }

## 鍗曡瘝涔?
### GET /word-books
璇存槑: 鑾峰彇鍗曡瘝涔﹀垪琛?
鏌ヨ鍙傛暟: page (榛樿 1), limit (榛樿 10), keyword, language
鍝嶅簲 data: { books: [], total, pagination }

### GET /word-books/:id/words
璇存槑: 鑾峰彇鎸囧畾鍗曡瘝涔︾殑鍗曡瘝鏉＄洰
鍝嶅簲 data: { book, words: [], total, pagination }

## 杩涘害绠＄悊
### GET /user-progress/:bankId/chapters
璇存槑: 鑾峰彇棰樺簱鍚勭珷鑺傝繘搴?
鍝嶅簲 data: 绔犺妭杩涘害鏁扮粍

### GET /user-progress/:bankId/full
璇存槑: 鑾峰彇鏁村嵎缁冧範杩涘害
鍝嶅簲 data: 杩涘害瀵硅薄鎴?null

### POST /user-progress/:bankId/chapters/:chapterId
璇存槑: 淇濆瓨绔犺妭/鏁村嵎杩涘害
璇锋眰 body: { practice_mode?, current_chapter_id?, current_question_number, completed_count?, total_questions }
璇存槑: practice_mode=full 鏃跺彲浼?current_chapter_id
鍝嶅簲 data: 杩涘害瀵硅薄

### DELETE /user-progress/:bankId/chapters/:chapterId
璇存槑: 閲嶇疆绔犺妭杩涘害

### DELETE /user-progress/:bankId
璇存槑: 閲嶇疆棰樺簱杩涘害

## 鏂囦欢绠＄悊
### POST /files/upload
璇存槑: 涓婁紶棰樺簱鏂囦欢锛堥渶 Authorization锛?璇锋眰: multipart/form-data锛屽瓧娈?file/name锛宒escription/type 鍙€?鏀寔鏍煎紡: pdf, doc, docx, txt, md, xlsx, xls, csv, json, jpg, jpeg, png, gif, bmp, webp
鍝嶅簲 data: 涓婁紶鍚庣殑鏂囦欢淇℃伅

## 绉戠洰绠＄悊
### GET /subjects
璇存槑: 鑾峰彇鍚敤涓殑绉戠洰鍒楄〃
鍝嶅簲 data: { subjects: [] }

### GET /subjects/admin
璇存槑: 鑾峰彇鍏ㄩ儴绉戠洰锛堝惈鍋滅敤锛岀鐞嗗憳锛?鍝嶅簲 data: { subjects: [] }

### POST /subjects
璇存槑: 鏂板绉戠洰锛堢鐞嗗憳锛?璇锋眰 body: { name, code?, status?, sort_order? }

### PUT /subjects/:subjectId
璇存槑: 鏇存柊绉戠洰锛堢鐞嗗憳锛屼粎鏀寔鍋滅敤锛?璇锋眰 body: { name?, code?, status?, sort_order? }

### GET /subjects/:subjectId/banks
璇存槑: 鑾峰彇绉戠洰涓嬮搴撳垪琛紙鏀寔鍒嗛〉锛?鏌ヨ鍙傛暟: page, limit
鍝嶅簲 data: { banks: [], total, pagination }

### GET /subjects/:subjectId/chapters
璇存槑: 鑾峰彇绉戠洰绔犺妭鍒楄〃锛堝惈棰橀噺缁熻锛?鏌ヨ鍙傛暟: includeDisabled (鍙€夛紝绠＄悊鍛樹娇鐢?
鍝嶅簲 data: { chapters: [] }

### GET /subjects/:subjectId/chapter-aliases
è¯´æ˜Ž: èŽ·å–ç§‘ç›®ç« èŠ‚åˆ«åæ˜ å°„ï¼ˆç®¡ç†å‘˜ï¼‰
å“åº” data: { aliases: [] }

### POST /subjects/:subjectId/chapter-aliases
è¯´æ˜Ž: æ–°å¢žç§‘ç›®ç« èŠ‚åˆ«åæ˜ å°„ï¼ˆç®¡ç†å‘˜ï¼?è¯·æ±‚ body: { alias_name, subject_chapter_id }
å“åº” data: alias

### DELETE /subjects/:subjectId/chapter-aliases/:aliasId
è¯´æ˜Ž: åˆ é™¤ç§‘ç›®ç« èŠ‚åˆ«åæ˜ å°„ï¼ˆç®¡ç†å‘˜ï¼‰

### POST /subjects/:subjectId/chapters/sync
说明: 同步科目章节与题库章节绑定（管理员），按章节名匹配/创建 subject_chapters，并回填 question_chapters.subject_chapter_id
响应 data: { totalBanks, totalChapters, createdChapters, boundChapters, skippedChapters }

### GET /subjects/:subjectId/chapters/:chapterId/questions
璇存槑: 鑾峰彇绉戠洰绔犺妭棰樼洰锛堣法棰樺簱鑱氬悎锛?鏌ヨ鍙傛暟: page, limit, questionNumber
鍝嶅簲 data: { questions | question, total, pagination }

### GET /subjects/:subjectId/chapters/progress
璇存槑: 鑾峰彇绉戠洰绔犺妭涓撻」杩涘害锛堟寜鐢ㄦ埛锛岄閲忎负璺ㄩ搴撹仛鍚堬級
鍝嶅簲 data: [ { subject_chapter_id, current_question_number, completed_count, total_questions, progress_percentage, chapter_name, display_name } ]

### POST /subjects/:subjectId/chapters/:chapterId/progress
璇存槑: 淇濆瓨绉戠洰绔犺妭涓撻」杩涘害锛堟寜鐢ㄦ埛锛岄閲忎负璺ㄩ搴撹仛鍚堬級
璇锋眰 body: { current_question_number, completed_count?, total_questions }
鍝嶅簲 data: { subject_chapter_id, current_question_number, completed_count, total_questions, progress_percentage }

### GET /subjects/:subjectId/random
璇存槑: 绉戠洰闅忔満缁冧範
鏌ヨ鍙傛暟: count (榛樿 10)
鍝嶅簲 data: { questions, total }

## 鍚庡彴棰樺簱閰嶇疆
### GET /admin/question-banks
璇存槑: 鑾峰彇棰樺簱鍒楄〃锛堢鐞嗗憳锛?鏌ヨ鍙傛暟: page, limit, subjectId
鍝嶅簲 data: { list: [], total, pagination }

### POST /admin/question-banks/import-json
璇存槑: 鏁村簱 JSON 瀵煎叆锛堢鐞嗗憳锛岄渶缁戝畾绉戠洰锛?璇锋眰: multipart/form-data
瀛楁: subjectId, name?, description?, file(.json)

### POST /admin/question-banks/:bankId/chapters/import-json
璇存槑: 鍗曠珷鑺?JSON 瀵煎叆锛堢鐞嗗憳锛?璇锋眰: multipart/form-data
瀛楁: subjectChapterId, file(.json)

### GET /admin/question-banks/:bankId/subject-chapters
璇存槑: 鏌ョ湅棰樺簱鍚勭鐩珷鑺傞閲忥紙绠＄悊鍛橈級
鍝嶅簲 data: { chapters: [] }

## 鐪熼缁冧範
### GET /real-exams
璇存槑: 鑾峰彇绉戠洰璇曞嵎鍒楄〃
鏌ヨ鍙傛暟: subjectId, page, limit
鍝嶅簲 data: { papers: [], total, pagination }

### GET /real-exams/:paperId/questions
璇存槑: 鑾峰彇璇曞嵎棰樼洰锛堟敮鎸侀€愰锛?鏌ヨ鍙傛暟: page, limit, questionNumber
鍝嶅簲 data: { questions | question, total, pagination }

### POST /real-exams/:paperId/attempts
璇存槑: 鎻愪氦绛旈缁熻涓庨敊棰?璇锋眰 body: { total_questions, correct_count, wrong_count, accuracy?, wrong_questions? }

### GET /real-exams/:paperId/wrong-questions
璇存槑: 鑾峰彇閿欓鍒楄〃

## 闈欐€佽祫婧?
### GET /question-banks/:bankId/images/<filename>
璇存槑: 璁块棶棰樺簱鍥剧墖璧勬簮锛堟棤闇€閴存潈锛?

## 鍋ュ悍妫€鏌?
### GET /health
璇存槑: 鏈嶅姟鍋ュ悍妫€鏌ワ紙鏃犻壌鏉冿級

## Markdown 解析中心（后台）
### GET /admin/markdown-files
说明: 列出 Markdown 文档
查询参数: page (默认 1), limit (默认 20, 最大 100), status (all|parsed|unparsed)
响应 data: { files: [], total, pagination }

### POST /admin/markdown-files
说明: 上传 Markdown 文档（multipart/form-data）
请求参数: file (.md), name, description (可选)
响应 data: 文档信息

### GET /admin/markdown-files/:id
说明: 获取 Markdown 文档详情
响应 data: 文档详情

### POST /admin/markdown-files/:id/parse
说明: 解析章节，仅当 H1 标题包含“第 X 章”时才拆分
响应 data: { chapter_count }

### GET /admin/markdown-files/:id/chapters
说明: 获取解析后章节列表
响应 data: { chapters: [], total }

### DELETE /admin/markdown-files/:id
说明: 删除 Markdown 文档，同时清理章节文件

## Markdown 静态资源
### GET /markdown-files/:fileId/source.md
说明: 获取原始 Markdown 文件（不需认证）

### GET /markdown-files/:fileId/chapters/:filename
说明: 下载某个解析后章节文件（不需认证）

### POST /question-banks/{bankId}/images
说明: 支持批量图片上传，也支持上传 zip 压缩包自动解压导入图片（非图片条目会跳过）
