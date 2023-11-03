/* eslint-disable no-console */
import { substitute } from '../src/lib/utils';

const TIMEOUT_MILLIS = 100_000;

describe('Test utils', () => {
  test('substitute()', async () => {
    const meta = {
      aaa: 'bbb',
      bbb: 'asasd %{address}:%{port}, asdadasd %{address}, dasdad %{foo} asdasd',
    };
    const data = {
      address: 'my.com',
      port: 3456,
    };
    const expected = {
      aaa: 'bbb',
      bbb: 'asasd my.com:3456, asdadasd my.com, dasdad  asdasd',
    };
    substitute(meta, data);
    expect(meta).toMatchObject(expected);
  }, TIMEOUT_MILLIS);
});
