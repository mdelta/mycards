/** Makes the screen easy to scan while a barcode is shown: maximum brightness, no screen timeout (F-03). */
export interface PresentationMode {
  enter(): Promise<void>;
  /** Restores the user's brightness and screen timeout. */
  exit(): Promise<void>;
}
