declare module 'vod-js-sdk-v6' {
  type UploadProgress = {
    percent?: number;
  };

  type UploadDoneResult = {
    fileId: string;
    video?: {
      url?: string;
    };
    cover?: {
      url?: string;
    };
  };

  type Uploader = {
    on(event: 'media_progress', callback: (info: UploadProgress) => void): void;
    done(): Promise<UploadDoneResult>;
  };

  class TcVod {
    constructor(options: {
      getSignature: () => Promise<string>;
      appId?: number;
    });

    upload(options: {
      mediaFile: File;
      mediaName?: string;
    }): Uploader;
  }

  export default TcVod;
}
