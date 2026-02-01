export function useFocusEffect(cb: () => void | (() => void)) {
  // In jsdom tests we don't have a real navigation container.
  // Run the focus effect immediately.
  cb();
}

