# TỔNG LIÊN ĐOÀN LAO ĐỘNG VIỆT NAM
# TRƯỜNG ĐẠI HỌC TÔN ĐỨC THẮNG
# KHOA CÔNG NGHỆ THÔNG TIN

**THÁI NGỌC THIÊN LONG - 520H0553**

# TÌM HIỂU VỀ DIGITAL RIGHT MANAGEMENT VÀ XÂY DỰNG TÍNH NĂNG BẢO VỆ BẢN QUYỀN DỮ LIỆU CHO TÍNH NĂNG XEM VIDEO CỦA TRANG WEB HỌC TẬP

**TẬP SỰ NGHỀ NGHIỆP**

**KỸ THUẬT PHẦN MỀM**

**THÀNH PHỐ HỒ CHÍ MINH, NĂM 2026**

---

# TỔNG LIÊN ĐOÀN LAO ĐỘNG VIỆT NAM
# TRƯỜNG ĐẠI HỌC TÔN ĐỨC THẮNG
# KHOA CÔNG NGHỆ THÔNG TIN

**THÁI NGỌC THIÊN LONG - 520H0553**

# TÌM HIỂU VỀ DIGITAL RIGHT MANAGEMENT VÀ XÂY DỰNG TÍNH NĂNG BẢO VỆ BẢN QUYỀN DỮ LIỆU CHO TÍNH NĂNG XEM VIDEO CỦA TRANG WEB HỌC TẬP

**TẬP SỰ NGHỀ NGHIỆP**

**KỸ THUẬT PHẦN MỀM**

Người hướng dẫn

**ThS. Dương Hữu Phúc**

**THÀNH PHỐ HỒ CHÍ MINH, NĂM 2026**

---

## GHI CHÚ ĐỊNH DẠNG KHI XUẤT WORD/PDF

Tập tin Markdown này được soạn để chuyển sang mẫu Microsoft Word do Khoa cung cấp. Khi dàn trang trong Word hoặc xuất PDF, sử dụng Times New Roman cỡ 13 cho nội dung chính, giãn dòng 1.5, căn đều hai lề, giấy A4 chiều dọc, lề trên 3.5cm, lề dưới 3cm, lề trái 3.5cm, lề phải 2cm, số trang ở giữa phía trên. Mỗi phần đầu báo cáo và mỗi chương cần bắt đầu ở trang mới. Mục lục tự động nên giới hạn tối đa ba cấp tiêu đề.

---

## LỜI CẢM ƠN

Trong thời gian thực hiện tập sự nghề nghiệp, em đã nhận được sự hướng dẫn và hỗ trợ quý báu từ giảng viên hướng dẫn ThS. Dương Hữu Phúc. Em xin gửi lời cảm ơn chân thành đến thầy vì đã định hướng nội dung học thuật của báo cáo, hỗ trợ các thủ tục cần thiết trong quá trình thực tập, đồng thời giúp em xác định phạm vi kỹ thuật của đề tài để hoàn thiện thành một kết quả học tập rõ ràng.

Em cũng xin chân thành cảm ơn Viện Nghiên cứu Khoa học Giáo dục và Đào tạo (Viện IES) đã tạo điều kiện cho em được tham gia vào một môi trường phần mềm thực tế. Đặc biệt, em xin cảm ơn chị Trần Thị Chi, cán bộ hướng dẫn tại đơn vị thực tập, đã hỗ trợ em trong quá trình làm việc, giải đáp các vấn đề liên quan đến dự án và giúp em hiểu hơn về yêu cầu thực tế khi duy trì một nền tảng học tập trực tuyến. Qua quá trình thực tập, em nhận ra rằng một ứng dụng web hoạt động tốt không chỉ bao gồm giao diện người dùng, mà còn cần các quy tắc bảo mật, ràng buộc triển khai, tài liệu vận hành và quy trình kiểm chứng đáng tin cậy.

Em xin chân thành cảm ơn Nhà trường, Khoa, giảng viên hướng dẫn và đơn vị thực tập đã tạo điều kiện để em hoàn thành báo cáo tập sự nghề nghiệp này.

TP. Hồ Chí Minh, ngày 20 tháng 4 năm 2026

Tác giả

THÁI NGỌC THIÊN LONG

---

## PHIẾU ĐÁNH GIÁ CỦA GIẢNG VIÊN HƯỚNG DẪN

Tên giảng viên hướng dẫn: ThS. Dương Hữu Phúc.

Ý kiến nhận xét:

Điểm tổng theo phiếu đánh giá rubrik:

TP. Hồ Chí Minh, ngày 20 tháng 4 năm 2026

Giảng viên hướng dẫn

---

## LỜI CAM ĐOAN

Công trình này được hoàn thành tại Trường Đại học Tôn Đức Thắng dưới sự hướng dẫn khoa học của ThS. Dương Hữu Phúc. Em xin cam đoan nội dung trong báo cáo tập sự nghề nghiệp này được xây dựng dựa trên quá trình tìm hiểu, thực hiện, phân tích và tổng hợp tài liệu dự án của bản thân. Các kết quả được trình bày trong báo cáo là trung thực và chưa được nộp dưới cùng hình thức cho một đánh giá học thuật khác.

Báo cáo có sử dụng tài liệu kỹ thuật, tài liệu của nhà cung cấp và các tài liệu nội bộ của dự án làm cơ sở tham khảo. Tất cả nguồn bên ngoài dùng để giải thích, so sánh hoặc trình bày nền tảng lý thuyết đều được liệt kê trong phần tài liệu tham khảo. Em chịu trách nhiệm về tính liêm chính học thuật, việc trích dẫn nguồn và các nhận định kỹ thuật trong báo cáo này.

TP. Hồ Chí Minh, ngày 20 tháng 4 năm 2026

Tác giả

THÁI NGỌC THIÊN LONG

---

# TÌM HIỂU VỀ DIGITAL RIGHT MANAGEMENT VÀ XÂY DỰNG TÍNH NĂNG BẢO VỆ BẢN QUYỀN DỮ LIỆU CHO TÍNH NĂNG XEM VIDEO CỦA TRANG WEB HỌC TẬP

## TÓM TẮT

Các hệ thống học tập trực tuyến ngày càng phụ thuộc vào video để truyền tải nội dung học tập. Tuy nhiên, các phương thức phát video thông thường không đủ đáp ứng yêu cầu bảo vệ nội dung khi bài giảng cần được kiểm soát quyền truy cập, hạn chế chia sẻ trái phép và duy trì khả năng vận hành lâu dài. Báo cáo này trình bày quá trình tìm hiểu và xây dựng tính năng xem video có bảo vệ cho một nền tảng học tập trực tuyến, trong đó Digital Rights Management (DRM) là nội dung trọng tâm.

Dự án được thực hiện trên một nền tảng học tập và phát video bảo mật đã có sẵn nhưng cần được ổn định, tài liệu hóa, rà soát bảo mật và làm rõ quy trình bảo trì. Nền tảng sử dụng Next.js App Router, NextAuth, Prisma với MongoDB, Shaka Player, Axinom DRM, Zoom Meeting SDK, Upstash Redis, Azure Blob Storage, Cloudflare R2 hoặc lưu trữ tương thích S3, Sentry và định hướng triển khai trên Vercel. Mục tiêu kỹ thuật chính là làm cho luồng xem video được bảo vệ trở nên đáng tin cậy và dễ bảo trì bằng cách liên kết xác thực, phân quyền, cấp token DRM, kiểm soát playlist HLS, watermark, kiểm thử và tài liệu triển khai staging.

Báo cáo trình bày các khái niệm về DRM, phát nội dung có bảo vệ, cơ chế ký Axinom License Service Message, cách Shaka Player gửi yêu cầu license và kiến trúc ứng dụng hỗ trợ. Sau đó, báo cáo phân tích thiết kế hệ thống, bao gồm xác thực người dùng, phân quyền truy cập media, mô hình dữ liệu, tích hợp trình phát, phụ thuộc dịch vụ bên ngoài và tiêu chí nghiệm thu staging. Phần thực hiện tập trung vào việc tập trung hóa quy tắc media entitlement, xác thực cấu hình Axinom, bảo toàn luồng tham gia Zoom an toàn, tối ưu hiệu năng Prisma/MongoDB, tài liệu hóa biến môi trường và xây dựng các lệnh kiểm chứng cùng danh sách smoke test.

