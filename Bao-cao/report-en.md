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

Advisor

**ThS. Dương Hữu Phúc**

**THÀNH PHỐ HỒ CHÍ MINH, NĂM 2026**

---

## Formatting And Export Note

This Markdown file is prepared for transfer into the supplied Microsoft Word report template. When exporting to Word or PDF, use Times New Roman 13pt for body text, 1.5 line spacing, justified paragraphs, A4 portrait page size, margins of 3.5cm top, 3cm bottom, 3.5cm left, and 2cm right, with page numbers centered at the top. Each major front-matter section and each chapter should begin on a new page. The generated table of contents should include at most three heading levels.

---

## ACKNOWLEDGEMENTS

During the internship period, I received valuable guidance and support from my academic advisor, ThS. Dương Hữu Phúc. I would like to express my sincere gratitude to him for guiding the academic direction of this report, supporting the required internship procedures, and helping me refine the technical scope into a complete learning outcome.

I would also like to thank the Institute for Educational Science and Training Research (Viện IES) for giving me the opportunity to work in a practical software environment. In particular, I would like to thank my company guide, Ms. Trần Thị Chi, for supporting my work, answering project questions, and helping me understand the practical expectations of maintaining an e-learning platform. Through this internship, I learned that a working web application is not only a user interface, but also a combination of security rules, deployment constraints, operational documentation, and reliable verification.

I sincerely thank the university, the faculty, the advisor, and the company for creating the conditions for me to complete this internship report.

Ho Chi Minh City, April 20, 2026

Author

THÁI NGỌC THIÊN LONG

---

## ADVISOR EVALUATION SHEET

Advisor name: ThS. Dương Hữu Phúc.

Comments:

Overall score according to rubric:

Ho Chi Minh City, April 20, 2026

Advisor

---

## DECLARATION

This work was completed at Ton Duc Thang University under the academic guidance of ThS. Dương Hữu Phúc. I declare that the contents of this internship report are based on my own research, implementation, analysis, and project documentation. The results presented in this report are truthful and have not been submitted in the same form for another academic evaluation.

The report uses technical documentation, vendor documentation, and internal project artifacts as references. All external sources used for explanation, comparison, or technical background are listed in the reference section. I take responsibility for the academic integrity, source attribution, and technical claims in this report.

Ho Chi Minh City, April 20, 2026

Author

THÁI NGỌC THIÊN LONG

---

# TÌM HIỂU VỀ DIGITAL RIGHT MANAGEMENT VÀ XÂY DỰNG TÍNH NĂNG BẢO VỆ BẢN QUYỀN DỮ LIỆU CHO TÍNH NĂNG XEM VIDEO CỦA TRANG WEB HỌC TẬP

## ABSTRACT

Digital learning systems increasingly depend on online video delivery, but ordinary video delivery methods are not sufficient when course content must be protected against unauthorized access, uncontrolled sharing, and weak operational maintenance. This report presents the study and implementation of a protected video viewing feature for an e-learning platform, with Digital Rights Management (DRM) as the central topic.

The project started from an existing secure streaming and course platform that required stabilization, documentation, security review, and clearer maintainer workflows. The platform uses Next.js App Router, NextAuth, Prisma with MongoDB, Shaka Player, Axinom DRM, Zoom Meeting SDK, Upstash Redis, Azure Blob Storage, Cloudflare R2/S3-compatible storage, Sentry, and Vercel-oriented deployment. The main engineering objective was to make protected video playback reliable and maintainable by aligning authentication, authorization, DRM token generation, HLS playlist access, watermarking, testing, and staging documentation.

The report explains DRM concepts, protected media delivery, Axinom License Service Message signing, Shaka Player license request handling, and the supporting application architecture. It then analyzes the system design, including user authentication, media entitlement, database models, player integration, external service dependencies, and staging acceptance checks. The implementation work focused on centralizing media entitlement rules, validating Axinom configuration, preserving secure Zoom meeting access, improving Prisma/MongoDB performance, documenting environment variables, and establishing verification commands and smoke checklists.

The result is a staging-ready protected streaming platform baseline. The report also identifies remaining production-hardening items, including credential rotation, durable video processing orchestration, backup and restore drills, incident response, and load testing. The project demonstrates that DRM is not a single library or setting; it is a coordinated system of server-side authorization, license control, protected storage, client playback integration, audit evidence, and operational discipline.

Keywords: Digital Rights Management, DRM, e-learning, secure video streaming, Axinom, Shaka Player, Next.js, media authorization.

---

## TABLE OF CONTENTS

Generate the table of contents in Microsoft Word after applying the supplied school template.

---

## LIST OF FIGURES

Figure 2.1. Overview of the protected e-learning platform.

Figure 3.1. DRM license request flow.

Figure 4.1. Layered architecture of the secure streaming platform.

Figure 4.2. Protected video playback sequence.

Figure 4.3. Zoom meeting access sequence.

Figure 5.1. Staging verification and smoke-test flow.

---

## LIST OF TABLES

Table 2.1. Main platform technologies and responsibilities.

Table 3.1. Comparison between ordinary streaming and DRM-protected streaming.

Table 4.1. Core data entities.

Table 4.2. External service configuration groups.

Table 5.1. Verification commands.

Table 5.2. Production hardening backlog summary.

---

## ABBREVIATIONS

| Abbreviation | Meaning |
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

