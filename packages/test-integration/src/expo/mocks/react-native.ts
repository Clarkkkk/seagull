export const Platform = { OS: "web", select: (obj: any) => obj?.web ?? obj?.default };
export const NativeModules = {};
export const Linking = { openURL: async () => undefined };

export default {};