Kết quả đạt được là một nền tảng phát video bảo mật ở mức sẵn sàng staging. Báo cáo cũng chỉ ra các hạng mục cần tiếp tục trước khi đưa vào sản xuất, bao gồm xoay vòng thông tin xác thực, điều phối xử lý video bền vững, diễn tập sao lưu và khôi phục, quy trình phản ứng sự cố và kiểm thử tải. Dự án cho thấy DRM không phải là một thư viện hoặc một cấu hình riêng lẻ, mà là một hệ thống phối hợp giữa phân quyền phía server, kiểm soát license, lưu trữ được bảo vệ, tích hợp trình phát, bằng chứng kiểm chứng và kỷ luật vận hành.

Từ khóa: Digital Rights Management, DRM, học tập trực tuyến, phát video bảo mật, Axinom, Shaka Player, Next.js, phân quyền media.

---

## MỤC LỤC

Tạo mục lục tự động trong Microsoft Word sau khi áp dụng mẫu báo cáo của Khoa.

---

## DANH MỤC HÌNH VẼ

Hình 2.1. Tổng quan nền tảng học tập trực tuyến có bảo vệ.

Hình 3.1. Luồng yêu cầu DRM license.

Hình 4.1. Kiến trúc phân lớp của nền tảng phát video bảo mật.

Hình 4.2. Trình tự xem video được bảo vệ.

Hình 4.3. Trình tự truy cập cuộc họp Zoom.

Hình 5.1. Luồng kiểm chứng staging và smoke test.

---

## DANH MỤC BẢNG BIỂU

Bảng 2.1. Các công nghệ chính và trách nhiệm trong nền tảng.

Bảng 3.1. So sánh phát video thông thường và phát video có DRM.

Bảng 4.1. Các thực thể dữ liệu cốt lõi.

Bảng 4.2. Các nhóm cấu hình dịch vụ bên ngoài.

Bảng 5.1. Các lệnh kiểm chứng.

Bảng 5.2. Tóm tắt backlog hardening cho production.

---

## DANH MỤC CÁC CHỮ VIẾT TẮT

| Chữ viết tắt | Ý nghĩa |
|---|---|
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| CORS | Cross-Origin Resource Sharing |
| DRM | Digital Rights Management |
| HLS | HTTP Live Streaming |
| JWT | JSON Web Token |
| LSM | License Service Message |
| SDK | Software Development Kit |
| UI | User Interface |
| VOD | Video on Demand |

---

## CHƯƠNG 1. MỞ ĐẦU

### 1.1 Lý do chọn đề tài

Các nền tảng học tập trực tuyến thường sử dụng video làm phương tiện chính để truyền tải kiến thức. So với tài liệu văn bản hoặc slide tĩnh, video bài giảng tốn nhiều chi phí sản xuất hơn và khó bảo vệ hơn sau khi phân phối. Một website thông thường có thể lưu trữ và hiển thị video, nhưng điều đó không đồng nghĩa với việc nội dung trí tuệ của đơn vị đào tạo được bảo vệ. Nếu đường dẫn video được truy cập công khai, người học có thể chia sẻ nội dung ra ngoài hệ thống. Nếu hệ thống chỉ kiểm tra quyền ở trang xem video, người dùng vẫn có thể thử truy cập trực tiếp playlist hoặc các segment media. Nếu nền tảng chỉ dựa vào cơ chế phía client, khả năng bảo vệ sẽ yếu vì mã chạy trên trình duyệt nằm trong môi trường do người dùng kiểm soát.

Vì vậy, Digital Rights Management là một chủ đề quan trọng trong môi trường học tập trực tuyến. DRM cung cấp cơ chế kỹ thuật để mã hóa nội dung và chỉ cấp license cho client hợp lệ. Tuy nhiên, DRM không thể giải quyết toàn bộ vấn đề nếu đứng riêng lẻ. Một tính năng xem video có bảo vệ hoàn chỉnh còn cần xác thực, phân quyền người dùng, quy tắc media entitlement, cấp license token, kiểm soát truy cập lưu trữ, cấu hình trình phát, watermark, ghi log và tài liệu vận hành. Do đó, đề tài tập sự nghề nghiệp này không chỉ dừng ở việc tìm hiểu DRM, mà còn áp dụng DRM vào một ứng dụng web thực tế.

Dự án sử dụng một nền tảng học tập và phát video bảo mật có sẵn làm bối cảnh thực hành. Nền tảng đã có các thành phần quan trọng như trang khóa học, trang xem video, giao diện quản trị, luồng họp Zoom, module Axinom, Shaka Player, MongoDB, Redis, helper lưu trữ và cấu hình triển khai. Tuy nhiên, hệ thống cần tài liệu cài đặt rõ ràng hơn, hành vi bảo mật nhất quán hơn, kiểm chứng staging có cấu trúc hơn và phần giải thích dễ bảo trì hơn về cách DRM liên kết với các luồng còn lại. Vì vậy, đề tài phù hợp với báo cáo tập sự nghề nghiệp vì kết hợp nghiên cứu, kỹ thuật phần mềm, phân tích bảo mật và thực hiện thực tế.

### 1.2 Mục tiêu thực hiện đề tài

Mục tiêu chính của báo cáo là tìm hiểu Digital Rights Management và áp dụng vào tính năng xem video được bảo vệ trong website học tập trực tuyến. Mục tiêu kỹ thuật là mô tả và cải thiện một hệ thống trong đó chỉ người học hợp lệ mới có thể mở trang xem video, yêu cầu DRM entitlement token, tải media manifest và nhận DRM license thông qua luồng chính thức của nhà cung cấp.

Đề tài có một số mục tiêu hỗ trợ. Thứ nhất, báo cáo cần làm rõ kiến trúc nền tảng để người bảo trì hiểu cách Next.js pages, API routes, Prisma models, dịch vụ bên ngoài, player hooks và workflow quản trị tương tác với nhau. Thứ hai, hệ thống cần tập trung hóa phân quyền media để trang xem video, route cấp DRM token, route playlist HLS, route license cục bộ và route heartbeat cùng dùng một quyết định truy cập. Thứ ba, dự án cần tài liệu hóa thiết lập Axinom theo các khái niệm chính thức như communication key, License Service Message, license service URL, encoding profile và webhook. Thứ tư, dự án cần bảo toàn luồng họp Zoom nhưng đảm bảo chữ ký được tạo ở server và người học không thể tự tạo chữ ký với vai trò host. Thứ năm, dự án cần thiết lập các lệnh kiểm chứng, smoke test staging, tài liệu biến môi trường và quy tắc vệ sinh thông tin nhạy cảm.

Mục tiêu cuối cùng không phải là tuyên bố hệ thống đã đủ điều kiện production. Thay vào đó, dự án hướng đến một baseline sẵn sàng staging, có thể được cài đặt, cấu hình, kiểm chứng và phát triển tiếp bởi người bảo trì mà không phụ thuộc vào kinh nghiệm truyền miệng.

### 1.3 Đối tượng và phạm vi nghiên cứu

Đối tượng nghiên cứu là tính năng xem video có bảo vệ trong một nền tảng học tập trực tuyến. Tính năng này bao gồm xác thực người dùng, truy cập khóa học, truy cập trực tiếp video, cấp DRM token, phát video bằng Shaka Player, yêu cầu Axinom license, bảo vệ playlist HLS, watermark, ghi nhận quá trình xem và các kiểm tra vận hành liên quan.

Phạm vi dự án bao gồm ứng dụng Next.js hiện tại và các tích hợp đã được tài liệu hóa: Prisma với MongoDB, NextAuth với Google OAuth, Axinom DRM và Encoding, Shaka Player, Zoom Meeting SDK, Upstash Redis, Azure Blob Storage, Cloudflare R2 hoặc lưu trữ tương thích S3, Sentry và triển khai theo hướng Vercel. Báo cáo cũng bao gồm các phần hỗ trợ như tài liệu cài đặt, ma trận biến môi trường, kiểm thử, checklist smoke staging, ghi chú hiệu năng database và backlog hardening production.