## CHAPTER 1. INTRODUCTION

### 1.1 Reason For Choosing The Topic

Online learning platforms often depend on video as the main medium for delivering knowledge. Compared with text documents or static slides, video lessons are more costly to produce and more difficult to protect after distribution. A common website can store and display video files, but this does not automatically protect the intellectual property of the course owner. If a video URL is publicly accessible, learners may share it outside the intended system. If authorization is checked only on the page view, a user may still attempt to access the underlying media playlist or segments directly. If the platform only relies on client-side restrictions, the protection can be bypassed because browser-side code is controlled by the user's device.

For these reasons, the topic of Digital Rights Management is important in an e-learning environment. DRM provides a technical mechanism for encrypting content and issuing licenses only to authorized clients. However, DRM alone does not solve the whole problem. A complete protected viewing feature also requires authentication, user authorization, media entitlement rules, license-token generation, storage access control, player configuration, watermarking, logging, and operational documentation. The internship project therefore focused not only on learning what DRM is, but also on applying it inside a real web application.

The project used an existing e-learning and secure streaming platform as the practical context. The platform already contained many important components, including course pages, a watch page, admin management, Zoom meeting access, support tickets, Axinom integration, Shaka Player playback, MongoDB persistence, and Vercel deployment orientation. Nevertheless, the system needed clearer setup instructions, stronger security consistency, documented staging checks, and a maintainable explanation of how DRM and related flows fit together. This made the project suitable for an internship report because it combined research, software engineering, security analysis, and practical implementation.

### 1.2 Project Objectives

The main objective of the report is to study Digital Rights Management and apply it to a protected video viewing feature in an e-learning website. The technical objective is to describe and improve a system in which only authorized learners can open a protected watch page, request a DRM entitlement token, load the media manifest, and obtain a DRM license through the official provider flow.

The project has several supporting objectives. First, it must clarify the platform architecture so maintainers can understand how Next.js pages, API routes, Prisma models, external services, player hooks, and admin workflows interact. Second, it must centralize media authorization so the watch page, DRM token route, HLS playlist route, local license route, and heartbeat route enforce the same access decision. Third, it must document Axinom setup using official concepts such as communication keys, License Service Messages, license service URLs, encoding profiles, and webhooks. Fourth, it must preserve the Zoom meeting flow while ensuring that signatures are generated on the server and learners cannot mint host-capable signatures. Fifth, it must establish verification commands, staging smoke tests, environment documentation, and secret hygiene practices.

The final objective is not to claim production certification. Instead, the project aims to produce a staging-ready baseline that can be installed, configured, verified, and evolved by maintainers without relying on inherited local knowledge.

### 1.3 Object And Scope Of The Study

The study object is the protected video viewing feature of an e-learning platform. The feature includes user authentication, course access, direct video access, DRM token issuance, Shaka Player playback, Axinom license requests, HLS playlist protection, watermarking, watch records, and related operational checks.

The project scope includes the current Next.js application and its documented integrations: Prisma with MongoDB, NextAuth with Google OAuth, Axinom DRM and Encoding, Shaka Player, Zoom Meeting SDK, Upstash Redis, Azure Blob Storage, Cloudflare R2/S3-compatible storage, Sentry, and Vercel deployment. The report also includes supporting work such as setup documentation, environment matrix design, tests, staging smoke checklists, database performance notes, and production-hardening backlog items.

The project does not attempt to replace Axinom DRM with a different provider, replace Zoom with another meeting system, migrate the database away from MongoDB, or claim that browser-side anti-recording detection can fully prevent recording. These items are either out of scope or deferred until later evidence proves that they are necessary.

### 1.4 Research And Implementation Method

The method used in this report combines document study, architecture analysis, implementation review, and verification planning. The theoretical part is based on DRM concepts, vendor documentation, and web application security principles. The practical part is based on the existing project artifacts, including the source code structure, maintainer documents, environment matrix, staging runbook, Axinom setup guide, Zoom runbook, database performance notes, and operation documents.

The implementation approach follows a stabilization-first process. Instead of redesigning the interface immediately, the project first makes installation, configuration, testing, and security behavior understandable. Then it addresses critical flows such as media entitlement, DRM token generation, HLS access, support-ticket security, Axinom setup, Zoom signature rules, database performance, staging readiness, and operations. This process is appropriate for a brownfield software project because the main risk is not only missing functionality, but unclear behavior across existing modules.

### 1.5 Practical Meaning Of The Topic

The practical value of the topic is that it turns protected video viewing from a vague requirement into a concrete system design. For learners, the platform should provide a normal course viewing experience while enforcing access rights in the background. For administrators, the platform should offer course, video, user, ticket, and security-event management without exposing secrets or weakening protected media access. For maintainers, the platform should have clear setup documentation, environment ownership, verification commands, staging smoke tests, and upgrade guidance.

The topic also has educational value. It shows that DRM is only one layer in a secure streaming system. A protected learning platform must combine multiple controls: server-side entitlement, encrypted media, provider-issued licenses, short-lived signed messages, storage access control, rate limiting, audit events, watermarking, and operational discipline. Understanding this layered model helps software engineering students approach real systems more responsibly.

---

## CHAPTER 2. OVERVIEW

### 2.1 E-Learning Platform Context

