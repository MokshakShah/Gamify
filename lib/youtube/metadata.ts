export type YoutubeMetadata = {
  title: string;
  channelName: string;
};

export async function fetchYoutubeMetadata(
  watchUrl: string
): Promise<YoutubeMetadata> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const res = await fetch(endpoint, { next: { revalidate: 3600 } });
  if (!res.ok) {
    return { title: 'YouTube video', channelName: 'Unknown channel' };
  }
  const data = (await res.json()) as { title?: string; author_name?: string };
  return {
    title: data.title?.trim() || 'YouTube video',
    channelName: data.author_name?.trim() || 'Unknown channel',
  };
}
