import { UrlMatchResult, UrlSegment } from '@angular/router';
import { isEqual } from 'lodash-es';
import { OperatorFunction } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

import { CategoryView } from 'ish-core/models/category-view/category-view.model';
import { CoreState } from 'ish-core/store/core-store';
import { selectRouteParam } from 'ish-core/store/router';

export function generateLocalizedCategorySlug(category: CategoryView) {
  if (!category || !category.categoryPath.length) {
    return '';
  }
  const lastCat = category.pathCategories()[category.categoryPath.length - 1].name;
  return lastCat ? lastCat.replace(/ /g, '-') : '';
}

const categoryRouteFormat = /^\/(?!category\/.*$)(.*-)?cat(.*)$/;

export function matchCategoryRoute(segments: UrlSegment[]): UrlMatchResult {
  // compatibility to old routes
  if (segments && segments.length === 2 && segments[0].path === 'category') {
    return { consumed: [] };
  }

  const url = '/' + segments.map(s => s.path).join('/');
  if (categoryRouteFormat.test(url)) {
    const match = categoryRouteFormat.exec(url);
    const posParams: { [id: string]: UrlSegment } = {};
    if (match[2]) {
      posParams.categoryUniqueId = new UrlSegment(match[2], {});
    }
    return {
      consumed: [],
      posParams,
    };
  }
  return;
}

export function generateCategoryUrl(category: CategoryView): string {
  if (!category) {
    return '/';
  }
  let route = '/';

  route += generateLocalizedCategorySlug(category);

  if (route !== '/') {
    route += '-';
  }

  route += `cat${category.uniqueId}`;

  return route;
}

export function ofCategoryRoute(): OperatorFunction<{}, { sku: string; categoryUniqueId: string }> {
  return source$ =>
    source$.pipe(
      map((state: CoreState) => ({
        sku: selectRouteParam('sku')(state),
        categoryUniqueId: selectRouteParam('categoryUniqueId')(state),
      })),
      distinctUntilChanged(isEqual),
      filter(({ sku, categoryUniqueId }) => categoryUniqueId && !sku)
    );
}