Đề tài không thay thế Axinom DRM bằng nhà cung cấp khác, không thay Zoom bằng hệ thống họp khác, không chuyển đổi database khỏi MongoDB và không khẳng định rằng các cơ chế chống ghi màn hình phía client có thể ngăn chặn tuyệt đối việc ghi lại nội dung. Những nội dung này nằm ngoài phạm vi hoặc chỉ được xem xét trong tương lai khi có bằng chứng kỹ thuật cần thiết.

### 1.4 Phương pháp nghiên cứu

Phương pháp thực hiện báo cáo kết hợp nghiên cứu tài liệu, phân tích kiến trúc, rà soát thực hiện và lập kế hoạch kiểm chứng. Phần lý thuyết dựa trên khái niệm DRM, tài liệu của nhà cung cấp và nguyên tắc bảo mật ứng dụng web. Phần thực tế dựa trên tài liệu dự án hiện có, bao gồm cấu trúc source code, tài liệu maintainer, ma trận biến môi trường, runbook staging, hướng dẫn Axinom, runbook Zoom, ghi chú hiệu năng database và tài liệu vận hành.

Cách tiếp cận thực hiện tuân theo nguyên tắc ổn định trước. Thay vì ưu tiên thiết kế lại giao diện ngay từ đầu, dự án trước hết làm rõ cài đặt, cấu hình, kiểm thử và hành vi bảo mật. Sau đó, dự án xử lý các luồng quan trọng như media entitlement, cấp DRM token, truy cập HLS, bảo vệ ticket hỗ trợ, cấu hình Axinom, quy tắc chữ ký Zoom, hiệu năng database, staging và vận hành. Cách tiếp cận này phù hợp với dự án brownfield vì rủi ro chính không chỉ là thiếu tính năng, mà còn là hành vi chưa rõ ràng giữa các module đã tồn tại.

### 1.5 Ý nghĩa thực tiễn của đề tài

Ý nghĩa thực tiễn của đề tài là biến yêu cầu xem video có bảo vệ từ một khái niệm chung thành một thiết kế hệ thống cụ thể. Đối với người học, nền tảng cần cung cấp trải nghiệm xem khóa học bình thường trong khi vẫn kiểm soát quyền truy cập ở phía sau. Đối với quản trị viên, nền tảng cần hỗ trợ quản lý khóa học, video, người dùng, ticket và security event mà không làm lộ thông tin nhạy cảm hoặc làm yếu bảo vệ media. Đối với người bảo trì, nền tảng cần có tài liệu cài đặt, phân loại biến môi trường, lệnh kiểm chứng, smoke test staging và hướng dẫn nâng cấp.

Đề tài cũng có ý nghĩa học thuật. Nó cho thấy DRM chỉ là một lớp trong hệ thống phát video bảo mật. Một nền tảng học tập có bảo vệ cần kết hợp nhiều lớp kiểm soát: media entitlement phía server, media mã hóa, license do nhà cung cấp cấp, thông điệp ký ngắn hạn, kiểm soát truy cập lưu trữ, rate limit, audit event, watermark và kỷ luật vận hành. Hiểu mô hình nhiều lớp này giúp sinh viên kỹ thuật phần mềm tiếp cận hệ thống thực tế một cách có trách nhiệm hơn.

---

## CHƯƠNG 2. TỔNG QUAN

### 2.1 Bối cảnh nền tảng học tập trực tuyến

Nền tảng được nghiên cứu trong báo cáo là một hệ thống học tập và phát video bảo mật. Mục đích chính của hệ thống là cung cấp quyền truy cập đã xác thực vào nội dung học tập, đặc biệt là các bài giảng video cần được bảo vệ. Hệ thống bao gồm duyệt khóa học, phát video, quản trị, ticket hỗ trợ, truy cập Zoom meeting, analytics, watermark, kiểm soát session và tích hợp với nhiều dịch vụ bên ngoài.

Ở góc nhìn người dùng, nền tảng là một website học tập. Người học đăng nhập, mở khóa học, chọn bài học, xem video, có thể tham gia buổi họp hoặc gửi yêu cầu hỗ trợ. Ở góc nhìn người bảo trì, nền tảng phức tạp hơn nhiều. Hệ thống phụ thuộc vào database để lưu người dùng, khóa học, video, session, enrollment, watch record, ticket hỗ trợ, DRM session và security event. Hệ thống cũng phụ thuộc vào dịch vụ ngoài cho OAuth, Redis, DRM, storage, meeting, email, error tracking và deployment.

Vì vậy, dự án không thể được đánh giá chỉ bằng giao diện. Chất lượng cốt lõi của nền tảng nằm ở khả năng thực thi quyền truy cập, bảo vệ nội dung video, giữ secret khỏi phía client và duy trì khả năng triển khai bởi người bảo trì. Đây là lý do báo cáo tập trung vào phát video có bảo vệ như một hệ thống, không chỉ như một component media player.

### 2.2 Các công nghệ chính của nền tảng

Nền tảng được xây dựng bằng Next.js App Router và React. Các page render phía server và API route handler được đặt theo cấu trúc route của ứng dụng. Xác thực sử dụng NextAuth với Google OAuth và database session. Prisma được dùng làm lớp truy cập dữ liệu, với datasource hiện tại là MongoDB. Trình phát video sử dụng Shaka Player cho DASH/HLS và tích hợp DRM license. Axinom cung cấp DRM và năng lực video service. Zoom Meeting SDK được dùng cho họp trực tuyến. Upstash Redis hỗ trợ cache, rate limit, system mode và kiểm tra session revocation. Azure Blob Storage và Cloudflare R2 hoặc lưu trữ tương thích S3 hỗ trợ input, output và asset phát video. Vercel là nền tảng triển khai được định hướng.

**Bảng 2.1. Các công nghệ chính và trách nhiệm trong nền tảng**

| Công nghệ | Trách nhiệm trong dự án |
|---|---|
| Next.js App Router | Render page, layout, protected route và API handler |
| NextAuth | Đăng nhập Google OAuth, session và whitelist |
| Prisma với MongoDB | Mô hình dữ liệu và lưu trữ người dùng, khóa học, video, record, ticket |
| Shaka Player | Phát DASH/HLS trên trình duyệt và gửi yêu cầu DRM license |
| Axinom DRM | Kiểm tra License Service Message và cấp DRM license |
| Zoom Meeting SDK | Trải nghiệm tham gia meeting có xác thực |
| Upstash Redis | Cache, rate limit, system mode và revocation |
| Azure Blob Storage | Lưu trữ video nguồn và video đã encode |
| Cloudflare R2/S3 | Lưu object phát video và HLS asset |
| Sentry và Vercel logs | Theo dõi lỗi và bằng chứng triển khai |

Sự kết hợp này phù hợp với một ứng dụng web hiện đại có nhiều dịch vụ quản lý. Ưu điểm là nền tảng có thể tận dụng nhà cung cấp chuyên biệt cho xác thực, DRM, storage và meeting. Nhược điểm là người bảo trì phải hiểu cấu hình, secret, callback, webhook và giới hạn dịch vụ của nhiều hệ thống khác nhau.

### 2.3 Vấn đề phát video có bảo vệ

Trong hệ thống phát video đơn giản, server có thể lưu file video và trả về cho trình duyệt thông qua URL công khai. Cách làm này dễ triển khai nhưng không đáp ứng yêu cầu của nền tảng học thuật có nội dung cần bảo vệ. Nếu URL bị sao chép, nội dung có thể bị truy cập ngoài khóa học. Nếu chỉ trang xem video được bảo vệ, người dùng có thể thử bỏ qua trang và truy cập trực tiếp playlist media. Nếu video không được mã hóa, bất kỳ ai có file đều có thể phát.

Phát video có DRM thay đổi mô hình này. Nội dung video được mã hóa. Trình phát không thể giải mã và phát nội dung nếu không nhận được license từ DRM license service. License service chỉ cấp license khi nhận được entitlement message hợp lệ do server tin cậy ký. Trong nền tảng được nghiên cứu, backend kiểm tra media entitlement của người dùng, ký Axinom License Service Message ngắn hạn và trả token cho trình phát. Shaka Player gắn token này vào yêu cầu DRM license. Nếu người dùng không có quyền, token không được cấp và playback không thể tiếp tục.

