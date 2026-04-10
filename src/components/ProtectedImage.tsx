"use client";

import Image, { type ImageProps } from "next/image";

export default function ProtectedImage(props: ImageProps) {
  const { className, ...rest } = props;
  return (
    <Image
      {...rest}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={`select-none ${className ?? ""}`.trim()}
    />
  );
}