The platform studied in this report is a secure video streaming and course platform. Its main purpose is to provide authenticated access to learning content, especially protected video lessons. The system includes course browsing, video playback, admin management, support tickets, Zoom meeting access, analytics, watermarking, session controls, and integration with external services.

From a user perspective, the platform appears as a learning website. A learner signs in, opens a course, selects a lesson, watches the video, and may join a meeting or submit a support request. From a maintainer perspective, the same platform is more complex. It depends on a database for users, courses, videos, sessions, enrollments, watch records, support tickets, DRM sessions, and security events. It also depends on external services for OAuth, Redis, DRM, storage, meetings, email, error tracking, and deployment.

The project therefore cannot be evaluated only by its screen design. The core quality of the platform is whether it can enforce access rules, protect video content, keep secrets out of the client, and remain deployable by future maintainers. This is the reason the report focuses on protected video streaming as a system, not only as a media player component.

### 2.2 Current Platform Technologies

The platform is built with Next.js App Router and React. Server-rendered pages and API route handlers are placed under the application route structure. Authentication uses NextAuth with Google OAuth and database sessions. Prisma is used as the data access layer, and the active datasource is MongoDB. The video player uses Shaka Player for DASH/HLS playback and DRM license integration. Axinom provides DRM and video service capabilities. Zoom Meeting SDK is used for online meetings. Upstash Redis supports cache, rate limiting, system mode, and session revocation checks. Azure Blob Storage and Cloudflare R2/S3-compatible storage support media input, output, and playback assets. Vercel is the deployment-oriented hosting platform.

Table 2.1 summarizes the main responsibilities of these technologies.

**Table 2.1. Main platform technologies and responsibilities**

| Technology | Responsibility In The Project |
|---|---|
| Next.js App Router | Page rendering, layouts, protected routes, API handlers |
| NextAuth | Google OAuth login, session handling, whitelist access |
| Prisma with MongoDB | Data model and persistence for users, courses, videos, records, and tickets |
| Shaka Player | Browser playback for DASH/HLS and DRM license requests |
| Axinom DRM | License Service Message validation and DRM license issuance |
| Zoom Meeting SDK | Authenticated meeting join experience |
| Upstash Redis | Cache, rate limits, system mode, and revocation checks |
| Azure Blob Storage | Input and output storage for source and encoded media |
| Cloudflare R2/S3 | Playback object storage and HLS asset access |
| Sentry and Vercel logs | Error and deployment observability |

This combination of technologies is typical for a modern web application that integrates multiple managed services. The advantage is that the platform can use specialized providers for authentication, DRM, storage, and meetings. The disadvantage is that maintainers must understand configuration, secrets, callbacks, webhooks, and service limits across several systems.

### 2.3 Protected Video Streaming Problem

In a simple streaming system, the server may store a video file and return it to the browser through a public URL. This approach is easy to implement, but it does not satisfy the requirements of a protected academic content platform. If the URL is copied, the content may be accessed outside the intended course. If only the watch page is protected, a user may attempt to bypass the page and access the media playlist directly. If the video is not encrypted, anyone who obtains the file can play it.

DRM-protected streaming changes this model. The video content is encrypted. The player cannot decrypt and play the content unless it obtains a license from a DRM license service. The license service issues a license only when it receives a valid entitlement message signed by the trusted server. In the studied platform, the backend checks the user's media entitlement, signs a short-lived Axinom License Service Message, and returns it to the player. Shaka Player then attaches the token only to the DRM license request. If the user is unauthorized, the token is not issued and playback cannot proceed.

Table 3.1 in the next chapter compares ordinary streaming and DRM-protected streaming in more detail. The key idea is that protected streaming must enforce access at multiple points: the page, the token route, the license request, the playlist route, and storage access.

### 2.4 Project State Before Stabilization

The project was a brownfield system, meaning that significant functionality already existed before the internship work. The system already contained course pages, watch pages, admin interfaces, Zoom meeting flow, Axinom modules, Shaka playback, Redis helpers, storage helpers, and deployment configuration. However, the project also contained documentation drift, inconsistent authorization logic, unclear setup assumptions, missing or incomplete verification paths, and secret hygiene concerns.

One example of documentation drift was the database description. Older documentation referred to PostgreSQL, but the active Prisma schema used MongoDB. This mismatch matters because setup commands, deployment expectations, indexing, and migration planning differ between database providers. Another example was media authorization drift. If the watch page, DRM token route, HLS playlist route, local license route, and heartbeat route implement access logic separately, future changes can create security gaps. A protected streaming platform should not depend on several slightly different authorization checks.

The stabilization work therefore focused on making the project installable, documented, secure, testable, and staging-ready before making larger product changes. This order is important because a visually improved platform is not maintainable if future developers cannot install it, verify it, or understand how its security boundaries work.

### 2.5 General System Overview

Figure 2.1 summarizes the platform as a layered system.

**Figure 2.1. Overview of the protected e-learning platform**

```text
Learner/Admin Browser
        |
        v
Next.js App Router Pages and Layouts
        |
        v
API Routes and Middleware
        |
        v
Service Layer: Auth, Entitlement, DRM, Zoom, Storage, Redis
        |
        v
MongoDB, Axinom, Storage, Zoom, OAuth, Redis, Sentry, Vercel
```

