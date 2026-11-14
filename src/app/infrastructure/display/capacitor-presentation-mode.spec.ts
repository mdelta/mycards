import { CapacitorPresentationMode } from './capacitor-presentation-mode';

describe('CapacitorPresentationMode', () => {
  const brightness = { setBrightness: vi.fn(async () => undefined) };
  const keepAwake = { keepAwake: vi.fn(async () => undefined), allowSleep: vi.fn(async () => undefined) };
  const mode = new CapacitorPresentationMode(brightness, keepAwake);

  beforeEach(() => vi.clearAllMocks());

  it('sets full brightness and keeps the screen on', async () => {
    await mode.enter();

    expect(brightness.setBrightness).toHaveBeenCalledWith({ brightness: 1 });
    expect(keepAwake.keepAwake).toHaveBeenCalled();
  });

  it('restores the user brightness and allows sleep', async () => {
    await mode.exit();

    expect(brightness.setBrightness).toHaveBeenCalledWith({ brightness: -1 });
    expect(keepAwake.allowSleep).toHaveBeenCalled();
  });

  it('ignores plugin failures', async () => {
    brightness.setBrightness.mockRejectedValueOnce(new Error('not implemented on web'));
    keepAwake.allowSleep.mockRejectedValueOnce(new Error('unsupported'));

    await expect(mode.enter()).resolves.toBeUndefined();
    await expect(mode.exit()).resolves.toBeUndefined();
    expect(keepAwake.keepAwake).toHaveBeenCalled();
  });
});
