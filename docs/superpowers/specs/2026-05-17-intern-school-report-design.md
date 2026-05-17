# Intern School Report Design

## Goal

Create two Word/PDF-ready academic report drafts for the internship submission:

- `Bao-cao/report-en.md`
- `Bao-cao/bao-cao-vi.md`

Both reports must follow the supplied Ton Duc Thang University template and preserve the original Vietnamese project title:

`TÌM HIỂU VỀ DIGITAL RIGHT MANAGEMENT VÀ XÂY DỰNG TÍNH NĂNG BẢO VỆ BẢN QUYỀN DỮ LIỆU CHO TÍNH NĂNG XEM VIDEO CỦA TRANG WEB HỌC TẬP`

## Source Of Truth

Report structure and formatting come from:

- `Bao-cao/TSNN_520H0553_ThaiNgocThienLong.docx`
- `Bao-cao/Quy dinh va huong dan cua Khoa-Truong/Template báo cáo.docx`
- `Bao-cao/Quy dinh va huong dan cua Khoa-Truong/Qui định trình bày Khoa luan TN, do an TN_fINAL_30.11.2020.docx`
- `Bao-cao/HUONG DAN BO SUNG - THAY MANH.pdf`
- `Bao-cao/Quy dinh va huong dan cua Khoa-Truong/QĐ.2284.2020_Trình bày khóa luận.pdf`

Project evidence comes from the repository README, `.planning` artifacts, and maintainer documentation under `docs/`.

## Required Metadata

- Student: `THÁI NGỌC THIÊN LONG - 520H0553`
- School: `TRƯỜNG ĐẠI HỌC TÔN ĐỨC THẮNG`
- Faculty: `KHOA CÔNG NGHỆ THÔNG TIN`
- Report type: `TẬP SỰ NGHỀ NGHIỆP`
- Major: `KỸ THUẬT PHẦN MỀM`
- Advisor: `ThS. Dương Hữu Phúc`
- Internship organization: `Viện Nghiên cứu Khoa học Giáo dục và Đào tạo (Viện IES)`
- Company guide: `chị Trần Thị Chi`
- Location/year: `THÀNH PHỐ HỒ CHÍ MINH, NĂM 2026`

## Formatting Contract

Markdown cannot encode every Word layout rule directly, so each report must include a short conversion note and use structure that maps cleanly into the Word template:

- Times New Roman, 13pt body text.
- 1.5 line spacing.
- Justified paragraphs.
- A4 portrait.
- Margins matching the supplied student template: top 3.5cm, bottom 3cm, left 3.5cm, right 2cm.
- Page numbers centered at the top.
- New page before each major front-matter section and chapter.
- Table of contents limited to three heading levels.
- Figures and tables use numbered captions and are referenced in surrounding text.
- Avoid source-code dumps in the main report.
- Use APA-style reference entries.

## Report Structure

Each language version will contain:

1. Main cover.
2. Sub-cover.
3. Acknowledgements.
4. Advisor evaluation sheet.
5. Declaration.
6. Title and abstract.
7. Table of contents placeholder.
8. List of figures.
9. List of tables.
10. Abbreviations.
11. Chapter 1: Introduction.
12. Chapter 2: Overview.
13. Chapter 3: Theoretical Background.
14. Chapter 4: System Analysis and Design.
15. Chapter 5: Implementation and Evaluation.
16. Chapter 6: Conclusion.
17. References.
18. Appendices.

## Content Direction

DRM and protected video playback are the central topic. Broader platform work is included only where it supports the protected-video system: authentication, entitlement, Axinom integration, Shaka playback, Zoom meeting preservation, MongoDB/Prisma data design, Redis support services, testing, staging readiness, and maintainer operations.

The English and Vietnamese files should be content-equivalent, but not line-by-line literal translations where natural academic phrasing differs.

## Self-Review

- No template placeholders such as `Nguyễn Văn A` remain except in historical rule citations.
- No secret values, real environment variable values, keys, certificates, or private credentials are included.
- Claims are grounded in repository documents or cited vendor documentation.
- Chapter scope matches the approved design and the template title.