The top layer is the user interface: course pages, watch page, meeting page, support forms, and admin screens. The next layer contains route handlers and middleware that validate sessions, enforce access, receive webhooks, generate signatures, and return data to the browser. The service layer centralizes reusable logic for authentication, entitlement, DRM, storage, Redis, and external APIs. The final layer includes persistent data and external providers.

This layered view is useful because it separates responsibilities. The user interface should not contain secrets. API routes should validate identity and call service helpers. Service helpers should encapsulate provider rules. External services should be configured through documented environment variables. When these responsibilities are respected, the system becomes easier to test and maintain.

---

## CHAPTER 3. THEORETICAL BACKGROUND

### 3.1 Digital Rights Management

Digital Rights Management is a set of technologies and processes used to control access to digital content. In the context of video streaming, DRM usually means that the media is encrypted and the decryption key is not delivered directly as a plain value. Instead, the player asks a license service for permission to play the content. The license service decides whether to issue a license based on an entitlement message or another trusted authorization signal.

DRM does not mean that content can never be recorded or copied. Any content shown on a user's screen can theoretically be captured by another device. Therefore, DRM should be understood as a strong access-control and encryption layer, not as a magical guarantee against every form of copying. A responsible protected-learning platform should combine DRM with server-side authorization, watermarking, logging, session controls, and clear operational policy.

In this project, DRM protects video lessons by ensuring that encrypted content can only be played when the backend has authorized the learner and issued a valid token. The backend does not expose the communication key secret to the browser. The browser receives only a short-lived entitlement token and uses it when contacting the Axinom license service through Shaka Player.

### 3.2 Ordinary Streaming And DRM-Protected Streaming

Ordinary streaming and DRM-protected streaming have different security properties.

**Table 3.1. Comparison between ordinary streaming and DRM-protected streaming**

| Criteria | Ordinary Streaming | DRM-Protected Streaming |
|---|---|---|
| Media file protection | Often clear media or weak URL protection | Media is encrypted |
| Access control point | Usually page route or signed URL | Page, token route, license service, and storage path |
| Client requirement | Standard HTML video or player | DRM-capable browser/player |
| Unauthorized URL sharing | Higher risk if URL is reusable | Lower risk because license is still required |
| Provider dependency | Lower | Higher because license service is required |
| Operational complexity | Lower | Higher due to keys, profiles, tokens, and testing |

The comparison shows that DRM improves control over playback, but it also increases system complexity. Developers must manage encryption profiles, license URLs, key IDs, token signing, player request filters, provider webhooks, and browser compatibility. Therefore, DRM integration should be documented carefully and tested through staging before production use.

### 3.3 Axinom License Service Message Model

Axinom DRM uses a License Service Message model. The application server creates a signed message that tells the Axinom License Service what content keys and license restrictions are allowed. The message contains a communication key identifier and an entitlement message. The communication key value is used on the server to sign the JWT. Because the communication key secret authorizes license issuance, it must never be exposed to browser code or logs.

In the studied platform, the License Service Message is generated only after the server checks the current user's media entitlement. The entitlement message is scoped to the requested video and key ID. It is short-lived so that a stale token cannot be reused indefinitely. This model supports the principle of least privilege: a learner receives only the permission needed for the requested playback session.

### 3.4 Shaka Player And License Requests

Shaka Player is a browser media player library that supports DASH, HLS, and DRM configuration. In this project, Shaka Player loads the media manifest and communicates with DRM license services. The important security rule is that the Axinom entitlement token should be sent only with license requests, not with ordinary media segment requests or unrelated network calls.

Figure 3.1 summarizes the DRM license request flow.

**Figure 3.1. DRM license request flow**

```text
User opens watch page
        |
Server checks session and media entitlement
        |
Server signs Axinom License Service Message
        |
Browser initializes Shaka Player
        |
Shaka requests license with entitlement token
        |
Axinom License Service returns license
        |
Encrypted video can be decrypted and played
```

This flow shows why both server-side and client-side responsibilities matter. The server must decide whether a user is allowed to receive a token. The client must configure the player so that the token is attached correctly to the license request. If either part is incorrect, playback may fail or security may weaken.

### 3.5 Authentication And Authorization

Authentication answers the question: who is the user? Authorization answers the question: what is this user allowed to do? The project uses NextAuth with Google OAuth to authenticate users. The platform also uses a whitelist model so that only permitted users can enter protected learning workflows.

Media authorization is more specific than general login. A signed-in user may not automatically have access to every course or video. The system must check whether the course is open, whether the user is enrolled, whether direct video access exists, whether the video is published, whether the video is deleted, whether access windows are valid, and whether view limits apply. Because these rules are security-critical, they should be centralized in a server-only helper rather than duplicated across routes.

### 3.6 Storage, Webhooks, And Deployment Constraints

Protected streaming also depends on storage and deployment. Source videos may be stored in Azure Blob Storage for encoding. Encoded output may be stored in R2/S3-compatible storage for playback. Axinom webhooks notify the application when encoding or video processing status changes. Vercel deployment introduces serverless limits, environment-variable scoping, and callback URL requirements.

These infrastructure details influence the design. Long-running video processing should not be treated as an ordinary HTTP request in production. Environment variables must be separated into public configuration and server secrets. Callback URLs for Google OAuth, Axinom webhooks, Zoom domain settings, storage CORS, and Sentry must match the staging or production origin. These constraints make operational documentation a necessary part of the software, not an optional addition.

