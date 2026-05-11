declare module 'shaka-player/dist/shaka-player.ui.js' {
    export = shaka;
}

declare namespace shaka {
    namespace extern {
        interface Manifest {
            // Add properties as needed
        }

        interface PlayerConfiguration {
            drm?: {
                servers?: { [key: string]: string };
                clearKeys?: { [key: string]: string };
                advanced?: { [key: string]: any };
            };
            streaming?: {
                bufferingGoal?: number;
                rebufferingGoal?: number;
                bufferBehind?: number;
                retryParameters?: any;
            };
            [key: string]: any; // Allow other config properties
        }
    }

    namespace net {
        class NetworkingEngine {
            static RequestType: {
                MANIFEST: number;
                SEGMENT: number;
                LICENSE: number;
                APP: number;
                TIMING: number;
            };
            registerRequestFilter(filter: (type: number, request: any) => void): void;
            registerResponseFilter(filter: (type: number, response: any) => void): void;
        }
    }

    class Player {
        constructor(video?: HTMLVideoElement);
        attach(video: HTMLVideoElement): Promise<void>;
        load(url: string): Promise<void>;
        configure(config: string | extern.PlayerConfiguration | any): boolean;
        destroy(): Promise<void>;
        getNetworkingEngine(): net.NetworkingEngine | null;
        getMediaElement(): HTMLVideoElement | null;
        isValid(): boolean;
        isLive(): boolean;
        isAudioOnly(): boolean;
        getStats(): any;
        getError(): any;
        // Add other methods as needed
        static isBrowserSupported(): boolean;
    }

    namespace polyfill {
        function installAll(): void;
    }

    namespace ui {
        class Overlay {
            constructor(player: Player, videoContainer: HTMLElement, video: HTMLVideoElement);
            configure(config: any): void;
            getControls(): Controls;
            destroy(): Promise<void>;
        }

        class Controls {
            getPlayer(): Player;
            getLocalization(): any;
            // Add other methods as needed
        }
    }
}
