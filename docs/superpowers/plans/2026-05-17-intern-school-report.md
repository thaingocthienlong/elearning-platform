# Intern School Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two full Word/PDF-ready academic report drafts, one English and one Vietnamese, based on the supplied school template and the existing secure streaming platform project evidence.

**Architecture:** Keep the deliverables as standalone Markdown files under `Bao-cao/`, with identical structure and equivalent content. Use the Word template rules as a formatting contract and repository documentation as the evidence base.

**Tech Stack:** Markdown, existing Word/PDF template files, Next.js/Prisma/Axinom/Shaka/Zoom project documentation.

---

### Task 1: Create Report Skeletons

**Files:**
- Create: `Bao-cao/report-en.md`
- Create: `Bao-cao/bao-cao-vi.md`

- [ ] **Step 1: Add the English skeleton**

Create `Bao-cao/report-en.md` with front matter, conversion notes, six chapters, references, and appendices.

- [ ] **Step 2: Add the Vietnamese skeleton**

Create `Bao-cao/bao-cao-vi.md` with the same structure translated into Vietnamese.

- [ ] **Step 3: Verify skeleton structure**

Run:

```powershell
Select-String -Path 'Bao-cao\report-en.md','Bao-cao\bao-cao-vi.md' -Pattern '^# |^## CHAPTER|^## CHƯƠNG|^## REFERENCES|^## TÀI LIỆU THAM KHẢO|^## APPENDICES|^## PHỤ LỤC'
```

Expected: both files show front matter, chapters 1-6, references, and appendices.

### Task 2: Fill Academic Content

**Files:**
- Modify: `Bao-cao/report-en.md`
- Modify: `Bao-cao/bao-cao-vi.md`

- [ ] **Step 1: Populate the English report**

Write the English version as a full academic draft centered on DRM and protected video playback, with broader platform engineering as supporting evidence.

- [ ] **Step 2: Populate the Vietnamese report**

Write the Vietnamese version with equivalent content, natural Vietnamese academic phrasing, and the original report title preserved.

- [ ] **Step 3: Verify required sections are present**

Run:

```powershell
Select-String -Path 'Bao-cao\report-en.md' -Pattern 'ACKNOWLEDGEMENTS','DECLARATION','ABSTRACT','CHAPTER 1','CHAPTER 2','CHAPTER 3','CHAPTER 4','CHAPTER 5','CHAPTER 6','REFERENCES','APPENDICES'
Select-String -Path 'Bao-cao\bao-cao-vi.md' -Pattern 'LỜI CẢM ƠN','LỜI CAM ĐOAN','TÓM TẮT','CHƯƠNG 1','CHƯƠNG 2','CHƯƠNG 3','CHƯƠNG 4','CHƯƠNG 5','CHƯƠNG 6','TÀI LIỆU THAM KHẢO','PHỤ LỤC'
```

Expected: all required headings are found.

### Task 3: Review Template Compliance

**Files:**
- Modify: `Bao-cao/report-en.md`
- Modify: `Bao-cao/bao-cao-vi.md`

- [ ] **Step 1: Search for unresolved placeholders**

Run:

```powershell
Select-String -Path 'Bao-cao\report-en.md','Bao-cao\bao-cao-vi.md' -Pattern 'TBD|TODO|Nguyễn Văn A|HỌ VÀ TÊN|TÊN ĐỀ TÀI|fill in|placeholder' -CaseSensitive:$false
```

Expected: no unresolved placeholder matches.

- [ ] **Step 2: Search for sensitive credential leakage**

Run:

```powershell
Select-String -Path 'Bao-cao\report-en.md','Bao-cao\bao-cao-vi.md' -Pattern 'sk-|secret value|private key|BEGIN PRIVATE KEY|DATABASE_URL=.*://|AXINOM.*=' -CaseSensitive:$false
```

Expected: no secret values or copied credential assignments.

- [ ] **Step 3: Check approximate length**

Run:

```powershell
(Get-Content -LiteralPath 'Bao-cao\report-en.md' | Measure-Object -Word).Words
(Get-Content -LiteralPath 'Bao-cao\bao-cao-vi.md' | Measure-Object -Word).Words
```

Expected: each report is long enough for a full report draft and covers all approved chapters.

### Task 4: Clean Temporary Artifacts

**Files:**
- Delete local generated temp directory: `.tmp-report-pages/`

- [ ] **Step 1: Remove the OCR/inspection temp folder created during analysis**

Run:

```powershell
Resolve-Path '.tmp-report-pages'
Remove-Item -LiteralPath '.tmp-report-pages' -Recurse -Force
```

Expected: only `.tmp-report-pages` is removed.

- [ ] **Step 2: Review final git status**

Run:

```powershell
git status --short --branch
```

Expected: new report files and planning files are visible; unrelated pre-existing untracked files remain untouched.