---

## CHAPTER 4. SYSTEM ANALYSIS AND DESIGN

### 4.1 Requirements Analysis

The core functional requirement is that an authorized learner can watch protected course video content, while unauthorized users cannot access the same content by bypassing the visible page. This requirement expands into several smaller requirements. The learner must be able to sign in, open an allowed course, select a video, load the watch page, initialize the player, receive a DRM token only when authorized, and continue playback while the system records heartbeat or watch progress. The system must also deny unauthorized requests consistently.

The non-functional requirements are equally important. The project must be installable from a clean checkout, use documented Node and npm versions, generate the Prisma client reliably, and provide environment documentation. It must avoid secret leakage in examples, logs, support diagnostics, and staging evidence. It must provide tests or verification commands for critical flows. It must support staging deployment with documented provider configuration. It must also preserve maintainability for future upgrades of Axinom, Zoom, Next.js, Prisma, Shaka Player, and Vercel.

### 4.2 System Architecture

Figure 4.1 presents the architecture as a layered design.

**Figure 4.1. Layered architecture of the secure streaming platform**

```text
Presentation Layer
  - Course pages
  - Watch page
  - Meeting page
  - Support and admin screens

Application/API Layer
  - Next.js route handlers
  - Middleware
  - Session validation
  - Admin and support endpoints

Domain Service Layer
  - Media entitlement
  - Axinom token generation
  - Zoom signature creation
  - Redis cache/rate limit helpers
  - Storage and email helpers

Data and Provider Layer
  - MongoDB through Prisma
  - Axinom DRM and Encoding
  - Azure Blob and R2/S3 storage
  - Google OAuth, Zoom, Redis, Sentry, Vercel
```

The presentation layer should focus on user experience and should not store sensitive credentials. The application/API layer receives requests and validates identity. The domain service layer contains reusable logic that must remain consistent across routes. The provider layer contains external services and persistent storage. This separation makes it easier to identify where a rule belongs. For example, a media entitlement rule belongs in the service layer and should be used by every route that serves protected media behavior.

### 4.3 Core Data Entities

The database uses Prisma with MongoDB. The important entities include users, accounts, sessions, courses, enrollments, videos, direct video access grants, watch records, tickets, security events, DRM sessions, watermark settings, and revoked sessions.

**Table 4.1. Core data entities**

| Entity | Main Responsibility |
|---|---|
| User | Stores learner/admin identity and role |
| Session | Stores authenticated session state |
| AllowedEmail | Controls whitelist access |
| Course | Groups learning content and access type |
| Enrollment | Connects users to courses |
| Video | Stores lesson video metadata, publication state, and Axinom fields |
| VideoAccess | Represents direct access to a specific video |
| WatchRecord | Tracks playback progress and view limits |
| Ticket | Stores support requests and redacted diagnostics |
| SecurityEvent | Records security-related events |
| DRMSession | Supports DRM/playback audit information |
| WatermarkSettings | Stores global watermark behavior |
| RevokedSession | Supports session revocation checks |

These entities reflect the security needs of the platform. A video is not evaluated only by its file path. Its course, publication status, deletion status, access windows, enrollment state, and watch records all affect whether playback should be allowed.

### 4.4 Authentication And Media Entitlement Design

The authentication flow starts when the user signs in through Google OAuth. NextAuth creates and validates the session. Middleware and server-side page logic use the session to protect routes such as admin pages, meeting pages, DRM routes, HLS routes, and watch pages.

Media entitlement is a more specialized authorization process. The server-only entitlement helper checks the user, course, video, enrollment, direct access, publication state, deletion state, access window, and view limits. The same helper is used across the watch page, DRM token route, HLS playlist route, local license route, heartbeat route, and future protected media routes. This design prevents route-level drift. If the access rule changes, maintainers update one shared decision point rather than several separate route implementations.

Consistent denial behavior is part of the design. Protected routes should not reveal sensitive operational details to unauthorized users. A denial response should tell the user that access is not allowed, but it should not expose whether a specific key ID, provider secret, database condition, or internal entitlement branch caused the denial.

### 4.5 Protected Video Playback Flow

Figure 4.2 shows the protected playback sequence.

**Figure 4.2. Protected video playback sequence**

```text
1. Learner signs in.
2. Learner opens a course or direct video link.
3. Watch page validates session.
4. Server loads user, course, video, enrollment, access grant, and watch records.
5. Media entitlement helper returns allow or deny.
6. If allowed, server prepares playback data and DRM token path.
7. Browser initializes Shaka Player.
8. Player requests the media manifest.
9. Player requests a DRM license with the Axinom entitlement token.
10. Playback starts and heartbeat records progress.
```

The important design point is that the video player is not the first line of defense. The server checks entitlement before playback data is prepared. The DRM token route checks entitlement again before issuing a token. The HLS playlist route also checks entitlement before returning protected playlist data. This repeated use of the same helper is intentional because users can call API routes directly.

### 4.6 Axinom DRM Integration Design

The Axinom integration uses standard DRM mode. The application server signs an Axinom License Service Message using the communication key ID and secret configured in the server environment. The License Service Message contains an entitlement message scoped to the authorized key IDs and configured with short validity. Shaka Player sends the signed message to the Axinom license service only when requesting a license.

