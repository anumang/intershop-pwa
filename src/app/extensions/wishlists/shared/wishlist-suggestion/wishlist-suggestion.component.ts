import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { SwiperConfigInterface } from 'ngx-swiper-wrapper';
import { Observable } from 'rxjs';

import { LARGE_BREAKPOINT_WIDTH } from 'ish-core/configurations/injection-keys';

import { WishlistsFacade } from '../../facades/wishlists.facade';

/**
 * The Wishlist Suggestion Component displays all unique items from all wish lists.
 *
 * @example
 * <ish-wishlist-suggestion></ish-wishlist-suggestion>
 */
@Component({
  selector: 'ish-wishlist-suggestion',
  templateUrl: './wishlist-suggestion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistSuggestionComponent implements OnInit {
  itemSkuFromAllWishlists$: Observable<string[]>;
  itemsPerSlide = 4;
  /**
   * configuration of swiper carousel
   * find possible parameters here: http://idangero.us/swiper/api/#parameters
   */
  swiperConfig: SwiperConfigInterface;

  constructor(private wishlistsFacade: WishlistsFacade, @Inject(LARGE_BREAKPOINT_WIDTH) largeBreakpointWidth: number) {
    this.swiperConfig = {
      breakpoints: {
        [largeBreakpointWidth]: {
          slidesPerView: 2,
          slidesPerGroup: 2,
        },
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        clickableClass: 'swiper-pagination-clickable',
      },
      slidesPerView: 4,
      slidesPerGroup: 4,
    };
  }

  ngOnInit() {
    this.itemSkuFromAllWishlists$ = this.wishlistsFacade.itemSkuFromAllWishlists$;
  }
}
