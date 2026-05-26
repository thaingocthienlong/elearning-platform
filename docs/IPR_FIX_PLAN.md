# IPRConsentOverlay Mobile Overflow Fix Plan

## Goal

Fix the issue where the "Agree" button in the IPR Consent Overlay is hidden/clipped on mobile devices because the content overflows the video frame area.

## User Review Required
>
> [!NOTE]
> This change primarily targets CSS styling to handle small viewports (specifically mobile landscape or small video players).

## Proposed Changes

### Component: `src/components/course/IPRConsentOverlay.tsx`

We will modify the overlay structure to ensure content doesn't get clipped when it exceeds the container height.

#### [MODIFY] [IPRConsentOverlay.tsx](file:///c:/Users/longt/Desktop/video-streaming-site/video-streaming-site-ver2/src/components/course/IPRConsentOverlay.tsx)

1. **Add Scroll Handling**:
    - Add `overflow-y-auto` to the main container to allow scrolling if content is too tall.
    - Ensure the scrollbar style is unobtrusive if possible (or accept default).

2. **Optimize Spacing for Mobile**:
    - Reduce padding: `p-6` -> `p-4` (keep `md:p-6` if needed).
    - Reduce margins:
        - Icon container: `mb-6` -> `mb-4`.
        - Title: `mb-4` -> `mb-2`.
        - Text: `mb-8` -> `mb-6`.
    - This allows more content to fit without scrolling, improving UX.

3. **Flexbox Adjustments**:
    - Ensure `justify-center` plays nicely with overflow. On some browsers, `flex-col justify-center` with `overflow` can clip the top. We might need a wrapper or `my-auto` approach if scroll is triggered.
    - *Strategy*: We will attempt to use a scrollable container with a "safe" centered layout.

## Verification Plan

### Automated Tests

- Does not apply heavily to visual layout overflow, but we will ensure the component still renders.

### Manual Verification

1. **Mobile Portrait**:
    - Open a video requiring IPR consent.
    - Verify the "Agree" button is visible or reachable via scroll.
2. **Mobile Landscape** (Critical):
    - Rotate device/simulator to landscape.
    - Verify the content fits or is scrollable.
3. **Desktop**:
    - Ensure the layout remains centered and aesthetically pleasing on large screens.

## Refinement: Smaller Text and Button (User Request)

### [MODIFY] [IPRConsentOverlay.tsx](file:///c:/Users/longt/Desktop/video-streaming-site/video-streaming-site-ver2/src/components/course/IPRConsentOverlay.tsx)

1. **Reduce Sizes**:
    - **Icon**: `h-12 w-12` -> `h-10 w-10`, container `p-4` -> `p-3`.
    - **Title**: `text-xl` -> `text-lg`.
    - **Text**: `text-gray-400` (base) -> `text-sm text-gray-400`.
    - **Button**: `size="lg"` -> `size="default"`.
    - **Spacing**: Further reduce margins if needed for compactness.