The Axinom setup guide maps provider values to repository environment variables. The communication key secret remains server-only. Public license service URLs can be exposed to the browser because they are endpoints, not signing secrets. Webhook verification uses a shared secret and rejects malformed signatures safely. Encoding and video operational IDs are stored in explicit video fields instead of being hidden inside user-facing descriptions.

This design supports maintainability. A maintainer can open the setup guide, identify the Axinom portal values, configure the staging environment, run local configuration verification, and then run live validation only when real tenant values are intentionally available.

### 4.7 Zoom Meeting Access Design

Although the report focuses on video DRM, the platform also includes Zoom meeting access. The meeting flow is protected by authentication. The learner opens `/meeting`, and the page requests a signature from `/api/zoom/signature`. The server validates the session, owns the meeting number and passcode configuration, derives the role, signs the Meeting SDK JWT, and returns only browser-safe launch data.

Figure 4.3 shows the meeting access sequence.

**Figure 4.3. Zoom meeting access sequence**

```text
Authenticated user opens /meeting
        |
Meeting page requests server signature
        |
Server validates session and role
        |
Server signs Zoom Meeting SDK JWT
        |
Browser opens Zoom iframe shell
        |
Zoom Client View starts with watermark overlay
```

The key security rule is that ordinary learners receive role `0`, and only administrators may receive role `1`. Browser requests must not control the role, meeting number, or passcode. The Zoom SDK secret must never be returned to the browser. This design is consistent with the wider project rule: privileged provider credentials stay on the server.

### 4.8 Environment And External Service Design

The project uses an environment matrix to document variables by service, sensitivity, local requirement, staging requirement, source, and notes. This is necessary because the platform uses many provider integrations. Some values are public browser configuration, such as public player URLs or site keys. Other values are server secrets, such as database URLs, OAuth secrets, Axinom communication secrets, Zoom SDK secrets, Redis tokens, storage keys, SMTP passwords, and webhook secrets.

**Table 4.2. External service configuration groups**

| Service Group | Examples Of Configuration |
|---|---|
| Database | MongoDB connection string |
| Auth | NextAuth URL, NextAuth secret, Google OAuth credentials |
| Redis | Upstash REST URL and token |
| Axinom | Communication key, license URLs, encoding credentials, webhook secret |
| Storage | Azure Blob and R2/S3-compatible storage settings |
| Zoom | Meeting SDK key, secret, meeting ID, passcode |
| Support | SMTP and reCAPTCHA settings |
| Observability | Sentry DSN and environment tags |
| Public player config | Asset base URL and DRM license URLs |

The design rule is that real values must be stored in local `.env.local` files or encrypted staging environment settings, not in documentation or commits. Verification scripts should report missing variable names but must not print values.

---

## CHAPTER 5. IMPLEMENTATION AND EVALUATION

### 5.1 Installable Baseline And Documentation

The first implementation concern was making the project reproducible from a clean checkout. The setup documentation now identifies Node version expectations, npm usage, Prisma client generation, MongoDB setup, local development startup, and optional service checks. It also corrects stale database assumptions by documenting MongoDB as the active Prisma datasource.

The local setup path includes dependency installation, environment file creation from the sample file, Prisma generation, database push, setup verification, service verification, and development server startup. The documentation distinguishes ordinary local development from staging validation. Missing external credentials are allowed during ordinary local setup, while strict verification is used for staging completeness.

This work matters because a protected streaming system depends on many services. Without clear setup documentation, future maintainers may accidentally follow outdated instructions, expose secrets, or misconfigure DRM and authentication. The installable baseline gives maintainers a repeatable starting point.

### 5.2 Secret Hygiene And Environment Safety

The platform handles many sensitive values: database URLs, OAuth secrets, Axinom communication secrets, Zoom SDK secrets, Redis tokens, storage keys, SMTP passwords, service account credentials, DRM keys, certificates, and media artifacts. The project documentation therefore includes secret hygiene rules and environment matrix ownership.

The important implementation principle is that examples use safe sample values while real values remain outside the repository. Verification scripts must avoid printing environment values. Staging evidence must not include raw tokens, signing material, full database URLs, service account files, DRM keys, or full user emails. Support-ticket diagnostics are bounded and redacted before persistence.

Secret hygiene is especially important for an internship project because students often demonstrate applications through screenshots, logs, and reports. This report intentionally describes configuration categories without including real credential material.

### 5.3 Central Media Entitlement Implementation

The most important security implementation is central media entitlement. Before this improvement, different routes could drift in how they checked access. A user might be denied on the watch page but still reach another route if the route used a weaker condition. Centralizing the entitlement decision reduces this risk.

The entitlement helper checks user identity, course enrollment, open-course access, direct video access, publication and deletion state, access windows, and view limits. It is used by the watch page, DRM token route, HLS playlist route, local DRM license route, and heartbeat route. This design also helps future development because new protected media routes can reuse the same helper rather than copying business logic.

The evaluation criterion for this work is behavioral consistency. If a learner is authorized, the related playback routes should allow the flow. If a learner is not authorized, all related routes should deny access consistently. This is more reliable than checking only one route because protected content can be targeted through direct HTTP requests.

### 5.4 DRM Token And Shaka Player Integration

The DRM token flow was aligned with the Axinom License Service Message model. The server generates the token only after entitlement succeeds. The token is short-lived and scoped to the authorized content keys. The browser does not receive the communication key secret. Shaka Player is configured to send the entitlement token only with DRM license requests.

