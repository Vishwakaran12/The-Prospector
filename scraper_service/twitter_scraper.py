# Twitter/X Scraper Example
# Requires: pip install tweepy
import tweepy

def scrape_twitter(query, limit=5):
    # TODO: Replace with your Twitter API credentials
    client = tweepy.Client(bearer_token='YOUR_BEARER_TOKEN')  # <-- Replace with your Twitter/X Bearer Token
    results = []
    tweets = client.search_recent_tweets(query=query, max_results=limit)
    for tweet in tweets.data or []:
        results.append({
            'title': tweet.text[:80],
            'description': tweet.text,
            'link': f'https://twitter.com/i/web/status/{tweet.id}',
            'source': 'Twitter/X'
        })
    return results

# Example usage:
if __name__ == '__main__':
    print(scrape_twitter('ttu'))

# INSTRUCTIONS: Get your Bearer Token at https://developer.twitter.com/en/portal/dashboard
