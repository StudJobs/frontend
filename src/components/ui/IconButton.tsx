import { HTMLAttributes } from "react";
import clsx from "clsx";

type Props = HTMLAttributes<HTMLButtonElement> & {
  imgSrc: string;
  alt: string;
  counter?: number;
};

export default function IconButton({ imgSrc, alt, counter, className, ...rest }: Props) {
  return (
    <button
      className={clsx(
        "relative h-10 w-10 flex items-center justify-center bg-black/70 hover:bg-black/80 transition-colors rounded",
        className
      )}
      {...rest}
    >
      {typeof counter === "number" && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] leading-4 rounded-full bg-primary text-white text-center">
          {counter}
        </span>
      )}
      <img src={`/src/assets/images/${imgSrc}`} alt={alt} className="w-5 h-5 object-contain" />
    </button>
  );
}