This implementation supports a clean division of responsibility. The backend owns authorization and token signing. The player owns playback and license request configuration. Axinom owns license validation and license issuance. The user receives a normal video experience, but the system enforces content protection behind the scenes.

The project also clarifies that the local DRM license endpoint is not a production Axinom substitute unless real key custody is implemented. This prevents a maintainer from confusing a local development route with a complete production license service.

### 5.5 Axinom Setup And Staging Validation

The Axinom setup documentation maps official Axinom concepts to the repository. It identifies communication key ID, communication key secret, Widevine/PlayReady/FairPlay license service URLs, FairPlay certificate URL, encoding service account values, processing profile IDs, video service URL, encoding API URL, and webhook secret. It also explains that real tenant values belong in environment settings, not in committed files.

The staging path includes configuration verification, optional live Axinom checks, webhook URL configuration, and a staging playback checklist. This is necessary because DRM cannot be fully validated only through static code review. A real staging environment must confirm that the tenant values, encoded test video, license URLs, player configuration, entitlement token, and webhook behavior work together.

### 5.6 Zoom Meeting SDK Preservation

The Zoom implementation was preserved as an authenticated iframe flow. The main security improvement is that the server owns the signature generation and role selection. The learner cannot choose a host role through the browser. The Meeting SDK secret is never returned to the client.

The runbook also documents the retained SDK path and quarantines duplicate or sample SDK assets. This reduces maintenance confusion. Before upgrading Zoom SDK versions, maintainers must read official Zoom documentation, update the retained source of truth, run focused automated tests, and complete a staging smoke test. The project therefore treats vendor SDK upgrades as controlled operational changes rather than casual package updates.

### 5.7 Prisma/MongoDB Performance And Data Cleanup

The project keeps MongoDB as the current database instead of migrating prematurely. Performance work focuses on optimizing the implemented system first. The watch page avoids redundant video queries by reusing already-loaded sidebar video IDs before fetching watch records. Admin analytics use bounded windows, bounded result sets, and short-lived caching. Security events use pagination and date bounds. Support-ticket diagnostics have payload limits. Watermark settings use a global singleton scope to avoid ambiguous latest-row reads.

This work is important because performance problems can become security and reliability problems. A slow admin analytics route, unbounded security-event query, or growing diagnostic payload can affect staging and production stability. The implementation approach improves current query shapes and documents that database migration should only be considered if profiling proves MongoDB cannot meet requirements.

### 5.8 Staging Deployment And Smoke Testing

The staging runbook targets Vercel Preview or a custom staging environment. It defines pre-deploy commands, environment setup, callback and origin configuration, provider checks, logs, Sentry evidence, and acceptance rules. It also explicitly states that production certification is separate from staging readiness.

**Table 5.1. Verification commands**

| Purpose | Command |
|---|---|
| Setup contract | `npm run verify:setup` |
| Non-strict service matrix | `npm run verify:services` |
| Strict service matrix | `npm run verify:services:strict` |
| Axinom validation | `npm run verify:axinom` |
| Staging contract | `npm run verify:staging` |
| Lint | `npm run lint` |
| TypeScript | `npm run typecheck` |
| Tests | `npm test` |
| Production build | `npm run build` |
| Secret inventory | `npm run secrets:inventory` |
| Secret scan | `npm run secrets:scan` |

Figure 5.1 shows the verification model.

**Figure 5.1. Staging verification and smoke-test flow**

```text
Local setup verification
        |
Service and Axinom configuration checks
        |
Lint, typecheck, tests, build
        |
Secret inventory and scan
        |
Vercel staging deployment
        |
Provider callback/origin checks
        |
Auth, playback, DRM, HLS, Zoom, support, Redis, storage, admin, logs, Sentry smoke tests
```

This layered verification approach is more realistic than relying on a single build command. A protected streaming platform can compile successfully and still fail because OAuth callbacks, Axinom license URLs, Zoom domains, storage CORS, Redis credentials, or Sentry configuration are wrong.

### 5.9 Operations And Production Hardening

The project includes operations documentation for major subsystems: auth and whitelist, media entitlement, DRM and Axinom, video processing and storage, Zoom meetings, Redis, database, support, admin, observability, frontend, and client-side deterrence. It also includes vendor upgrade playbooks for Axinom, Zoom, Next.js, Prisma, Shaka Player, and Vercel.

The production-hardening backlog makes remaining risks explicit. This is important because a staging-ready system should not be described as production-certified. Table 5.2 summarizes the major production blockers.

**Table 5.2. Production hardening backlog summary**

| Area | Remaining Work |
|---|---|
| Secrets | Strict CI secret scanning and credential rotation decisions |
| Video processing | Durable queue, worker, or provider-native orchestration |
| Backups | MongoDB backup/restore and media metadata recovery drills |
| Incident response | Production escalation and credential rotation procedures |
| Admin | More typed admin mutation registry |
| Observability | Structured logs with request correlation and redaction |
| Load testing | Staging load tests for watch, admin, support, and Zoom |

This backlog does not reduce the value of the internship outcome. Instead, it shows a responsible distinction between completed staging readiness and future production hardening.

### 5.10 Evaluation Of Achieved Results

