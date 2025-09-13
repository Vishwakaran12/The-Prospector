# YouTube Scraper Example
# Requires: pip install google-api-python-client
from googleapiclient.discovery import build

def scrape_youtube(query, limit=5):
    # TODO: Replace with your YouTube API key
    youtube = build('youtube', 'v3', developerKey='YOUR_API_KEY')  # <-- Replace with your YouTube API Key
    search_response = youtube.search().list(q=query, part='snippet', maxResults=limit).execute()
    results = []
    for item in search_response.get('items', []):
        results.append({
            'title': item['snippet']['title'],
            'description': item['snippet']['description'],
            'link': f'https://youtube.com/watch?v={item["id"]["videoId"]}',
            'source': 'YouTube'
        })
    return results

# Example usage:
if __name__ == '__main__':
    print(scrape_youtube('ttu'))

# INSTRUCTIONS: Get your API key at https://console.cloud.google.com/apis/library/youtube.googleapis.com
