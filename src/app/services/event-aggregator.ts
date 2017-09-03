import { Injectable } from '@angular/core';

@Injectable()
export class EventAggregator  {

    private _subscriptions: Map<string, Array<Function>> = new Map<string, Array<Function>>();
    /**
     * @param  {string} event
     * @param  {Function} callback
     */
    registerEvent(event: string, callback: Function) {
        const subscribers = this._subscriptions.get(event) || [];
        subscribers.push(callback);
        this._subscriptions.set(event, subscribers);
    }

    /**
     * @param  {string} event
     * @param  {any} data
     */
    fireEvent(event: string, data: any) {
        const subscribers = this._subscriptions.get(event) || [];
        subscribers.forEach((callback) => {
            callback.call(null, data);
        });
    }
}
