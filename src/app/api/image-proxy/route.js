import { NextResponse } from "next/server";

export async function GET(req) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "No url provided" }, { status: 400 });
  }

  const response = await fetch(url);
  if (!response.ok)
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 },
    );

  const blob = await response.arrayBuffer();

  return new NextResponse(blob, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
