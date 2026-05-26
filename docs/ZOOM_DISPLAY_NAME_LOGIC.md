# Zoom Display Name Logic Flow Analysis

## Conclusion

The display name used in Zoom meetings is fetched **directly from the Google Auth session** (stored in your local database after initial login), **NOT** from the whitelist table.

## Detailed Data Flow

1. **Authentication (Google Login)**
    * **Source**: `src/lib/auth.ts`
    * When a user signs in with Google, NextAuth fetches their profile (Name, Email, Image).
    * The `PrismaAdapter` saves this information into your `User` table.
    * **Whitelist Check**: The system checks the `AllowedEmail` table to verify if the `email` is authorized. It does *not* read a name from here.

2. **Meeting Page Initialization**
    * **Source**: `src/app/meeting/page.tsx`
    * The page retrieves the active session using `useSession()`.
    * It determines the display name with this logic:

        ```typescript
        // src/app/meeting/page.tsx:53
        const name = session?.user?.name || (email ? email.split('@')[0] : 'Guest');
        ```

    * This `name` is passed as a URL parameter (`userName`) when loading the Zoom iframe.

3. **Zoom Client (Iframe)**
    * **Source**: `public/zoom-meeting.html`
    * The Zoom initialization script reads the `userName` from the URL:

        ```javascript
        // public/zoom-meeting.html:136
        const userName = urlParams.get('userName') || 'Guest';
        ```

    * This name is passed to `ZoomMtg.join()`.

## Evidence

- **Frontend**: [zoom-meeting.html](file:///c:/Users/longt/Desktop/video-streaming-site/video-streaming-site-ver2/public/zoom-meeting.html#L136)
* **React Logic**: [page.tsx](file:///c:/Users/longt/Desktop/video-streaming-site/video-streaming-site-ver2/src/app/meeting/page.tsx#L53)
* **Auth Config**: [auth.ts](file:///c:/Users/longt/Desktop/video-streaming-site/video-streaming-site-ver2/src/lib/auth.ts#L22)

## Answer to Query

**Is it from Google Auth or Whitelist?**
It is from **Google Auth**. The whitelist is used solely for *permission* (allowing the email to sign in), but the name displayed is the one provided by the Google Account.
