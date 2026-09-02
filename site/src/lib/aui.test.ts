import { describe, it, expect } from 'vitest';
import { validateAui, AUI_LOCKED_KEYS } from './aui';

describe('AUI validate', () => {
  it('acepta spec valida whitelisteada', () => {
    const spec = {
      version: 1 as const,
      components: [
        { id: 'c1', type: 'Card' as const, props: { variant: 'surface' } },
        { id: 'b1', type: 'Button' as const, props: { variant: 'primary', label: 'ok' } },
        { id: 'bd1', type: 'Badge' as const, props: { variant: 'success', label: 'x' } },
      ],
    };
    expect(() => validateAui(spec)).not.toThrow();
    expect(validateAui(spec).components).toHaveLength(3);
  });

  it('rechaza component no whitelisteado', () => {
    const spec: any = { version: 1, components: [{ id: 'x', type: 'EvilWidget', props: {} }] };
    expect(() => validateAui(spec)).toThrow(/not whitelisted/);
  });

  it('rechaza lockedKeys', () => {
    const spec: any = {
      version: 1,
      components: [],
      lockedKeys: [AUI_LOCKED_KEYS[0]],
    };
    expect(() => validateAui(spec)).toThrow(/lockedKeys/);
  });

  it('rechaza sin id o sin props', () => {
    const noId: any = { version: 1, components: [{ type: 'Card', props: {} }] };
    expect(() => validateAui(noId)).toThrow(/missing id/);
    const noProps: any = { version: 1, components: [{ id: 'c1', type: 'Card' }] };
    expect(() => validateAui(noProps)).toThrow(/props must be object/);
  });

  it('rechaza version invalida', () => {
    const bad: any = { version: 2, components: [] };
    expect(() => validateAui(bad)).toThrow(/invalid version/);
  });

  it('acepta theme/copy opcionales sin romper whitelist', () => {
    const spec: any = {
      version: 1,
      theme: { accent: '#ff0' },
      copy: { title: 'hola' },
      components: [{ id: 's1', type: 'Skeleton', props: {} }],
    };
    expect(() => validateAui(spec)).not.toThrow();
  });
});
