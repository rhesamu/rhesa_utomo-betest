import { BcryptHasher } from '../../src/infra/hash/BcryptHasher';

const hasher = new BcryptHasher(4);

describe('BcryptHasher', () => {
  it('never returns the plaintext', async () => {
    const hash = await hasher.hash('supersecret1');
    expect(hash).not.toBe('supersecret1');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('accepts the correct password', async () => {
    const hash = await hasher.hash('supersecret1');
    await expect(hasher.compare('supersecret1', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hasher.hash('supersecret1');
    await expect(hasher.compare('wrong', hash)).resolves.toBe(false);
  });

  it('salts: the same input hashes differently every time', async () => {
    const [a, b] = await Promise.all([hasher.hash('same'), hasher.hash('same')]);
    expect(a).not.toBe(b);
    await expect(hasher.compare('same', a)).resolves.toBe(true);
    await expect(hasher.compare('same', b)).resolves.toBe(true);
  });
});
