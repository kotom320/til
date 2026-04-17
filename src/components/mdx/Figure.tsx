import Image from "next/image";

/**
 * 캡션이 있는 이미지. 일반 `![alt](src)` 보다 더 풍부한 맥락을 전달할 때 사용.
 */
export default function Figure({
  src,
  alt,
  caption,
  width = 800,
  height = 500,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="my-6">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="rounded-lg border"
        style={{
          width: "100%",
          height: "auto",
          borderColor: "var(--border-subtle)",
        }}
      />
      {caption && (
        <figcaption
          className="mt-2 text-sm text-center"
          style={{ color: "var(--text-subtle)" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
