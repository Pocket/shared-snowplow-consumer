import { processor } from './index';

describe('integration test', () => {
  it('should return true', async () => {
    expect(await processor('bla')).toBeTruthy();
  });
});
