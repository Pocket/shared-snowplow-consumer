import { processor } from './index';

describe('spec test', () => {
  it('should return true', async () => {
    expect(await processor('bla')).toBeTruthy();
  });
});
