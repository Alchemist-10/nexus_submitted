"use client";

import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  MouseEventHandler,
  UIEvent,
} from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
  isTopThree?: boolean;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  delay = 0,
  index,
  onMouseEnter,
  onClick,
  isTopThree = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={
        inView
          ? { scale: 1, opacity: 1, y: 0 }
          : { scale: 0.8, opacity: 0, y: 20 }
      }
      transition={{
        duration: 0.5,
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
      whileHover={{
        scale: isTopThree ? 1.03 : 1.02,
        y: -2,
        transition: { duration: 0.2 },
      }}
      // MODIFICATION: Reduced margin between items from mb-4 to mb-2
      className={`mb-2 cursor-pointer ${isTopThree ? "relative z-10" : ""}`}
    >
      {children}
    </motion.div>
  );
};

// ... (The rest of the component remains the same)

interface AnimatedListProps {
  items?: any[];
  onItemSelect?: (item: any, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  renderItem?: (
    item: any,
    index: number,
    isSelected: boolean,
    isTopThree: boolean
  ) => ReactNode;
}

const AnimatedList = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  renderItem,
}: AnimatedListProps): JSX.Element => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } =
      e.target as HTMLDivElement;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (
        itemBottom >
        containerScrollTop + containerHeight - extraMargin
      ) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  const getGlassEffect = (index: number) => {
    const isTopThree = index < 3;
    const rank = index + 1;

    if (!isTopThree) {
      return "bg-card/40 border-border/30 hover:bg-card/60";
    }

    switch (rank) {
      case 1:
        return `
          bg-gradient-to-br from-yellow-500/20 via-amber-400/15 to-yellow-600/20 
          border-2 border-yellow-400/40 
          shadow-2xl shadow-yellow-500/25 
          backdrop-blur-xl 
          hover:shadow-yellow-400/40 
          hover:border-yellow-300/60
          relative overflow-hidden
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-yellow-300/10 before:via-transparent before:to-yellow-300/10 before:animate-pulse
        `;
      case 2:
        return `
          bg-gradient-to-br from-gray-300/20 via-slate-200/15 to-gray-400/20 
          border-2 border-gray-300/40 
          shadow-2xl shadow-gray-400/25 
          backdrop-blur-xl 
          hover:shadow-gray-300/40 
          hover:border-gray-200/60
          relative overflow-hidden
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-gray-200/10 before:via-transparent before:to-gray-200/10 before:animate-pulse
        `;
      case 3:
        return `
          bg-gradient-to-br from-amber-600/20 via-orange-500/15 to-amber-700/20 
          border-2 border-amber-500/40 
          shadow-2xl shadow-amber-600/25 
          backdrop-blur-xl 
          hover:shadow-amber-500/40 
          hover:border-amber-400/60
          relative overflow-hidden
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-amber-400/10 before:via-transparent before:to-amber-400/10 before:animate-pulse
        `;
      default:
        return "bg-card/40 border-border/30 hover:bg-card/60";
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={listRef}
        className={`max-h-[600px] overflow-y-auto p-4 ${
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-background/20 [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:hover:bg-border/60"
            : "scrollbar-hide"
        }`}
        onScroll={handleScroll}
        style={{
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: "rgba(255,255,255,0.2) transparent",
        }}
      >
        {items.map((item, index) => {
          const isTopThree = index < 3;
          const isSelected = selectedIndex === index;

          return (
            <AnimatedItem
              key={index}
              delay={index * 0.05}
              index={index}
              isTopThree={isTopThree}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => {
                setSelectedIndex(index);
                if (onItemSelect) {
                  onItemSelect(item, index);
                }
              }}
            >
              <div
                className={`
                  // MODIFICATION: Reduced padding from p-6 to p-4
                  p-4 rounded-2xl border transition-all duration-300 
                  ${getGlassEffect(index)}
                  ${
                    isSelected
                      ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                      : ""
                  } 
                  ${itemClassName}
                `}
              >
                {renderItem ? (
                  renderItem(item, index, isSelected, isTopThree)
                ) : (
                  <div className="text-foreground">
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </div>
                )}
              </div>
            </AnimatedItem>
          );
        })}
      </div>

      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[50px] bg-gradient-to-b from-background to-transparent pointer-events-none transition-opacity duration-300 ease z-20"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-background to-transparent pointer-events-none transition-opacity duration-300 ease z-20"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  );
};

export default AnimatedList;