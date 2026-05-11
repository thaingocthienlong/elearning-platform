'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WatermarkSettingsPage() {
    // Video Player Watermark Settings
    const [opacity, setOpacity] = useState(0.5);
    const [sizeMultiplier, setSizeMultiplier] = useState(1.0);
    const [mobileSizeMultiplier, setMobileSizeMultiplier] = useState(0.7);
    const [fullscreenSizeMultiplier, setFullscreenSizeMultiplier] = useState(1.3);
    const [iosFullscreenSizeMultiplier, setIosFullscreenSizeMultiplier] = useState(0.8);

    // Zoom Meeting Watermark Settings
    const [zoomWatermarkColor, setZoomWatermarkColor] = useState('#FFFFFF');
    const [zoomWatermarkOpacity, setZoomWatermarkOpacity] = useState(0.2);
    const [zoomWatermarkSizePercent, setZoomWatermarkSizePercent] = useState(2.5);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch current settings
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/watermark-settings');
            if (response.ok) {
                const data = await response.json();
                // Video player settings
                setOpacity(data.opacity);
                setSizeMultiplier(data.sizeMultiplier);
                setMobileSizeMultiplier(data.mobileSizeMultiplier ?? 0.7);
                setFullscreenSizeMultiplier(data.fullscreenSizeMultiplier ?? 1.3);
                setIosFullscreenSizeMultiplier(data.iosFullscreenSizeMultiplier ?? 0.8);
                // Zoom settings
                setZoomWatermarkColor(data.zoomWatermarkColor ?? '#FFFFFF');
                setZoomWatermarkOpacity(data.zoomWatermarkOpacity ?? 0.2);
                setZoomWatermarkSizePercent(data.zoomWatermarkSizePercent ?? 2.5);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/admin/watermark-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opacity,
                    sizeMultiplier,
                    mobileSizeMultiplier,
                    fullscreenSizeMultiplier,
                    iosFullscreenSizeMultiplier,
                    zoomWatermarkColor,
                    zoomWatermarkOpacity,
                    zoomWatermarkSizePercent,
                }),
            });

            if (response.ok) {
                toast.success('Watermark settings updated successfully!');
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        // Video player defaults
        setOpacity(0.5);
        setSizeMultiplier(1.0);
        setMobileSizeMultiplier(0.7);
        setFullscreenSizeMultiplier(1.3);
        setIosFullscreenSizeMultiplier(0.8);
        // Zoom defaults
        setZoomWatermarkColor('#FFFFFF');
        setZoomWatermarkOpacity(0.2);
        setZoomWatermarkSizePercent(2.5);
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Watermark Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Customize the appearance of watermarks on videos and Zoom meetings
                </p>
            </div>

            {/* Video Player Watermark Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Video Player Watermark</CardTitle>
                    <CardDescription>
                        Adjust opacity and size of the watermark overlay on video player
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Opacity Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="opacity">Opacity</Label>
                            <span className="text-sm text-muted-foreground">
                                {Math.round(opacity * 100)}%
                            </span>
                        </div>
                        <input
                            id="opacity"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Lower opacity makes the watermark more transparent
                        </p>
                    </div>

                    {/* Size Multiplier Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="size">Size Multiplier (Desktop)</Label>
                            <span className="text-sm text-muted-foreground">
                                {sizeMultiplier.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            id="size"
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={sizeMultiplier}
                            onChange={(e) => setSizeMultiplier(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Adjust the relative size of the watermark text on desktop
                        </p>
                    </div>

                    {/* Mobile Size Multiplier Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="mobileSize">Size Multiplier (Mobile)</Label>
                            <span className="text-sm text-muted-foreground">
                                {mobileSizeMultiplier.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            id="mobileSize"
                            type="range"
                            min="0.3"
                            max="1.5"
                            step="0.1"
                            value={mobileSizeMultiplier}
                            onChange={(e) => setMobileSizeMultiplier(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Adjust the relative size of the watermark text on mobile devices (typically smaller)
                        </p>
                    </div>

                    {/* Fullscreen Size Multiplier Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="fullscreenSize">Size Multiplier (Fullscreen)</Label>
                            <span className="text-sm text-muted-foreground">
                                {fullscreenSizeMultiplier.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            id="fullscreenSize"
                            type="range"
                            min="0.5"
                            max="2.5"
                            step="0.1"
                            value={fullscreenSizeMultiplier}
                            onChange={(e) => setFullscreenSizeMultiplier(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Adjust the relative size when video is in fullscreen mode (typically larger)
                        </p>
                    </div>

                    {/* iOS Fullscreen Size Multiplier Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="iosFullscreenSize">Size Multiplier (iOS Fullscreen)</Label>
                            <span className="text-sm text-muted-foreground">
                                {iosFullscreenSizeMultiplier.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            id="iosFullscreenSize"
                            type="range"
                            min="0.3"
                            max="1.5"
                            step="0.1"
                            value={iosFullscreenSizeMultiplier}
                            onChange={(e) => setIosFullscreenSizeMultiplier(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Adjust the relative size when video is in fake fullscreen mode on iOS (typically smaller)
                        </p>
                    </div>

                    {/* Live Preview */}
                    <div className="border rounded-lg p-8 bg-gray-900 relative min-h-[200px] flex items-center justify-center">
                        <div className="text-sm text-gray-400 absolute top-2 left-2">
                            Live Preview
                        </div>
                        <div
                            style={{
                                color: 'white',
                                fontSize: `${16 * sizeMultiplier}px`,
                                fontWeight: '600',
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                                opacity: opacity,
                                padding: '8px 12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                            }}
                        >
                            Sample Watermark
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Zoom Meeting Watermark Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Zoom Meeting Watermark</CardTitle>
                    <CardDescription>
                        Customize the watermark displayed during Zoom meetings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Color Picker */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="zoomColor">Watermark Color</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground font-mono">
                                    {zoomWatermarkColor}
                                </span>
                                <div
                                    className="w-6 h-6 rounded border border-gray-300"
                                    style={{ backgroundColor: zoomWatermarkColor }}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <input
                                id="zoomColor"
                                type="color"
                                value={zoomWatermarkColor}
                                onChange={(e) => setZoomWatermarkColor(e.target.value.toUpperCase())}
                                className="w-12 h-10 rounded cursor-pointer border-0"
                            />
                            <input
                                type="text"
                                value={zoomWatermarkColor}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    if (/^#[0-9A-F]{0,6}$/.test(val)) {
                                        setZoomWatermarkColor(val);
                                    }
                                }}
                                placeholder="#FFFFFF"
                                className="flex-1 px-3 py-2 border rounded-md text-sm font-mono"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Choose the text color for the Zoom watermark (hex format)
                        </p>
                    </div>

                    {/* Zoom Opacity Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="zoomOpacity">Opacity</Label>
                            <span className="text-sm text-muted-foreground">
                                {Math.round(zoomWatermarkOpacity * 100)}%
                            </span>
                        </div>
                        <input
                            id="zoomOpacity"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={zoomWatermarkOpacity}
                            onChange={(e) => setZoomWatermarkOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Lower opacity makes the watermark less intrusive during meetings
                        </p>
                    </div>

                    {/* Zoom Size Percent Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="zoomSize">Size (% of Video Width)</Label>
                            <span className="text-sm text-muted-foreground">
                                {zoomWatermarkSizePercent.toFixed(1)}%
                            </span>
                        </div>
                        <input
                            id="zoomSize"
                            type="range"
                            min="1"
                            max="20"
                            step="0.5"
                            value={zoomWatermarkSizePercent}
                            onChange={(e) => setZoomWatermarkSizePercent(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                            Font size as percentage of video width (responsive sizing)
                        </p>
                    </div>

                    {/* Zoom Live Preview */}
                    <div className="border rounded-lg p-8 bg-gray-900 relative min-h-[200px] flex items-center justify-center overflow-hidden">
                        <div className="text-sm text-gray-400 absolute top-2 left-2">
                            Zoom Preview
                        </div>
                        {/* Simulated video frame */}
                        <div className="w-full max-w-md aspect-video bg-gray-800 rounded relative flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Video Feed</span>
                            {/* Watermark overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}
                            >
                                <div
                                    style={{
                                        color: zoomWatermarkColor,
                                        fontSize: `${zoomWatermarkSizePercent * 3}px`, // Scale for preview
                                        fontWeight: 'bold',
                                        opacity: zoomWatermarkOpacity,
                                        transform: 'rotate(-30deg)',
                                        textShadow: '0 0 5px rgba(0,0,0,0.5)',
                                        whiteSpace: 'nowrap',
                                        userSelect: 'none',
                                    }}
                                >
                                    User Name - Phone
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleReset} disabled={saving}>
                    Reset to Default
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>
        </div>
    );
}
