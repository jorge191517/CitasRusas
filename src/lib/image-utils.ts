export function getOptimizedSupabaseImageUrl(
  url: string | null | undefined,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return "";

  if (url.includes("/storage/v1/object/public/")) {
    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.pathname.includes("/render/image/public/")) {
        if (width) parsedUrl.searchParams.set("width", width.toString());
        if (height) parsedUrl.searchParams.set("height", height.toString());
        parsedUrl.searchParams.set("quality", quality.toString());
        return parsedUrl.toString();
      }

      if (parsedUrl.pathname.includes("/object/public/")) {
        parsedUrl.pathname = parsedUrl.pathname.replace("/object/public/", "/render/image/public/");
        if (width) parsedUrl.searchParams.set("width", width.toString());
        if (height) parsedUrl.searchParams.set("height", height.toString());
        parsedUrl.searchParams.set("quality", quality.toString());
        parsedUrl.searchParams.set("resize", "cover");
        return parsedUrl.toString();
      }
    } catch (e) {
      return url;
    }
  }

  return url;
}
