// Quick test to verify admin panels are working
const panels = ['users', 'courses', 'videos', 'enrollments', 'tickets'];

async function testAdminPanels() {
    console.log('Testing Admin Dashboard Panels...\n');

    for (const panel of panels) {
        try {
            const response = await fetch(`http://localhost:3000/admin/${panel}`, {
                headers: {
                    // Note: This won't work without actual session cookie
                    // But we can at least check if the endpoint responds
                },
            });

            console.log(`✓ /admin/${panel}: ${response.status} ${response.statusText}`);

            // Check for specific error patterns
            const text = await response.text();
            if (text.includes('Functions cannot be passed directly to Client Components')) {
                console.error(`  ❌ ERROR: Server action error still present!`);
            } else if (text.includes('Sign in')) {
                console.log(`  → Redirects to sign-in (expected without session)`);
            } else if (response.status === 200) {
                console.log(`  → Page loaded successfully`);
            }
        } catch (error) {
            console.error(`✗ /admin/${panel}: ${error.message}`);
        }
    }

    console.log('\nTest complete!');
}

testAdminPanels().catch(console.error);