Điểm quan trọng là hệ thống phải kiểm soát truy cập ở nhiều nơi: trang xem, route cấp token, license request, route playlist và truy cập storage. Nếu chỉ một điểm được bảo vệ, người dùng có thể thử đi đường khác.

### 2.4 Trạng thái dự án trước khi ổn định

Dự án là một hệ thống brownfield, nghĩa là đã có nhiều chức năng trước khi thực hiện tập sự. Hệ thống đã có trang khóa học, trang xem video, giao diện quản trị, luồng Zoom, module Axinom, Shaka playback, helper Redis, helper storage và cấu hình deployment. Tuy nhiên, hệ thống cũng có vấn đề lệch tài liệu, logic phân quyền chưa nhất quán, giả định cài đặt chưa rõ, đường kiểm chứng chưa đầy đủ và rủi ro vệ sinh secret.

Một ví dụ về lệch tài liệu là mô tả database. Tài liệu cũ đề cập PostgreSQL, trong khi Prisma schema hiện tại sử dụng MongoDB. Sự khác biệt này quan trọng vì lệnh cài đặt, kỳ vọng triển khai, index và kế hoạch migration khác nhau giữa các provider. Một ví dụ khác là sự lệch giữa các route media authorization. Nếu trang xem video, route cấp DRM token, route playlist HLS, route license cục bộ và route heartbeat tự triển khai logic truy cập riêng, các thay đổi sau này có thể tạo ra lỗ hổng bảo mật.

Do đó, công việc ổn định tập trung vào việc làm cho dự án cài đặt được, có tài liệu, bảo mật hơn, kiểm thử được và sẵn sàng staging trước khi mở rộng thay đổi sản phẩm. Thứ tự này quan trọng vì giao diện đẹp hơn không có nhiều giá trị nếu người phát triển sau không thể cài đặt, kiểm chứng hoặc hiểu ranh giới bảo mật của hệ thống.

### 2.5 Tổng quan hệ thống

**Hình 2.1. Tổng quan nền tảng học tập trực tuyến có bảo vệ**

```text
Trình duyệt người học/quản trị viên
        |
        v
Next.js App Router Pages và Layouts
        |
        v
API Routes và Middleware
        |
        v
Service Layer: Auth, Entitlement, DRM, Zoom, Storage, Redis
        |
        v
MongoDB, Axinom, Storage, Zoom, OAuth, Redis, Sentry, Vercel
```

Lớp trên cùng là giao diện người dùng: trang khóa học, trang xem video, trang meeting, form hỗ trợ và màn hình quản trị. Lớp tiếp theo gồm route handler và middleware để xác thực session, thực thi quyền truy cập, nhận webhook, tạo chữ ký và trả dữ liệu cho trình duyệt. Service layer tập trung logic tái sử dụng cho authentication, entitlement, DRM, storage, Redis và API bên ngoài. Lớp cuối cùng là dữ liệu bền vững và các nhà cung cấp dịch vụ.

Cách nhìn phân lớp giúp tách trách nhiệm rõ ràng. Giao diện không nên chứa secret. API route phải xác thực danh tính và gọi service helper. Service helper phải đóng gói quy tắc provider. Dịch vụ bên ngoài phải được cấu hình bằng biến môi trường có tài liệu. Khi các trách nhiệm này được tôn trọng, hệ thống dễ kiểm thử và bảo trì hơn.

---

## CHƯƠNG 3. CƠ SỞ LÝ THUYẾT

### 3.1 Digital Rights Management

Digital Rights Management là tập hợp các công nghệ và quy trình dùng để kiểm soát quyền truy cập vào nội dung số. Trong bối cảnh phát video, DRM thường có nghĩa là media được mã hóa và khóa giải mã không được truyền trực tiếp dưới dạng giá trị rõ. Thay vào đó, trình phát yêu cầu license service cấp quyền phát nội dung. License service quyết định có cấp license hay không dựa trên entitlement message hoặc tín hiệu phân quyền đáng tin cậy khác.

DRM không có nghĩa là nội dung không bao giờ bị ghi lại hoặc sao chép. Bất kỳ nội dung nào hiển thị trên màn hình người dùng về mặt lý thuyết đều có thể bị ghi lại bằng thiết bị khác. Vì vậy, DRM nên được hiểu là một lớp mã hóa và kiểm soát truy cập mạnh, không phải là cam kết tuyệt đối chống mọi hình thức sao chép. Một nền tảng học tập có bảo vệ cần kết hợp DRM với phân quyền phía server, watermark, logging, kiểm soát session và chính sách vận hành rõ ràng.

Trong dự án này, DRM bảo vệ video bài giảng bằng cách đảm bảo nội dung mã hóa chỉ được phát khi backend đã xác thực quyền của người học và cấp token hợp lệ. Backend không đưa communication key secret cho trình duyệt. Trình duyệt chỉ nhận entitlement token ngắn hạn và dùng token đó khi liên hệ Axinom license service thông qua Shaka Player.

### 3.2 Phát video thông thường và phát video có DRM

**Bảng 3.1. So sánh phát video thông thường và phát video có DRM**

| Tiêu chí | Phát video thông thường | Phát video có DRM |
|---|---|---|
| Bảo vệ file media | Thường là media rõ hoặc chỉ bảo vệ URL yếu | Media được mã hóa |
| Điểm kiểm soát truy cập | Thường ở page route hoặc signed URL | Page, token route, license service và storage path |
| Yêu cầu phía client | HTML video hoặc player thông thường | Trình duyệt/player hỗ trợ DRM |
| Rủi ro chia sẻ URL | Cao hơn nếu URL dùng lại được | Thấp hơn vì vẫn cần license |
| Phụ thuộc nhà cung cấp | Thấp hơn | Cao hơn vì cần license service |
| Độ phức tạp vận hành | Thấp hơn | Cao hơn vì có key, profile, token và kiểm thử |

Bảng trên cho thấy DRM cải thiện khả năng kiểm soát playback nhưng cũng làm tăng độ phức tạp hệ thống. Lập trình viên phải quản lý encryption profile, license URL, key ID, token signing, player request filter, provider webhook và khả năng tương thích trình duyệt. Vì vậy, tích hợp DRM cần được tài liệu hóa kỹ và kiểm chứng qua staging trước khi dùng production.

### 3.3 Mô hình Axinom License Service Message

Axinom DRM sử dụng mô hình License Service Message. Server ứng dụng tạo một thông điệp đã ký để cho Axinom License Service biết content key nào và ràng buộc license nào được phép. Thông điệp chứa communication key identifier và entitlement message. Communication key value được dùng ở server để ký JWT. Vì communication key secret có quyền cấp license, nó tuyệt đối không được lộ ra browser hoặc log.

Trong nền tảng được nghiên cứu, License Service Message chỉ được tạo sau khi server kiểm tra media entitlement của người dùng hiện tại. Entitlement message được giới hạn theo video và key ID được phép. Token có thời hạn ngắn để tránh việc token cũ bị tái sử dụng lâu dài. Mô hình này tuân thủ nguyên tắc đặc quyền tối thiểu: người học chỉ nhận đúng quyền cần thiết cho phiên playback đang yêu cầu.

### 3.4 Shaka Player và yêu cầu license

Shaka Player là thư viện trình phát media trên trình duyệt hỗ trợ DASH, HLS và cấu hình DRM. Trong dự án này, Shaka Player tải media manifest và liên lạc với DRM license service. Quy tắc bảo mật quan trọng là Axinom entitlement token chỉ được gửi với yêu cầu license, không gửi kèm các segment media thông thường hoặc request không liên quan.

**Hình 3.1. Luồng yêu cầu DRM license**

```text
Người dùng mở trang xem video
        |
Server kiểm tra session và media entitlement
        |
Server ký Axinom License Service Message
        |
Trình duyệt khởi tạo Shaka Player
        |
Shaka gửi yêu cầu license kèm entitlement token
        |
Axinom License Service trả về license
        |
Video mã hóa được giải mã và phát
```

Luồng này cho thấy trách nhiệm của cả server và client đều quan trọng. Server quyết định người dùng có được nhận token hay không. Client cấu hình player để token được gắn đúng vào yêu cầu license. Nếu một trong hai phần sai, playback có thể thất bại hoặc bảo mật bị suy yếu.

