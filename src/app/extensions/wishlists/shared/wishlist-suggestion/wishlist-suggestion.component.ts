import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { SwiperConfigInterface } from 'ngx-swiper-wrapper';
import { Observable } from 'rxjs';

import { LARGE_BREAKPOINT_WIDTH } from 'ish-core/configurations/injection-keys';
import { ProductRowComponentConfiguration } from 'ish-shared/components/product/product-row/product-row.component';
import { ProductTileComponentConfiguration } from 'ish-shared/components/product/product-tile/product-tile.component';

import { WishlistsFacade } from '../../facades/wishlists.facade';

declare type ProductItemContainerConfiguration = ProductTileComponentConfiguration &
  ProductRowComponentConfiguration & { displayType: 'tile' | 'row' };

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

  tileConfiguration: ProductItemContainerConfiguration;

  constructor(private wishlistsFacade: WishlistsFacade, @Inject(LARGE_BREAKPOINT_WIDTH) largeBreakpointWidth: number) {
    this.tileConfiguration = {
      readOnly: false,
      allowZeroQuantity: false,
      quantityLabel: ' ',
      displayName: true,
      displayDescription: true,
      displaySKU: true,
      displayInventory: true,
      displayQuantity: true,
      displayPrice: true,
      displayPromotions: true,
      displayVariations: true,
      displayShipment: false,
      displayAddToBasket: true,
      displayAddToWishlist: false,
      displayAddToCompare: false,
      displayAddToQuote: false,
      displayType: 'tile',
    };

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
