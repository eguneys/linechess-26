function formatTodayPastTime(pastTimestamp: number) {
    const now = new Date();
    const pastDate = new Date(pastTimestamp);
    const diffInSeconds = Math.floor((now.getTime() - pastDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
        return diffInSeconds === 1 ? '1 second ago' : `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
        // If it's more than 24 hours, show the actual time
        return pastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

export default function DailyTimeAgo(props: { time: number }) {
    return (<>{formatTodayPastTime(props.time)}</>)
}