### 3.5 Xác thực và phân quyền

Xác thực trả lời câu hỏi: người dùng là ai? Phân quyền trả lời câu hỏi: người dùng này được phép làm gì? Dự án sử dụng NextAuth với Google OAuth để xác thực người dùng. Nền tảng cũng dùng mô hình whitelist để chỉ người dùng được phép mới có thể vào các workflow học tập được bảo vệ.

Phân quyền media cụ thể hơn đăng nhập chung. Một người dùng đã đăng nhập không tự động có quyền xem mọi khóa học hoặc video. Hệ thống phải kiểm tra khóa học có mở không, người dùng có enrollment không, có quyền truy cập trực tiếp vào video không, video đã publish chưa, video có bị xóa không, access window còn hiệu lực không và view limit có bị vượt không. Vì các quy tắc này ảnh hưởng trực tiếp đến bảo mật, chúng cần được tập trung trong helper server-only thay vì sao chép ở nhiều route.

### 3.6 Lưu trữ, webhook và ràng buộc triển khai

Phát video có bảo vệ còn phụ thuộc vào storage và deployment. Video nguồn có thể nằm ở Azure Blob Storage để encode. Output đã encode có thể nằm ở R2 hoặc storage tương thích S3 để phát. Axinom webhook thông báo khi trạng thái encode hoặc video processing thay đổi. Triển khai trên Vercel tạo ra các giới hạn serverless, phạm vi biến môi trường và yêu cầu callback URL.

Những chi tiết hạ tầng này ảnh hưởng trực tiếp đến thiết kế. Xử lý video kéo dài không nên được xem như một request HTTP thông thường trong production. Biến môi trường cần tách thành public config và server secret. Callback URL cho Google OAuth, Axinom webhook, Zoom domain setting, storage CORS và Sentry phải khớp với origin staging hoặc production. Do đó, tài liệu vận hành là một phần cần thiết của phần mềm.

---

## CHƯƠNG 4. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 4.1 Phân tích yêu cầu

Yêu cầu chức năng cốt lõi là người học hợp lệ có thể xem video khóa học được bảo vệ, trong khi người không có quyền không thể truy cập cùng nội dung bằng cách bỏ qua trang hiển thị. Yêu cầu này được tách thành nhiều yêu cầu nhỏ hơn. Người học phải đăng nhập, mở khóa học được phép, chọn video, tải trang xem, khởi tạo player, nhận DRM token chỉ khi có quyền và tiếp tục playback trong khi hệ thống ghi heartbeat hoặc tiến độ xem. Hệ thống cũng phải từ chối các request không hợp lệ một cách nhất quán.

Yêu cầu phi chức năng cũng quan trọng không kém. Dự án phải cài đặt được từ clean checkout, có Node và npm version rõ ràng, tạo Prisma client đáng tin cậy và có tài liệu biến môi trường. Hệ thống phải tránh lộ secret trong ví dụ, log, diagnostics hỗ trợ và bằng chứng staging. Hệ thống cần test hoặc lệnh kiểm chứng cho các luồng quan trọng. Hệ thống phải hỗ trợ staging deployment với cấu hình provider được tài liệu hóa. Ngoài ra, hệ thống cần duy trì khả năng nâng cấp Axinom, Zoom, Next.js, Prisma, Shaka Player và Vercel trong tương lai.

### 4.2 Kiến trúc hệ thống

**Hình 4.1. Kiến trúc phân lớp của nền tảng phát video bảo mật**

```text
Lớp giao diện
  - Trang khóa học
  - Trang xem video
  - Trang meeting
  - Màn hình hỗ trợ và quản trị

Lớp ứng dụng/API
  - Next.js route handler
  - Middleware
  - Kiểm tra session
  - Endpoint admin và support

Lớp domain service
  - Media entitlement
  - Tạo Axinom token
  - Tạo chữ ký Zoom
  - Helper Redis cache/rate limit
  - Helper storage và email

Lớp dữ liệu và provider
  - MongoDB qua Prisma
  - Axinom DRM và Encoding
  - Azure Blob và R2/S3 storage
  - Google OAuth, Zoom, Redis, Sentry, Vercel
```

Lớp giao diện tập trung vào trải nghiệm người dùng và không được chứa secret. Lớp ứng dụng/API nhận request và xác thực danh tính. Lớp domain service chứa logic tái sử dụng cần nhất quán giữa các route. Lớp provider chứa dịch vụ ngoài và dữ liệu bền vững. Sự tách lớp này giúp xác định rõ quy tắc nào thuộc về đâu. Ví dụ, quy tắc media entitlement thuộc service layer và phải được dùng bởi mọi route liên quan đến media được bảo vệ.

### 4.3 Các thực thể dữ liệu cốt lõi

Database sử dụng Prisma với MongoDB. Các thực thể quan trọng bao gồm user, account, session, course, enrollment, video, quyền truy cập trực tiếp video, watch record, ticket, security event, DRM session, watermark setting và revoked session.

**Bảng 4.1. Các thực thể dữ liệu cốt lõi**

| Thực thể | Trách nhiệm chính |
|---|---|
| User | Lưu danh tính và vai trò learner/admin |
| Session | Lưu trạng thái phiên đăng nhập |
| AllowedEmail | Kiểm soát whitelist |
| Course | Nhóm nội dung học tập và loại truy cập |
| Enrollment | Liên kết user với course |
| Video | Lưu metadata video, trạng thái publish và trường Axinom |
| VideoAccess | Biểu diễn quyền truy cập trực tiếp video |
| WatchRecord | Theo dõi tiến độ xem và view limit |
| Ticket | Lưu yêu cầu hỗ trợ và diagnostics đã redact |
| SecurityEvent | Ghi nhận sự kiện bảo mật |
| DRMSession | Hỗ trợ audit DRM/playback |
| WatermarkSettings | Lưu cấu hình watermark toàn cục |
| RevokedSession | Hỗ trợ kiểm tra session bị thu hồi |

Các thực thể này phản ánh yêu cầu bảo mật của nền tảng. Một video không thể được đánh giá chỉ bằng đường dẫn file. Course, trạng thái publish, trạng thái xóa, access window, enrollment và watch record đều ảnh hưởng đến quyết định có cho phép playback hay không.

### 4.4 Thiết kế xác thực và media entitlement

Luồng xác thực bắt đầu khi người dùng đăng nhập bằng Google OAuth. NextAuth tạo và kiểm tra session. Middleware và logic server-side của page dùng session để bảo vệ các route như admin, meeting, DRM, HLS và watch.

Media entitlement là quy trình phân quyền chuyên biệt hơn. Helper entitlement server-only kiểm tra user, course, video, enrollment, direct access, trạng thái publish, trạng thái xóa, access window và view limit. Helper này được dùng bởi trang xem video, route cấp DRM token, route playlist HLS, route license cục bộ, route heartbeat và các route media bảo vệ trong tương lai. Thiết kế này ngăn chặn việc mỗi route có một logic khác nhau. Nếu quy tắc truy cập thay đổi, người bảo trì cập nhật một điểm quyết định chung thay vì sửa nhiều route riêng.

Hành vi từ chối nhất quán cũng là một phần của thiết kế. Các route bảo vệ không nên tiết lộ chi tiết vận hành nhạy cảm cho người không có quyền. Response từ chối nên cho biết rằng truy cập không được phép, nhưng không tiết lộ key ID, provider secret, điều kiện database hoặc nhánh entitlement nội bộ.

### 4.5 Luồng xem video được bảo vệ

**Hình 4.2. Trình tự xem video được bảo vệ**

```text
1. Người học đăng nhập.
2. Người học mở khóa học hoặc link video trực tiếp.
3. Trang watch kiểm tra session.
4. Server tải user, course, video, enrollment, access grant và watch record.
5. Media entitlement helper trả về allow hoặc deny.
6. Nếu allow, server chuẩn bị dữ liệu playback và đường cấp DRM token.
7. Trình duyệt khởi tạo Shaka Player.
8. Player yêu cầu media manifest.
9. Player yêu cầu DRM license với Axinom entitlement token.
10. Playback bắt đầu và heartbeat ghi nhận tiến độ.
```

