import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "danger";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className = "", variant = "default", ...props }, ref) {
    return (
      <button
        className={`ui-button ui-button-${variant} ${className}`.trim()}
        ref={ref}
        {...props}
      />
    );
  },
);
