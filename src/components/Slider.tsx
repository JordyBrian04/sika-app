import { useRef, useState } from "react";
import { Animated, FlatList, View } from "react-native";
import { Pagination } from "./Pagination";
import { SliderItem } from "./SliderItem";

export function Slider({ data }: any) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const ref = useRef<FlatList>(null);

  const handleOnScroll = (event: any) => {
    Animated.event(
      [
        {
          nativeEvent: {
            contentOffset: {
              x: scrollX,
            },
          },
        },
      ],
      {
        useNativeDriver: false,
      },
    )(event);
  };

  const handleOnViewableItemsChanged = useRef(({ viewableItems }: any) => {
    // console.log(viewableItems)
    setCurrentIndex(viewableItems[0].index);
  }).current;

  return (
    <View>
      <FlatList
        ref={ref}
        data={data}
        renderItem={({ item, index: activeIndex }) => (
          <SliderItem item={item} isActive={activeIndex === currentIndex} />
        )}
        horizontal
        pagingEnabled
        snapToAlignment="center"
        showsHorizontalScrollIndicator={false}
        onScroll={handleOnScroll}
        onViewableItemsChanged={handleOnViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />
      <Pagination datas={data} scrollX={scrollX} idx={currentIndex} />
    </View>
  );
}
