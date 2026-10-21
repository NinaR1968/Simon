import { BASE, manifest } from './manifest';

// Files actually present in public/, resolved by Vite at test time
const publicFiles = Object.keys(import.meta.glob('../../public/*')).map((path) => path.split('/').pop());

describe('web app manifest', () => {
  it('uses the English install name, a fixed id and Hebrew RTL', () => {
    expect(manifest.name).toBe('Simon');
    expect(manifest.short_name).toBe('Simon');
    expect(manifest.id).toBe('/Simon/app');
    expect(manifest.lang).toBe('he');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.display).toBe('standalone');
  });

  it('starts and is scoped under the GitHub Pages project path', () => {
    expect(BASE).toBe('/Simon/');
    expect(manifest.start_url).toBe(BASE);
    expect(manifest.scope).toBe(BASE);
  });

  it('has 192, 512 and maskable icons that exist in public/', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((icon) => 'purpose' in icon && icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      expect(publicFiles).toContain(icon.src);
    }
  });
});
