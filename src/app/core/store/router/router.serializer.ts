import { Data, Params, RouterStateSnapshot } from '@angular/router';
import { RouterStateSerializer } from '@ngrx/router-store';

export interface CustomRouterState {
  url: string;
  params: Params;
  queryParams: Params;
  data: Data;
}

export class CustomRouterSerializer implements RouterStateSerializer<CustomRouterState> {
  serialize(routerState: RouterStateSnapshot): CustomRouterState {
    let route = routerState.root;

    let data = route.data;
    let params = route.params;
    while (route.firstChild) {
      route = route.firstChild;
      data = { ...data, ...route.data };
      params = { ...params, ...route.params };
    }

    const {
      url,
      root: { queryParams },
    } = routerState;

    return { url, params, queryParams, data };
  }
}
