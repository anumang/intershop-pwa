import { MonoTypeOperatorFunction } from 'rxjs';
import { filter } from 'rxjs/operators';

import { selectUrl } from './router.selectors';

export function ofUrl<T>(url: RegExp): MonoTypeOperatorFunction<T> {
  return source$ => source$.pipe(filter(state => url.test(selectUrl(state))));
}