Điểm thiết kế quan trọng là video player không phải lớp phòng vệ đầu tiên. Server kiểm tra entitlement trước khi dữ liệu playback được chuẩn bị. Route cấp DRM token kiểm tra entitlement lần nữa trước khi cấp token. Route playlist HLS cũng kiểm tra entitlement trước khi trả playlist. Việc nhiều route cùng dùng helper là cần thiết vì người dùng có thể gọi trực tiếp API route.

### 4.6 Thiết kế tích hợp Axinom DRM

Tích hợp Axinom sử dụng chế độ DRM tiêu chuẩn. Server ứng dụng ký Axinom License Service Message bằng communication key ID và secret được cấu hình trong môi trường server. License Service Message chứa entitlement message giới hạn theo content key được phép và có thời hạn ngắn. Shaka Player gửi thông điệp đã ký đến Axinom license service chỉ khi yêu cầu license.

Tài liệu thiết lập Axinom ánh xạ các giá trị từ provider vào biến môi trường của repository. Communication key secret luôn ở server. Public license service URL có thể được đưa ra browser vì đây là endpoint, không phải signing secret. Webhook verification dùng shared secret và từ chối malformed signature một cách an toàn. Operational ID và status của encoding/video được lưu ở các trường video rõ ràng thay vì nằm trong mô tả hiển thị cho người dùng.

Thiết kế này hỗ trợ bảo trì. Người bảo trì có thể mở tài liệu setup, xác định giá trị trong Axinom portal, cấu hình môi trường staging, chạy kiểm chứng cấu hình local và chỉ chạy live validation khi có chủ đích với tenant thật.

### 4.7 Thiết kế truy cập Zoom Meeting

Dù báo cáo tập trung vào DRM cho video, nền tảng cũng có truy cập Zoom meeting. Luồng meeting được bảo vệ bởi xác thực. Người học mở `/meeting`, trang này yêu cầu chữ ký từ `/api/zoom/signature`. Server kiểm tra session, sở hữu cấu hình meeting number và passcode, suy ra role, ký Meeting SDK JWT và chỉ trả dữ liệu an toàn cho browser.

**Hình 4.3. Trình tự truy cập cuộc họp Zoom**

```text
Người dùng đã xác thực mở /meeting
        |
Trang meeting yêu cầu chữ ký từ server
        |
Server kiểm tra session và role
        |
Server ký Zoom Meeting SDK JWT
        |
Trình duyệt mở Zoom iframe shell
        |
Zoom Client View chạy với watermark overlay
```

Quy tắc bảo mật chính là người học thông thường nhận role `0`, chỉ quản trị viên mới được nhận role `1`. Browser request không được kiểm soát role, meeting number hoặc passcode. Zoom SDK secret không được trả về client. Thiết kế này thống nhất với nguyên tắc chung của dự án: thông tin provider có đặc quyền phải nằm ở server.

### 4.8 Thiết kế biến môi trường và dịch vụ ngoài

Dự án dùng ma trận biến môi trường để tài liệu hóa biến theo dịch vụ, độ nhạy cảm, yêu cầu local, yêu cầu staging, nguồn sử dụng và ghi chú. Điều này cần thiết vì nền tảng có nhiều tích hợp provider. Một số giá trị là public config cho browser, ví dụ URL player hoặc site key. Một số giá trị là server secret, ví dụ database URL, OAuth secret, Axinom communication secret, Zoom SDK secret, Redis token, storage key, SMTP password và webhook secret.

**Bảng 4.2. Các nhóm cấu hình dịch vụ bên ngoài**

| Nhóm dịch vụ | Ví dụ cấu hình |
|---|---|
| Database | Chuỗi kết nối MongoDB |
| Auth | NextAuth URL, NextAuth secret, Google OAuth credentials |
| Redis | Upstash REST URL và token |
| Axinom | Communication key, license URL, encoding credentials, webhook secret |
| Storage | Azure Blob và R2/S3-compatible storage settings |
| Zoom | Meeting SDK key, secret, meeting ID, passcode |
| Support | SMTP và reCAPTCHA settings |
| Observability | Sentry DSN và environment tag |
| Public player config | Asset base URL và DRM license URL |

Quy tắc thiết kế là giá trị thật phải nằm trong `.env.local` ở máy phát triển hoặc encrypted environment settings ở staging, không nằm trong tài liệu hoặc commit. Script kiểm chứng chỉ nên báo tên biến còn thiếu, không in giá trị.

---

## CHƯƠNG 5. THỰC HIỆN VÀ ĐÁNH GIÁ

### 5.1 Baseline cài đặt và tài liệu

Vấn đề đầu tiên là làm cho dự án có thể tái lập từ clean checkout. Tài liệu setup hiện xác định Node version, cách dùng npm, cách generate Prisma client, thiết lập MongoDB, chạy local development và kiểm tra dịch vụ tùy chọn. Tài liệu cũng sửa lệch thông tin database bằng cách ghi rõ MongoDB là datasource hiện tại của Prisma.

Quy trình local setup gồm cài dependency, tạo file môi trường từ file mẫu, generate Prisma, db push, verify setup, verify services và chạy dev server. Tài liệu phân biệt development local thông thường với validation staging. Thiếu credential của dịch vụ ngoài có thể chấp nhận trong local setup, trong khi strict verification được dùng cho staging.

Công việc này quan trọng vì nền tảng streaming bảo mật phụ thuộc vào nhiều dịch vụ. Nếu thiếu tài liệu setup rõ ràng, người bảo trì sau có thể làm theo hướng dẫn cũ, làm lộ secret hoặc cấu hình sai DRM và authentication. Baseline cài đặt tạo điểm bắt đầu lặp lại được cho đội bảo trì.

### 5.2 Vệ sinh secret và an toàn môi trường

Nền tảng xử lý nhiều giá trị nhạy cảm: database URL, OAuth secret, Axinom communication secret, Zoom SDK secret, Redis token, storage key, SMTP password, service account credential, DRM key, certificate và media artifact. Vì vậy, tài liệu dự án có quy tắc vệ sinh secret và phân loại biến môi trường theo ownership.

Nguyên tắc thực hiện quan trọng là ví dụ chỉ dùng giá trị mẫu an toàn, còn giá trị thật nằm ngoài repository. Script kiểm chứng không được in giá trị môi trường. Bằng chứng staging không được chứa token thô, vật liệu ký, database URL đầy đủ, service account file, DRM key hoặc email đầy đủ của người dùng. Diagnostics của ticket hỗ trợ được giới hạn kích thước và redact trước khi lưu.

Vệ sinh secret đặc biệt quan trọng đối với dự án thực tập vì sinh viên thường minh họa ứng dụng bằng screenshot, log và báo cáo. Báo cáo này chỉ mô tả nhóm cấu hình mà không đưa giá trị secret thật.

### 5.3 Thực hiện media entitlement tập trung

Phần thực hiện bảo mật quan trọng nhất là media entitlement tập trung. Trước cải tiến này, các route khác nhau có thể lệch trong cách kiểm tra truy cập. Một người dùng có thể bị chặn ở trang watch nhưng vẫn thử đi qua route khác nếu route đó dùng điều kiện yếu hơn. Tập trung hóa quyết định entitlement làm giảm rủi ro này.

Helper entitlement kiểm tra danh tính user, enrollment, open-course access, direct video access, trạng thái publish và delete, access window và view limit. Helper được dùng bởi trang watch, route DRM token, route playlist HLS, route DRM license cục bộ và route heartbeat. Thiết kế này cũng giúp phát triển tương lai vì các route media mới có thể tái sử dụng helper thay vì sao chép business logic.

Tiêu chí đánh giá của phần này là tính nhất quán hành vi. Nếu người học có quyền, các route liên quan đến playback phải cho phép luồng hoạt động. Nếu người học không có quyền, toàn bộ route liên quan phải từ chối nhất quán. Cách này đáng tin cậy hơn mô hình chỉ bảo vệ page vì nội dung media có thể bị gọi trực tiếp qua HTTP request.

### 5.4 Tích hợp DRM token và Shaka Player

Luồng DRM token được căn chỉnh với mô hình Axinom License Service Message. Server chỉ tạo token sau khi entitlement thành công. Token có thời hạn ngắn và giới hạn theo content key được phép. Browser không nhận communication key secret. Shaka Player được cấu hình để chỉ gửi entitlement token trong yêu cầu DRM license.

