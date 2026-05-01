exports.handler = async () => {
    const CHANNEL_ID = 'UCAV2W1qUuql7qM_Hqg3eMww';
    const API_KEY = process.env.YOUTUBE_API_KEY;

    try {
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`
        );
        const data = await res.json();

        const liveVideo = data.items?.[0];

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isLive: !!liveVideo,
                videoId: liveVideo?.id?.videoId || null,
            }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ isLive: false, videoId: null }),
        };
    }
};