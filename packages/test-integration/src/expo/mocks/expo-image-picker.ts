export type ImagePickerAsset = {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
};

export type ImagePickerResult =
  | { canceled: true; assets: [] }
  | { canceled: false; assets: ImagePickerAsset[] };

let permissionsGranted = true;
let nextResult: ImagePickerResult = { canceled: true, assets: [] };

export function __setPermissionsGranted(granted: boolean) {
  permissionsGranted = granted;
}

export function __setNextLaunchResult(result: ImagePickerResult) {
  nextResult = result;
}

export const MediaTypeOptions = {
  Images: "Images",
} as const;

export async function requestMediaLibraryPermissionsAsync() {
  return { granted: permissionsGranted };
}

export async function launchImageLibraryAsync() {
  return nextResult;
}

