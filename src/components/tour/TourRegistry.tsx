export const tourSteps = [
    {
        tour: "onboarding",
        steps: [
            {
                icon: "👋",
                title: "Welcome Back",
                content: "Click here to see your enrolled courses.",
                selector: '[data-tour="my-courses"]',
                side: "bottom",
                showControls: true,
                pointerPadding: 10,
                pointerRadius: 10,
            },
            {
                icon: "📚",
                title: "Select a Course",
                content: "Click 'View Course' to start learning.",
                selector: '[data-tour="view-course-btn"]',
                side: "bottom",
                showControls: true,
                pointerPadding: 10,
                pointerRadius: 10,
            },
        ],
    },
] as any;
