import { createRequiredContext } from "@enymo/react-better-context";
import { type DependencyList, useCallback, useEffect, useRef } from "react";
import { type GestureResponderEvent, type NativeScrollEvent, type NativeSyntheticEvent, Platform, View, type ViewProps } from "react-native";

const [Provider, useContext] = createRequiredContext<(listener: (e: GestureResponderEvent) => void) => void>("PressOutsideProivder must be present in component tree");

export function usePressOutside(handler: (e: GestureResponderEvent) => void, deps: DependencyList = []) {
    const ref = useRef<(View | null)[]>([]);
    const offset = useRef({
        x: 0,
        y: 0
    });

    const subscribe = useContext();

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        offset.current = e.nativeEvent.contentOffset
    }, [offset]);

    const handleSetRef = (index: number) => (node: View | null) => {
        ref.current[index] = node;
    }

    useEffect(() => subscribe(async e => {
        const results = await Promise.all(
            ref.current
                .filter(target => target !== null)
                .map(target => new Promise<boolean>(resolve => {
                    target.measure((x, y, width, height, pageX, pageY) => {
                        const offsetX = pageX + offset.current.x;
                        const offsetY = pageY + offset.current.y;
                        resolve(
                            e.nativeEvent.pageX < offsetX
                            || e.nativeEvent.pageX > offsetX + width
                            || e.nativeEvent.pageY < offsetY
                            || e.nativeEvent.pageY > offsetY + height
                        );
                    });
                }))
        );
        if (results.every(result => result === true)) {
            handler(e);
        }
    }), [ref, offset, subscribe, ...deps]);

    return [handleSetRef, handleScroll] as const;
}

export function PressOutsideProvider({onTouchEnd, ...props}: ViewProps) {
    const listeners = useRef(new Set<(e: GestureResponderEvent) => void>());

    const subscribe = useCallback((listener: (e: GestureResponderEvent) => void) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
    }, [listeners]);

    const handleTouch = useCallback((e: GestureResponderEvent) => {
        for (const listener of listeners.current) {
            listener(e);
        }
        onTouchEnd?.(e);
    }, [listeners, onTouchEnd]);

    return (
        <Provider value={subscribe}>
            <View {...props} {...{[Platform.OS === "web" ? "onClick" : "onTouchEnd"]: handleTouch}} />
        </Provider>
    )
}