Phần thực hiện này tạo ra phân chia trách nhiệm rõ ràng. Backend sở hữu phân quyền và token signing. Player sở hữu playback và cấu hình license request. Axinom sở hữu license validation và license issuance. Người dùng có trải nghiệm xem video bình thường, nhưng hệ thống vẫn thực thi bảo vệ nội dung ở phía sau.

Dự án cũng làm rõ rằng route DRM license cục bộ không phải là thay thế production cho Axinom nếu chưa có key custody thật. Điều này tránh việc người bảo trì hiểu nhầm một route phát triển local là một license service production hoàn chỉnh.

### 5.5 Thiết lập Axinom và kiểm chứng staging

Tài liệu thiết lập Axinom ánh xạ khái niệm chính thức của Axinom vào repository. Tài liệu xác định communication key ID, communication key secret, Widevine/PlayReady/FairPlay license service URL, FairPlay certificate URL, giá trị service account encoding, processing profile ID, video service URL, encoding API URL và webhook secret. Tài liệu cũng nhấn mạnh rằng giá trị tenant thật phải nằm trong environment settings, không nằm trong file commit.

Luồng staging bao gồm kiểm chứng cấu hình, kiểm tra Axinom live tùy chọn, cấu hình webhook URL và checklist playback staging. Điều này cần thiết vì DRM không thể được xác nhận đầy đủ chỉ bằng đọc code. Môi trường staging thật phải chứng minh tenant value, video test đã encode, license URL, player config, entitlement token và webhook cùng hoạt động.

### 5.6 Bảo toàn Zoom Meeting SDK

Tích hợp Zoom được bảo toàn dưới dạng luồng iframe có xác thực. Cải tiến bảo mật chính là server sở hữu việc tạo chữ ký và chọn role. Người học không thể chọn host role từ browser. Meeting SDK secret không bao giờ được trả về client.

Runbook cũng tài liệu hóa SDK path đang được giữ lại và cách ly các thư mục sample hoặc duplicate. Điều này giảm nhầm lẫn khi bảo trì. Trước khi nâng cấp Zoom SDK, người bảo trì phải đọc tài liệu chính thức của Zoom, cập nhật source of truth được giữ lại, chạy test tập trung và hoàn thành smoke test staging. Dự án vì vậy xem nâng cấp SDK nhà cung cấp là thay đổi vận hành có kiểm soát, không phải chỉ là cập nhật package ngẫu nhiên.

### 5.7 Hiệu năng Prisma/MongoDB và dọn dữ liệu

Dự án giữ MongoDB làm database hiện tại thay vì migration sớm. Công việc hiệu năng tập trung vào tối ưu hệ thống đang triển khai trước. Trang watch tránh query video trùng lặp bằng cách tái sử dụng ID từ sidebar video đã tải trước khi lấy watch record. Admin analytics dùng khoảng thời gian giới hạn, số lượng kết quả giới hạn và cache ngắn hạn. Security event dùng pagination và date bound. Diagnostics của support ticket có giới hạn payload. Watermark settings dùng scope singleton toàn cục để tránh đọc bản ghi mới nhất một cách mơ hồ.

Công việc này quan trọng vì vấn đề hiệu năng có thể trở thành vấn đề bảo mật và độ tin cậy. Route analytics chậm, query security event không giới hạn hoặc payload diagnostics tăng vô hạn có thể ảnh hưởng staging và production. Cách tiếp cận của dự án là cải thiện query shape hiện tại và tài liệu hóa rằng database migration chỉ nên xem xét khi profiling chứng minh MongoDB không đáp ứng yêu cầu.

### 5.8 Triển khai staging và smoke testing

Runbook staging hướng đến Vercel Preview hoặc custom staging environment. Tài liệu định nghĩa pre-deploy command, thiết lập environment, callback và origin configuration, kiểm tra provider, log, bằng chứng Sentry và quy tắc nghiệm thu. Tài liệu cũng ghi rõ production certification là việc tách biệt với staging readiness.

**Bảng 5.1. Các lệnh kiểm chứng**

| Mục đích | Lệnh |
|---|---|
| Kiểm tra setup | `npm run verify:setup` |
| Ma trận dịch vụ non-strict | `npm run verify:services` |
| Ma trận dịch vụ strict | `npm run verify:services:strict` |
| Kiểm chứng Axinom | `npm run verify:axinom` |
| Hợp đồng staging | `npm run verify:staging` |
| Lint | `npm run lint` |
| TypeScript | `npm run typecheck` |
| Test | `npm test` |
| Build production | `npm run build` |
| Kiểm kê secret | `npm run secrets:inventory` |
| Quét secret | `npm run secrets:scan` |

**Hình 5.1. Luồng kiểm chứng staging và smoke test**

```text
Kiểm chứng setup local
        |
Kiểm tra cấu hình service và Axinom
        |
Lint, typecheck, test, build
        |
Kiểm kê và quét secret
        |
Triển khai Vercel staging
        |
Kiểm tra callback/origin của provider
        |
Smoke test auth, playback, DRM, HLS, Zoom, support, Redis, storage, admin, logs, Sentry
```

Cách kiểm chứng theo lớp thực tế hơn so với chỉ dựa vào một lệnh build. Một nền tảng streaming bảo mật có thể compile thành công nhưng vẫn thất bại vì OAuth callback, Axinom license URL, Zoom domain, storage CORS, Redis credential hoặc Sentry config sai.

### 5.9 Vận hành và hardening production

Dự án có tài liệu vận hành cho các subsystem chính: auth và whitelist, media entitlement, DRM và Axinom, video processing và storage, Zoom meetings, Redis, database, support, admin, observability, frontend và client-side deterrence. Dự án cũng có playbook nâng cấp vendor cho Axinom, Zoom, Next.js, Prisma, Shaka Player và Vercel.

Backlog hardening production làm rõ các rủi ro còn lại. Điều này quan trọng vì một hệ thống sẵn sàng staging không nên được mô tả như đã được chứng nhận production.

**Bảng 5.2. Tóm tắt backlog hardening cho production**

| Khu vực | Công việc còn lại |
|---|---|
| Secrets | Quét secret nghiêm ngặt trong CI và quyết định xoay vòng credential |
| Video processing | Queue, worker hoặc điều phối provider-native bền vững |
| Backups | Diễn tập backup/restore MongoDB và khôi phục metadata media |
| Incident response | Quy trình escalation và xoay vòng credential khi có sự cố |
| Admin | Registry mutation admin typed rõ ràng hơn |
| Observability | Structured log có correlation ID và redaction |
| Load testing | Kiểm thử tải cho watch, admin, support và Zoom |

Backlog này không làm giảm giá trị của kết quả tập sự. Ngược lại, nó cho thấy sự phân biệt có trách nhiệm giữa staging readiness đã hoàn thành và production hardening cần thực hiện sau.

### 5.10 Đánh giá kết quả đạt được

Dự án đạt được một baseline phát video có bảo vệ và dễ bảo trì hơn. Dự án làm rõ setup, sửa lệch tài liệu database, tập trung hóa media entitlement, tài liệu hóa Axinom setup, bảo toàn truy cập Zoom an toàn, cải thiện hiệu năng database, định nghĩa kiểm tra staging và tạo tài liệu vận hành. Nền tảng hiện có thể được giải thích như một hệ thống phối hợp thay vì tập hợp các route và script provider rời rạc.

Kết quả kỹ thuật chính là playback được bảo vệ bằng nhiều lớp kiểm soát. Người dùng phải xác thực, thỏa media entitlement, nhận DRM token có phạm vi giới hạn và yêu cầu license qua provider DRM đã cấu hình. Các route liên quan như HLS playlist và heartbeat được căn chỉnh với cùng quyết định entitlement. Kết quả này mạnh hơn mô hình chỉ bảo vệ trang.

Kết quả học tập chính là nhận thức rằng tính năng bảo mật cần hỗ trợ vận hành. Ký DRM token không đủ nếu biến môi trường không có tài liệu, callback staging thiếu, log làm lộ secret hoặc người bảo trì tương lai không thể nâng cấp SDK an toàn. Vì vậy, dự án kết hợp thực hiện phần mềm với tài liệu và kiểm chứng.