The project achieved a maintainable protected streaming baseline. It clarified setup, corrected database documentation drift, centralized media entitlement, documented Axinom setup, preserved secure Zoom meeting access, improved database performance, defined staging deployment checks, and created operations guidance. The platform can now be explained as a coordinated system rather than a collection of disconnected routes and provider scripts.

The main technical result is that protected playback is enforced through layered controls. A user must authenticate, satisfy media entitlement, receive a scoped DRM token, and request a license through the configured DRM provider. Related routes such as HLS playlist access and heartbeat behavior align with the same entitlement decision. The result is stronger than a page-only protection model.

The main learning result is understanding that security features require operational support. DRM token signing is not enough if environment values are undocumented, staging callbacks are missing, logs expose secrets, or future maintainers cannot upgrade provider SDKs safely. The project therefore combines software implementation with documentation and verification.

---

## CHAPTER 6. CONCLUSION

### 6.1 Conclusion

This internship project studied Digital Rights Management and applied it to a protected video viewing feature for an e-learning platform. The project showed that DRM is not a single isolated feature. It is part of a larger secure streaming architecture that includes authentication, authorization, encrypted media, signed entitlement messages, provider license services, player configuration, storage, logging, testing, and deployment operations.

The project used a real Next.js platform as the implementation context. The system includes authenticated course access, protected playback, admin management, Zoom meetings, support tickets, watermarking, Redis support services, Prisma/MongoDB persistence, Axinom DRM, Shaka Player, and Vercel-oriented staging. Through stabilization and documentation, the system became easier for maintainers to install, configure, verify, and evolve.

The most important technical contribution is the centralization of media entitlement and its use across protected playback routes. This prevents inconsistent access checks and makes future security changes safer. The Axinom integration documentation and staging checklist also make DRM setup reproducible. The Zoom runbook, database performance notes, verification commands, and operations documents strengthen the surrounding platform.

### 6.2 Limitations

The project has several limitations. First, staging readiness is not the same as production certification. Real production launch still requires strict CI secret scanning, credential rotation, backup and restore drills, incident response procedures, load testing, and durable video processing orchestration. Second, full DRM validation depends on real Axinom tenant credentials, encoded test videos, license service URLs, and staging provider access. Third, client-side anti-recording controls can only provide deterrence and telemetry; they cannot guarantee that screen recording is impossible.

Another limitation is that the project preserved MongoDB rather than migrating to another database. This is a deliberate decision because migration without profiling evidence would create unnecessary risk. If future staging or production data proves that MongoDB cannot meet requirements, a separate migration plan will be required.

### 6.3 Future Development

Future development should focus on production hardening. The first priority is strict secret scanning in CI and rotation of any inherited credentials that may have been exposed. The second priority is durable video processing orchestration through a queue, worker, or provider-native job mechanism instead of long-running HTTP requests. The third priority is backup and restore testing for MongoDB and media metadata. The fourth priority is incident response planning and structured observability with redacted logs and request correlation IDs.

Future product improvements may include more complete admin redesign, richer analytics exports, cohort or academic term management, automated screenshot testing, and deeper load testing for watch, support, admin, and Zoom flows. DRM provider and SDK upgrades should continue to follow official documentation and staging smoke tests.

### 6.4 Lessons Learned

The main lesson learned is that a secure media platform depends on consistency. If the watch page and the media routes enforce different rules, the system is fragile. If environment values are not documented, staging becomes guesswork. If logs and reports contain secrets, the verification process itself becomes a risk. If browser-side deterrence is described as absolute protection, the system creates false confidence.

The second lesson is that maintainability is part of security. A system that future developers cannot install, test, or upgrade safely will eventually become insecure. Good documentation, clear environment matrices, runbooks, and verification commands are therefore engineering deliverables, not secondary notes.

The final lesson is that DRM should be explained honestly. It can strongly control license-based playback of encrypted content, but it should be combined with server-side entitlement, watermarking, audit trails, and operational controls. This layered understanding is the most important outcome of the internship project.

---

## REFERENCES

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

Internal project documentation. (2026). *Maintainer setup, Axinom setup, Zoom Meeting SDK runbook, database performance notes, staging runbook, and operations documents*. Secure Video Platform repository.

---

## APPENDICES

### Appendix A. Environment Groups

The platform environment is divided into database, authentication, Redis, Axinom, storage, Zoom, support/email/reCAPTCHA, observability, and public player configuration groups. The important rule is that server secrets must remain outside browser code and must not be copied into reports, screenshots, logs, or commits.

### Appendix B. Staging Smoke Areas

The staging smoke checklist covers authentication, non-whitelisted denial, course access, playback, DRM token issuance, HLS playlist access, Axinom webhook readiness, Axinom encoding/playback, Zoom meeting launch, support ticket submission, Redis availability, storage access, admin pages, logs, Sentry, and production-gap review.

### Appendix C. Suggested Figures For Word Version

The following diagrams can be redrawn in Word or exported from architecture tools:

- Protected e-learning platform overview.
- DRM license request sequence.
- Layered system architecture.
- Protected video playback sequence.
- Zoom meeting signature sequence.
- Staging verification flow.

### Appendix D. Suggested Tables For Word Version

The following tables should be preserved in the final Word export:

- Main platform technologies and responsibilities.
- Ordinary streaming compared with DRM-protected streaming.
- Core data entities.
- External service configuration groups.
- Verification commands.
- Production hardening backlog summary.
