"use client";

import type {
  ButtonHTMLAttributes,
  FocusEvent,
  MouseEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "./button";

interface TooltipPosition {
  x: number;
  y: number;
}

interface IconTooltipButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tooltip: string;
  variant?: "default" | "outline" | "danger";
}

export function IconTooltipButton({
  children,
  className = "",
  disabled = false,
  onBlur,
  onClick,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  tooltip,
  variant = "outline",
  ...props
}: IconTooltipButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);

  const updateTooltipPosition = useCallback(() => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const bounds = button.getBoundingClientRect();

    setTooltipPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top,
    });
  }, []);

  const showTooltip = useCallback(() => {
    if (disabled) {
      return;
    }

    updateTooltipPosition();
    setIsTooltipVisible(true);
  }, [disabled, updateTooltipPosition]);

  const hideTooltip = useCallback(() => {
    setIsTooltipVisible(false);
  }, []);

  useEffect(() => {
    if (!isTooltipVisible) {
      return undefined;
    }

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);

    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  const handleMouseEnter = (event: MouseEvent<HTMLButtonElement>) => {
    onMouseEnter?.(event);
    showTooltip();
  };

  const handleMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(event);
    hideTooltip();
  };

  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event);
    showTooltip();
  };

  const handleBlur = (event: FocusEvent<HTMLButtonElement>) => {
    onBlur?.(event);
    hideTooltip();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    hideTooltip();
    onClick?.(event);
  };

  return (
    <>
      <Button
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        className={className}
        disabled={disabled}
        onBlur={handleBlur}
        onClick={handleClick}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={buttonRef}
        variant={variant}
        {...props}
      >
        {children}
      </Button>
      {isTooltipVisible && tooltipPosition && typeof document !== "undefined"
        ? createPortal(
            <span
              className="icon-tooltip-button-tooltip"
              id={tooltipId}
              role="tooltip"
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              }}
            >
              {tooltip}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