---

## CHƯƠNG 6. KẾT LUẬN

### 6.1 Kết luận

Dự án tập sự nghề nghiệp này đã tìm hiểu Digital Rights Management và áp dụng vào tính năng xem video có bảo vệ cho nền tảng học tập trực tuyến. Dự án cho thấy DRM không phải là một tính năng biệt lập. DRM là một phần của kiến trúc streaming bảo mật lớn hơn, bao gồm xác thực, phân quyền, media mã hóa, thông điệp entitlement đã ký, license service của provider, cấu hình player, storage, logging, kiểm thử và vận hành triển khai.

Dự án sử dụng một nền tảng Next.js thực tế làm bối cảnh thực hiện. Hệ thống bao gồm truy cập khóa học có xác thực, playback được bảo vệ, quản trị, Zoom meetings, ticket hỗ trợ, watermark, Redis support services, Prisma/MongoDB, Axinom DRM, Shaka Player và staging theo hướng Vercel. Thông qua quá trình ổn định và tài liệu hóa, hệ thống trở nên dễ cài đặt, cấu hình, kiểm chứng và phát triển tiếp hơn cho người bảo trì.

Đóng góp kỹ thuật quan trọng nhất là tập trung hóa media entitlement và sử dụng nó trên các route playback được bảo vệ. Điều này ngăn logic truy cập không nhất quán và làm cho thay đổi bảo mật sau này an toàn hơn. Tài liệu tích hợp Axinom và checklist staging cũng giúp việc thiết lập DRM có thể lặp lại được. Runbook Zoom, ghi chú hiệu năng database, lệnh kiểm chứng và tài liệu vận hành tăng cường chất lượng của toàn bộ nền tảng.

### 6.2 Hạn chế

Dự án vẫn có một số hạn chế. Thứ nhất, staging readiness không đồng nghĩa với production certification. Trước khi vận hành production thật, hệ thống vẫn cần strict CI secret scanning, xoay vòng credential, diễn tập backup/restore, quy trình phản ứng sự cố, kiểm thử tải và điều phối video processing bền vững. Thứ hai, kiểm chứng DRM đầy đủ phụ thuộc vào credential Axinom tenant thật, video test đã encode, license service URL và quyền truy cập provider staging. Thứ ba, cơ chế chống ghi màn hình phía client chỉ có giá trị răn đe và telemetry; chúng không thể bảo đảm tuyệt đối rằng việc ghi màn hình là bất khả thi.

Một hạn chế khác là dự án giữ MongoDB thay vì migration sang database khác. Đây là quyết định có chủ đích vì migration khi chưa có bằng chứng profiling sẽ tạo rủi ro không cần thiết. Nếu dữ liệu staging hoặc production trong tương lai chứng minh MongoDB không đáp ứng yêu cầu, cần có kế hoạch migration riêng với kiểm chứng dữ liệu, rollback và đánh giá downtime.

### 6.3 Hướng phát triển

Hướng phát triển tiếp theo nên tập trung vào hardening production. Ưu tiên đầu tiên là secret scanning nghiêm ngặt trong CI và xoay vòng các credential kế thừa có nguy cơ từng bị lộ. Ưu tiên thứ hai là điều phối xử lý video bền vững bằng queue, worker hoặc cơ chế provider-native thay vì request HTTP kéo dài. Ưu tiên thứ ba là kiểm thử backup và restore cho MongoDB và metadata media. Ưu tiên thứ tư là kế hoạch incident response và observability có structured log, redaction và request correlation ID.

Các cải tiến sản phẩm trong tương lai có thể bao gồm redesign admin sâu hơn, export analytics phong phú hơn, quản lý cohort hoặc học kỳ, screenshot testing tự động và load testing sâu hơn cho watch, support, admin và Zoom. Việc nâng cấp DRM provider và SDK nên tiếp tục dựa trên tài liệu chính thức và smoke test staging.

### 6.4 Bài học kinh nghiệm

Bài học chính rút ra là một nền tảng media bảo mật phụ thuộc vào tính nhất quán. Nếu trang watch và các media route thực thi quy tắc khác nhau, hệ thống sẽ mong manh. Nếu biến môi trường không được tài liệu hóa, staging trở thành công việc phỏng đoán. Nếu log và báo cáo chứa secret, chính quá trình kiểm chứng lại trở thành rủi ro. Nếu client-side deterrence được mô tả như bảo vệ tuyệt đối, hệ thống tạo ra niềm tin sai.

Bài học thứ hai là khả năng bảo trì là một phần của bảo mật. Một hệ thống mà người phát triển sau không thể cài đặt, kiểm thử hoặc nâng cấp an toàn cuối cùng sẽ trở nên không an toàn. Tài liệu tốt, ma trận biến môi trường rõ ràng, runbook và lệnh kiểm chứng vì vậy là sản phẩm kỹ thuật, không phải ghi chú phụ.

Bài học cuối cùng là DRM cần được giải thích trung thực. DRM có thể kiểm soát mạnh việc phát nội dung mã hóa thông qua license, nhưng cần kết hợp với server-side entitlement, watermark, audit trail và kiểm soát vận hành. Cách hiểu theo mô hình nhiều lớp này là kết quả quan trọng nhất của đề tài tập sự.

---

## TÀI LIỆU THAM KHẢO

Axinom. (n.d.). *DRM License Service*. https://docs.axinom.com/services/drm/license-service

Axinom. (n.d.). *Signing License Service Messages*. https://docs.axinom.com/services/drm/license-service/sign-license-service-message

Axinom. (n.d.). *Shaka Player integration*. https://docs.axinom.com/services/drm/players/shaka

Axinom. (n.d.). *Encoding API*. https://docs.axinom.com/services/encoding/encoding-api/

Google. (n.d.). *Shaka Player documentation*. https://shaka-player-demo.appspot.com/docs/api/

Next.js. (n.d.). *App Router documentation*. https://nextjs.org/docs/app

Prisma. (n.d.). *Prisma ORM documentation*. https://www.prisma.io/docs

Vercel. (n.d.). *Environment variables documentation*. https://vercel.com/docs/environment-variables

Vercel. (n.d.). *Functions limitations*. https://vercel.com/docs/functions/limitations

Zoom. (n.d.). *Meeting SDK for Web*. https://developers.zoom.us/docs/meeting-sdk/web/

Tài liệu nội bộ dự án. (2026). *Maintainer setup, Axinom setup, Zoom Meeting SDK runbook, database performance notes, staging runbook và operations documents*. Secure Video Platform repository.

---

## PHỤ LỤC

### Phụ lục A. Các nhóm biến môi trường

Môi trường của nền tảng được chia thành các nhóm database, authentication, Redis, Axinom, storage, Zoom, support/email/reCAPTCHA, observability và public player configuration. Quy tắc quan trọng là server secret phải nằm ngoài browser code và không được sao chép vào báo cáo, screenshot, log hoặc commit.

### Phụ lục B. Các khu vực smoke test staging

Checklist smoke staging bao gồm authentication, từ chối người không có whitelist, truy cập khóa học, playback, cấp DRM token, truy cập playlist HLS, Axinom webhook readiness, Axinom encoding/playback, Zoom meeting launch, support ticket submission, Redis availability, storage access, admin pages, logs, Sentry và review production gaps.

### Phụ lục C. Hình vẽ đề xuất cho bản Word

Các sơ đồ sau có thể được vẽ lại trong Word hoặc xuất từ công cụ kiến trúc:

- Tổng quan nền tảng học tập có bảo vệ.
- Trình tự yêu cầu DRM license.
- Kiến trúc hệ thống phân lớp.
- Trình tự xem video được bảo vệ.
- Trình tự ký Zoom meeting.
- Luồng kiểm chứng staging.

### Phụ lục D. Bảng biểu cần giữ trong bản Word

Các bảng sau nên được giữ trong bản Word cuối cùng:

- Các công nghệ chính và trách nhiệm.
- So sánh phát video thông thường và phát video có DRM.
- Các thực thể dữ liệu cốt lõi.
- Các nhóm cấu hình dịch vụ bên ngoài.
- Các lệnh kiểm chứng.
- Tóm tắt backlog hardening production.
