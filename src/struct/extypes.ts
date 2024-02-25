
// https://www.npmjs.com/package/swiped-events
export type SwipedEventDirection = "up" | "down" | "left" | "right";
export type SwipedEventTouchType = "stylus" | "direct";
export type SwipedEventDetail = {
    dir: SwipedEventDirection,
    touchType: SwipedEventTouchType,
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number,
    fingers: number
};
export type SwipedEvent = Event & { detail: SwipedEventDetail };
