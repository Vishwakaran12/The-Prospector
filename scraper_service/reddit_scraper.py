# Reddit Scraper Example
# Requires: pip install praw
import praw

def scrape_reddit(query, limit=30):
    reddit = praw.Reddit(
        client_id='6WvFTgrgGLXjqOyXGRSlZQ',
        client_secret='jb3MA8zQxBllZIVPV6PtqkFrut-m-g',
        user_agent='wild-west-prospector'
    )
    results = []
    # Try multiple sort options for broader coverage
    for sort in ['relevance', 'new', 'hot', 'top']:
        for submission in reddit.subreddit('all').search(query, sort=sort, limit=limit):
            if not submission.stickied:
                results.append({
                    'title': submission.title,
                    'description': submission.selftext[:200] if submission.selftext else submission.title,
                    'link': f'https://reddit.com{submission.permalink}',
                    'source': 'Reddit'
                })
    # Deduplicate by title
    seen = set()
    deduped = []
    for r in results:
        if r['title'] not in seen:
            deduped.append(r)
            seen.add(r['title'])
    return deduped[:limit]

# Example usage:
if __name__ == '__main__':
    print(scrape_reddit('ttu'))

# INSTRUCTIONS: Get your keys at https://www.reddit.com/prefs/apps
